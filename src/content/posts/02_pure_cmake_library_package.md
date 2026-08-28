---
title: "CMake로 Pure C++ Library 만들기"
date: "2026-08-25"
category: "CMake"
tags: ["CMake", "Build", "Cpp"]
summary: "Pure C++ 코드를 CMake Library Target으로 만들고, Build와 Install을 거쳐 다른 CMake 프로젝트에서 재사용하는 과정"
---

## 1. 왜 Library를 따로 만들까?

C++ 프로젝트를 만들다 보면 하나의 프로그램 안에 모든 코드를 넣는 방식보다 기능을 Library로 분리하는 것이 유리한 경우가 있다.

이번에는 ROS 2나 Qt를 사용하지 않고 Pure C++와 CMake만으로 알고리즘 Library를 만들어 본다.

목표는 단순히 `.a` 파일 하나를 만드는 것이 아니다.

```text
Source
↓
CMake Target
↓
Build
↓
Install
↓
Package
↓
find_package()
↓
Application
```

최종적으로 다른 CMake 프로젝트에서 알고리즘 Library를 재사용할 수 있는 구조까지 만들어 본다.

## 2. 프로젝트 구조

이번 실습에서는 `pkg_algorithm`을 독립적인 CMake 프로젝트로 구성했다.

```text
[project]/
├── src/
│   └── pkg_algorithm/
│       ├── CMakeLists.txt
│       ├── include/
│       │   └── pkg_algorithm/
│       │       └── fast.h
│       └── src/
│           └── fast.cpp
├── build/
│   └── pkg_algorithm/
└── install/
    └── pkg_algorithm/
```

Library의 공개 Header는 `include/`에 두고 실제 구현은 `src/`에 둔다.

## 3. CMake로 Library Target 만들기

`CMakeLists.txt`에서는 먼저 프로젝트와 C++ 표준을 설정한다.

```cmake
cmake_minimum_required(VERSION 3.16)

project(pkg_algorithm)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(${PROJECT_NAME}
    src/fast.cpp
)

target_include_directories(${PROJECT_NAME}
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)
```

여기서 중요한 것은 `add_library()`가 단순히 `.a` 파일을 생성하는 명령이라는 점이 아니다.

CMake 내부에 `pkg_algorithm`이라는 **Library Target**을 만든다.

그리고 `target_include_directories()`를 통해 이 Target이 사용하는 Include 경로를 정의한다.

## 4. Source와 Build Directory를 분리하기

처음에는 다음과 같이 Source Directory 안에서 Build를 수행했다.

```bash
cd src/pkg_algorithm
cmake -S . -B build
```

그러면 다음과 같이 Source Directory 안에 Build Directory가 생긴다.

```text
src/pkg_algorithm/
└── build/
```

이후에는 Workspace의 `build/` 아래에 각 프로젝트의 Build Directory를 따로 두는 방식으로 변경했다.

```bash
cmake -S src/pkg_algorithm -B build/pkg_algorithm
```

그리고 Build한다.

```bash
cmake --build build/pkg_algorithm
```

이렇게 하면 Source와 Build 결과가 분리된다.

```text
[project]/
├── src/
│   └── pkg_algorithm/
└── build/
    └── pkg_algorithm/
```

`-S`는 Source Directory를 지정하고, `-B`는 Build Directory를 지정한다.

이 방식을 Out-of-source Build라고 볼 수 있다.

## 5. 실제로 만들어진 Library

Build가 완료되면 Static Library가 만들어진다.

```text
libpkg_algorithm.a
```

Static Library는 여러 Object File을 하나의 Library 형태로 묶어 관리하는 방식이다.

하지만 여기서 중요한 것은 `.a` 파일 자체보다 CMake가 관리하는 Target이다.

```text
pkg_algorithm
```

이 Target을 중심으로 Include Directory와 이후 Dependency 정보를 관리할 수 있다.

## 6. Library를 Install하기

Build가 끝났다고 다른 프로젝트에서 바로 Package처럼 사용할 수 있는 것은 아니다.

그래서 Install 단계가 필요하다.

실제 실습에서는 다음 명령을 사용했다.

```bash
cmake --install build/pkg_algorithm     --prefix /home/[user]/[project]/install/pkg_algorithm
```

Install 후에는 Library와 Header뿐 아니라 다른 CMake 프로젝트가 Package를 찾을 수 있도록 필요한 CMake 정보도 함께 관리할 수 있다.

구조를 개념적으로 보면 다음과 같다.

```text
build
 ↓
install
 ↓
library
header
CMake package information
```

## 7. 다른 CMake 프로젝트에서 사용하기

Library를 다른 프로젝트에서 찾을 수 있는지 확인하기 위해 `test_find_package` 프로젝트도 별도로 테스트했다.

```bash
cmake     -S test_find_package     -B build/test_find_package     -DCMAKE_PREFIX_PATH=/home/[user]/[project]/install/pkg_algorithm
```

여기서 `CMAKE_PREFIX_PATH`는 CMake가 설치된 Package를 찾을 위치를 알려주는 역할을 한다.

이제 다른 프로젝트에서는 다음과 같은 방식으로 Package를 사용할 수 있다.

```cmake
find_package(pkg_algorithm REQUIRED)
```

그리고 Library 파일의 직접 경로를 지정하는 대신 Target을 사용한다.

```cmake
target_link_libraries(${PROJECT_NAME}
    PRIVATE
        pkg_algorithm::pkg_algorithm
)
```

## 8. Application에서 Library 사용하기

`pkg_app`은 최종 Application 역할을 한다.

Pure CMake 단계에서는 다음과 같은 구조를 사용한다.

```text
pkg_algorithm
      ↓
   pkg_app
```

Application에서는 Algorithm Library의 구현 파일을 직접 포함하는 것이 아니라 설치된 Package를 찾아서 사용한다.

```cmake
find_package(pkg_algorithm REQUIRED)

add_executable(${PROJECT_NAME}
    src/main.cpp
)

target_link_libraries(${PROJECT_NAME}
    PRIVATE
        pkg_algorithm::pkg_algorithm
)
```

이 구조를 통해 Library와 Application을 분리할 수 있다.

## 9. 이번 실습에서 이해한 것

이번 단계에서 중요한 것은 CMake 명령어를 외우는 것이 아니었다.

```text
Source
↓
Target
↓
Build
↓
Install
↓
Package
↓
find_package()
↓
Imported Target
↓
Application
```

`add_library()`로 Library Target을 만들고, Build한 결과를 Install한 뒤, 다른 프로젝트에서 Package로 찾아 Target을 사용하는 흐름을 직접 확인했다.

특히 Application이 특정 Build Directory의 `.a` 파일을 직접 가리키지 않고 CMake Target을 사용한다는 점이 중요하다.

다음 단계에서는 이 Pure CMake Library 구조 위에 Qt5를 추가한다.
