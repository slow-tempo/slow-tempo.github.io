---
title: "CMake 5장 - Pure C++ Library를 ROS 2 Application에 연결하기"
date: "2026-08-28"
category: "CMake"
tags: ["CMake", "Build", "Cpp", "ROS2"]
summary: "Pure CMake로 만든 C++ Algorithm Library를 install/export한 뒤, CMAKE_PREFIX_PATH와 find_package()를 통해 ROS 2 Application에서 연결하고 실행하는 과정을 검증한다."
---

## 1. ROS 2 Application에서 Pure C++ Library를 사용하는 이유

앞 단계에서는 `ament_cmake`와 `rclcpp`를 사용하여 ROS 2 C++ Application을 만들고 실행했다.

이번에는 이전에 Pure CMake로 만들었던 `pkg_algorithm` Library를 ROS 2 Application에서 사용한다.

기존 구조는 다음과 같다.

```text
pkg_algorithm
    ↓
Pure C++ Library
```

ROS 2 Application은 다음과 같다.

```text
pkg_ros_app
    ↓
ROS 2
    ↓
rclcpp
```

이번 단계에서는 이미 만들어진 Pure C++ Library를 ROS 2 Application에 연결한다.

```text
pkg_algorithm
Pure C++ Library
        │
        │ install / export
        ▼
CMake Package
        │
        │ find_package()
        ▼
pkg_ros_app
        │
        ▼
ROS 2 Application
```

중요한 점은 `pkg_algorithm` 자체에 ROS 2 의존성을 추가하지 않는다는 것이다.

`pkg_algorithm`은 계속 Pure C++ Library로 유지하고, ROS 2와의 연결은 최종 Application에서 담당한다.

---

## 2. 전체 프로젝트 구조

이번 테스트의 구조는 다음과 같다.

```text
/home/dl/_code/vscode/
├── test1/
│
│   ├── src/
│   │   └── pkg_algorithm/
│   │
│   └── install/
│       └── pkg_algorithm/
│
└── ros_ws/
    │
    └── src/
        └── pkg_ros_app/
            ├── CMakeLists.txt
            ├── package.xml
            └── src/
                └── main.cpp
```

`pkg_algorithm`은 이미 별도의 Pure CMake 프로젝트에서 Build와 Install을 완료한 상태다.

```text
pkg_algorithm
      ↓
CMake Build
      ↓
install()
      ↓
CMake Package
```

설치된 `pkg_algorithm`은 ROS 2 Workspace 내부의 패키지가 아니다.

하지만 CMake Package로 install/export되어 있기 때문에 다른 CMake 프로젝트에서 사용할 수 있다.

이번에는 그 사용 대상이 ROS 2 Application이다.

---

## 3. pkg_algorithm은 ROS 2를 모른다

이번 구조에서 `pkg_algorithm`은 ROS 2에 직접 의존하지 않는다.

예를 들어 다음과 같은 ROS 2 Header를 사용하지 않는다.

```cpp
#include <rclcpp/rclcpp.hpp>
```

CMake에서도 ROS 2 Package를 찾지 않는다.

```cmake
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
```

`pkg_algorithm`의 역할은 알고리즘 기능을 제공하는 것이다.

구조는 다음과 같다.

```text
pkg_algorithm
├── include/
│   └── pkg_algorithm/
│       └── fast.h
│
└── src/
    └── fast.cpp
```

따라서 `pkg_algorithm`은 ROS 2 없이도 사용할 수 있다.

```text
Pure C++ Application
        ↓
pkg_algorithm
```

또는 ROS 2 Application에서도 사용할 수 있다.

```text
ROS 2 Application
        ↓
pkg_algorithm
```

즉 Algorithm Layer는 특정 Framework에 직접 의존하지 않고, 필요한 Application에서 연결할 수 있다.

---

## 4. find_package()로 Pure CMake Package 찾기

ROS 2 Application의 `CMakeLists.txt`에서는 기존 ROS 2 Dependency와 함께 `pkg_algorithm`을 찾는다.

```cmake
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(pkg_algorithm REQUIRED)
```

여기서 `pkg_algorithm`은 ROS 2 Package가 아니다.

이전에 Pure CMake로 만들고 install/export한 일반 CMake Package다.

```text
pkg_algorithm
        │
        │ install / export
        ▼
pkg_algorithmConfig.cmake
        │
        ▼
find_package(pkg_algorithm)
```

`find_package(pkg_algorithm REQUIRED)`가 성공하면 Package가 export한 CMake Target을 사용할 수 있다.

이번 실험에서 사용하는 Target은 다음과 같다.

```cmake
pkg_algorithm::pkg_algorithm
```

즉 흐름은 다음과 같다.

```text
find_package(pkg_algorithm)
        ↓
pkg_algorithmConfig.cmake
        ↓
pkg_algorithmTargets.cmake
        ↓
pkg_algorithm::pkg_algorithm
```

이제 이 Target을 최종 Application에 연결할 수 있다.

---

## 5. CMAKE_PREFIX_PATH로 Package 위치 지정하기

`pkg_algorithm`은 현재 ROS 2 Workspace의 `install/` 아래에 설치된 패키지가 아니다.

별도의 Pure CMake 프로젝트에서 설치했다.

```text
/home/dl/_code/vscode/test1/install/pkg_algorithm
```

따라서 CMake가 이 Package를 찾을 수 있도록 `CMAKE_PREFIX_PATH`를 지정했다.

```bash
cmake \
    -S src/pkg_ros_app \
    -B build/test_find_algorithm \
    -DCMAKE_PREFIX_PATH=/home/dl/_code/vscode/test1/install/pkg_algorithm
```

각 옵션의 역할은 다음과 같다.

```text
-S
↓
Source Directory
-B
↓
Build Directory
-DCMAKE_PREFIX_PATH
↓
CMake Package가 설치된 Prefix 경로
```

CMake는 `CMAKE_PREFIX_PATH`에 지정된 경로를 참고하여 Package Config 파일을 찾는다.

개념적으로는 다음과 같다.

```text
CMAKE_PREFIX_PATH
        ↓
install/pkg_algorithm
        ↓
Package Config 경로 탐색
        ↓
pkg_algorithmConfig.cmake
        ↓
find_package(pkg_algorithm)
        ↓
pkg_algorithm::pkg_algorithm
```

즉 `CMAKE_PREFIX_PATH`는 단순히 Library 파일의 위치를 지정하는 것이 아니라, `find_package()`가 설치된 CMake Package를 찾을 수 있도록 Prefix 경로를 제공한다.

---

## 6. Exported Target을 ROS 2 Application에 연결하기

`find_package()`로 `pkg_algorithm`을 찾은 뒤에는 export된 CMake Target을 실행 파일에 연결한다.

```cmake
target_link_libraries(
    ros_app
    PRIVATE
        pkg_algorithm::pkg_algorithm
)
```

전체 구조는 다음과 같다.

```text
pkg_algorithm::pkg_algorithm
              │
              │ target_link_libraries()
              ▼
           ros_app
              │
              ▼
       ROS 2 Application
```

ROS 2 기능은 `rclcpp`를 사용한다.

```cmake
ament_target_dependencies(
    ros_app
    rclcpp
)
```

따라서 최종 Application은 두 종류의 의존성을 함께 사용한다.

```text
ros_app
   │
   ├── rclcpp
   │
   └── pkg_algorithm::pkg_algorithm
```

`rclcpp`는 ROS 2 기능을 제공하고,

```text
rclcpp
    ↓
ROS 2 기능
```

`pkg_algorithm::pkg_algorithm`은 Pure C++ Algorithm 기능을 제공한다.

```text
pkg_algorithm::pkg_algorithm
    ↓
Pure C++ Algorithm
```

두 의존성은 서로 다른 방식으로 구성되지만, 최종적으로는 하나의 Application Target에 연결된다.

---

## 7. Application 코드에서 Algorithm 사용하기

`pkg_algorithm`이 정상적으로 연결되면 ROS 2 Application 코드에서 Header를 포함하고 Algorithm을 사용할 수 있다.

```cpp
#include "pkg_algorithm/fast.h"
```

그리고 Algorithm 객체를 생성한다.

```cpp
pkg_algorithm::Fast fast;
```

함수를 실행하면 결과를 얻을 수 있다.

```cpp
std::string result =
    fast.run(
        "hello from ROS 2."
    );
```

즉 Application 코드의 흐름은 다음과 같다.

```text
ROS 2 Application 시작
        ↓
pkg_algorithm Header 사용
        ↓
Fast 객체 생성
        ↓
Algorithm 실행
        ↓
결과 출력
```

이 과정에서 `pkg_algorithm`은 자신이 ROS 2 Application 내부에서 사용되고 있다는 사실을 알 필요가 없다.

Application이 필요한 위치에서 일반 C++ 함수처럼 호출할 뿐이다.

---

## 8. 직접 CMake Build로 연결 검증하기

이번 단계에서는 ROS 2 Workspace 전체를 `colcon build`로 Build하는 대신, `pkg_ros_app`의 `CMakeLists.txt`를 직접 CMake로 실행하여 `pkg_algorithm`을 찾고 연결할 수 있는지 먼저 검증했다.

먼저 ROS 2 환경을 설정한다.

```bash
source /opt/ros/humble/setup.bash
```

그다음 `CMAKE_PREFIX_PATH`를 지정하여 Configure를 실행한다.

```bash
cd /home/dl/_code/vscode/ros_ws
cmake \
    -S src/pkg_ros_app \
    -B build/test_find_algorithm \
    -DCMAKE_PREFIX_PATH=/home/dl/_code/vscode/test1/install/pkg_algorithm
```

Configure가 성공한 뒤 Build를 진행한다.

```bash
cmake --build build/test_find_algorithm
```

이 테스트의 목적은 다음과 같다.

```text
ROS 2 Package의 CMakeLists.txt
        +
Pure CMake Package
        ↓
직접 CMake Configure
        ↓
find_package() 성공
        ↓
target_link_libraries() 성공
        ↓
Build 성공
```

즉 아직 전체 ROS 2 Workspace를 통합 Build하는 단계가 아니라, ROS 2 Application의 CMake 프로젝트에서 외부 Pure CMake Package를 정상적으로 찾고 링크할 수 있는지를 직접 확인한 것이다.

---

## 9. 실행 결과

Build가 완료된 후 생성된 실행 파일을 실행했다.

실행 결과는 다음과 같았다.

```text
[INFO] [1787589040.303903465] [ros_app]: Algorithm result: Fast result: hello from ROS 2.
```

이를 통해 다음 구조가 실제로 동작하는 것을 확인했다.

```text
ROS 2 Application
        ↓
pkg_algorithm::Fast
        ↓
fast.run()
        ↓
Fast result: hello from ROS 2.
```

즉 Pure C++로 만든 Library를 ROS 2 Application에서 정상적으로 찾고 연결한 뒤 실제 코드에서 실행할 수 있었다.

---

## 10. ROS 2 Dependency와 Pure CMake Package Dependency

이번 단계에서는 하나의 Application에서 서로 다른 종류의 Dependency를 함께 사용했다.

### ROS 2 Dependency

```cmake
find_package(rclcpp REQUIRED)
```

그리고:

```cmake
ament_target_dependencies(
    ros_app
    rclcpp
)
```

`rclcpp`는 ROS 2의 Package 구조와 `ament_cmake`를 통해 Application에 연결한다.

### Pure CMake Package

```cmake
find_package(pkg_algorithm REQUIRED)
```

그리고 export된 Target을 직접 연결한다.

```cmake
target_link_libraries(
    ros_app
    PRIVATE
        pkg_algorithm::pkg_algorithm
)
```

전체 구조는 다음과 같다.

```text
ros_app
   │
   ├── ROS 2 Dependency
   │       │
   │       └── rclcpp
   │
   └── Pure CMake Package
           │
           └── pkg_algorithm::pkg_algorithm
```

즉 이번 실험에서는 ROS 2 Dependency와 일반 CMake Package Dependency를 하나의 Application에서 함께 구성할 수 있음을 확인했다.

---

## 11. 전체 흐름

이번 단계에서 실제로 검증한 전체 흐름은 다음과 같다.

```text
Pure C++ Source
        ↓
pkg_algorithm
        ↓
CMake Build
        ↓
install()
        ↓
CMake Package
        ↓
CMAKE_PREFIX_PATH
        ↓
find_package(pkg_algorithm)
        ↓
pkg_algorithm::pkg_algorithm
        ↓
target_link_libraries()
        ↓
ROS 2 Application
        ↓
Algorithm 실행 성공
```

실행 결과:

```text
[INFO] [1787589040.303903465] [ros_app]: Algorithm result: Fast result: hello from ROS 2.
```

이번 단계의 핵심은 다음과 같다.

> Pure C++ Library는 ROS 2를 직접 알 필요가 없다.

Pure CMake Package로 정상적으로 install/export되어 있다면 ROS 2 Application에서도 일반 CMake Package와 같은 방식으로 사용할 수 있다.

```text
Pure C++ Algorithm Library
            ↓
        install()
            ↓
       CMake Package
            ↓
    CMAKE_PREFIX_PATH
            ↓
      find_package()
            ↓
 Exported CMake Target
            ↓
    ROS 2 Application
```

이번 장에서는 Pure CMake로 만든 Library를 ROS 2 Application에서 직접 찾고 연결한 뒤 실제로 실행하는 과정까지 검증했다.

다음 단계에서는 하나의 Pure C++ Library만 연결하는 것을 넘어, Qt UI Library까지 함께 연결하고 실제 ROS 2 통신 구조를 추가할 수 있다.

```text
pkg_algorithm
        +
pkg_ui
        +
ROS 2
        ↓
최종 Application 통합
```