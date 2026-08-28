---
title: "CMake란 무엇인가?"
date: "2026-08-24"
category: [CMake, CPP]
summary: "Compiler와 Build System의 관계부터 CMake가 프로젝트를 구성하는 방법까지 알아보기"
---

## 1. C++ 프로젝트를 직접 빌드해 보면

C++ 파일 하나는 다음처럼 컴파일할 수 있다.

```bash
g++ main.cpp -o app
```

하지만 프로젝트가 커지면 Source, Header, Library, 외부 Dependency 등을 함께 관리해야 한다.

이때 프로젝트의 Build 과정을 체계적으로 관리하기 위한 도구가 필요하다.

## 2. Compiler와 Build System

Compiler는 C++ Source Code를 컴파일하여 Object File이나 실행 파일 등을 만드는 역할을 한다.

```text
C++ Source
    ↓
Compiler
    ↓
Object File
    ↓
Executable / Library
```

프로젝트가 커지면 어떤 파일을 빌드하고 어떤 Library를 연결할지 관리해야 한다.

이런 Build 과정을 프로젝트 단위로 관리하는 역할을 Build System이 담당한다.

## 3. CMake는 무엇인가?

CMake는 Compiler 자체가 아니다.

CMake는 프로젝트의 Build 구조를 정의하고 사용하는 환경에 맞는 Build 파일을 생성하도록 도와주는 도구다.

```text
Source
 ↓
CMake
 ↓
Target
 ↓
Build
 ↓
Executable / Library
```

따라서 CMake를 단순히 컴파일 명령어를 대신 입력하는 도구로 보기보다 **Target과 Dependency를 정의하여 프로젝트의 Build 구조를 관리하는 도구**로 이해하는 것이 중요하다.

## 4. CMake에서 중요한 Target

실행 파일은 다음처럼 Target으로 만든다.

```cmake
add_executable(app
    src/main.cpp
)
```

Library도 Target으로 만든다.

```cmake
add_library(pkg_algorithm
    src/fast.cpp
)
```

즉 CMake에서는 파일 자체보다 Target을 중심으로 프로젝트 정보를 관리한다.

## 5. Target과 Dependency

예를 들어 Application이 Algorithm Library를 사용한다면 다음과 같은 관계가 생긴다.

```text
pkg_app
   ↓
pkg_algorithm
```

CMake에서는 다음처럼 표현할 수 있다.

```cmake
target_link_libraries(pkg_app
    PRIVATE
        pkg_algorithm
)
```

여기서 중요한 것은 단순히 `.a` 파일을 연결한다는 것보다 **Target 사이의 Dependency 관계를 정의한다는 것**이다.

## 6. Source Directory와 Build Directory

실제 프로젝트에서는 Source와 Build 결과를 분리할 수 있다.

```bash
cmake -S src/pkg_algorithm -B build/pkg_algorithm
```

`-S`는 Source Directory, `-B`는 Build Directory를 의미한다.

```text
[project]/
├── src/
│   └── pkg_algorithm/
└── build/
    └── pkg_algorithm/
```

이처럼 Source와 Build를 분리하는 방식을 Out-of-source Build라고 한다.

## 7. Build와 Install

Build가 끝나면 Build Tree에 Library나 Executable이 만들어진다.

```text
Source
 ↓
Build
 ↓
Library / Executable
```

하지만 재사용할 Library라면 다른 프로젝트가 사용할 수 있도록 Install 단계도 필요하다.

```text
Build
 ↓
Install
 ↓
Library
Header
CMake Package Information
```

이후 `find_package()`를 통해 설치된 Package를 다른 CMake 프로젝트에서 사용할 수 있는 구조로 발전한다.

## 8. 이번 학습에서 이해할 흐름

```text
Source
 ↓
CMake
 ↓
Target
 ↓
Dependency
 ↓
Build
 ↓
Install
 ↓
Export
 ↓
Package
 ↓
find_package()
 ↓
Imported Target
 ↓
Application
```

다음 글에서는 이 구조를 실제 Pure C++ Library 프로젝트에 적용해 본다.
