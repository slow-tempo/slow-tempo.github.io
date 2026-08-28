---
title: "ROS 2 C++ Application 만들기"
date: "2026-08-27"
category: "CMake"
summary: "ament_cmake와 rclcpp를 사용하여 ROS 2 C++ Package를 만들고 colcon으로 빌드한 뒤 실행해 보기"
---

## 1. Pure CMake 다음 단계

앞에서는 ROS 2 없이 Pure C++ Library를 만들고, Qt5 Library를 CMake 프로젝트로 구성했다.

이번에는 처음으로 ROS 2를 추가한다.

이전 단계에서는 일반적인 CMake 프로젝트를 사용했다.

```text
Pure C++
    ↓
CMake
    ↓
Library / Application
```

ROS 2에서는 CMake 위에 ROS 2 Package 구조가 추가된다.

```text
ROS 2 Workspace
    ↓
ROS 2 Package
    ↓
ament_cmake
    ↓
CMake
    ↓
Executable
```

이번 단계의 목표는 간단하다.

> ROS 2 C++ Package를 만들고 `rclcpp`를 사용하여 Application을 빌드하고 실행한다.

---

## 2. ROS 2 환경 확인

먼저 ROS 2 환경을 사용할 수 있도록 Setup 파일을 적용한다.

```bash
source /opt/ros/humble/setup.bash
```

현재 ROS 2 배포판을 확인할 수 있다.

```bash
echo $ROS_DISTRO
```

실습 환경에서는 다음 결과를 확인했다.

```text
humble
```

`ros2` 명령어도 정상적으로 설치되어 있는 것을 확인했다.

```bash
which ros2
```

결과:

```text
/opt/ros/humble/bin/ros2
```

---

## 3. ROS 2 Workspace 만들기

ROS 2 Package를 별도의 Workspace에서 테스트했다.

구조는 다음과 같다.

```text
ros_ws/
└── src/
    └── pkg_ros_app/
```

ROS 2 Workspace에서는 일반적으로 `src/` 아래에 Package를 배치한다.

이후 `colcon`을 사용하여 Workspace 단위 또는 특정 Package를 빌드할 수 있다.

---

## 4. ROS 2 C++ Package

이번에 만든 Package 이름은 다음과 같다.

```text
pkg_ros_app
```

이 Package는 C++로 작성한 ROS 2 Application을 포함한다.

기본 구조는 다음과 같다.

```text
pkg_ros_app/
├── CMakeLists.txt
├── package.xml
└── src/
    └── main.cpp
```

ROS 2 Package에서는 일반적인 CMake 프로젝트와 달리 `package.xml`도 함께 사용한다.

`package.xml`에는 Package의 이름과 Dependency 등의 정보를 정의한다.

CMake에서는 실제 Build 구조와 Target을 정의한다.

---

## 5. ament_cmake와 rclcpp

`CMakeLists.txt`에서는 먼저 `ament_cmake`와 `rclcpp`를 찾는다.

```cmake
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
```

그리고 실행 파일을 만든다.

```cmake
add_executable(ros_app
    src/main.cpp
)
```

ROS 2 Dependency는 `ament_target_dependencies()`를 통해 연결한다.

```cmake
ament_target_dependencies(ros_app
    rclcpp
)
```

마지막으로 ROS 2 Package 설정을 마무리한다.

```cmake
ament_package()
```

전체적인 Dependency 관계는 다음과 같다.

```text
ros_app
   ↓
rclcpp
   ↓
ROS 2
```

---

## 6. ROS 2 Node 작성

C++ 코드에서는 `rclcpp`를 사용하여 ROS 2 Application을 작성한다.

핵심 구조는 다음과 같다.

```text
rclcpp::init()
      ↓
Node 생성
      ↓
ROS 2 처리
      ↓
rclcpp::shutdown()
```

실습에서는 ROS 2 Application이 정상적으로 실행되었는지 확인하기 위해 시작 메시지를 출력했다.

```text
ROS 2 Application started.
```

이 단계에서는 복잡한 Publisher나 Subscriber를 만들기보다 먼저 C++ Application이 ROS 2 Package로 정상적으로 빌드되고 실행되는지 확인하는 것을 목표로 했다.

---

## 7. colcon으로 빌드하기

ROS 2 Workspace의 최상위 위치에서 다음 명령으로 특정 Package를 빌드했다.

```bash
colcon build --packages-select pkg_ros_app
```

빌드가 완료되면 다음과 같은 구조가 생성된다.

```text
ros_ws/
├── build/
├── install/
├── log/
└── src/
    └── pkg_ros_app/
```

여기서 중요한 점은 ROS 2 Workspace가 Package별로 CMake Build를 관리하고 `colcon`이 전체 Build 과정을 관리한다는 것이다.

```text
colcon
   ↓
Package
   ↓
ament_cmake
   ↓
CMake
```

---

## 8. ROS 2 Application 실행

빌드가 완료된 후 실행했다.

```bash
ros2 run pkg_ros_app ros_app
```

실행 결과는 다음과 같았다.

```text
[INFO] [ros_app]: ROS 2 Application started.
```

즉, C++로 작성한 Application이 ROS 2 Package로 정상적으로 빌드되고 실행되는 것을 확인했다.

---

## 9. Pure CMake와 ROS 2 CMake의 차이

앞에서 사용한 Pure CMake 프로젝트에서는 다음과 같은 구조를 사용했다.

```cmake
cmake_minimum_required(VERSION 3.8)

project(pkg_algorithm)

add_library(...)
target_include_directories(...)
target_link_libraries(...)
```

ROS 2 Package에서는 여기에 ROS 2의 Package 관리 구조가 추가된다.

```cmake
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)

add_executable(...)

ament_target_dependencies(
    ...
    rclcpp
)

ament_package()
```

즉, ROS 2에서도 기본적으로 CMake의 Target 구조를 사용한다.

다만 ROS 2에서는 `ament_cmake`가 ROS 2 Package와 Dependency를 관리하기 위한 추가 구조를 제공한다.

---

## 10. 이번 단계에서 확인한 것

이번 실습에서 실제로 확인한 흐름은 다음과 같다.

```text
ROS 2 Humble
      ↓
ROS 2 Workspace
      ↓
pkg_ros_app
      ↓
ament_cmake
      ↓
rclcpp
      ↓
colcon build
      ↓
ros2 run
      ↓
ROS 2 Application 실행 성공
```

이번 단계에서는 먼저 ROS 2 C++ Application 자체가 정상적으로 동작하는 것을 확인했다.

다음 단계에서는 여기서 한 단계 더 나아간다.

기존에 만들었던 Pure C++ Algorithm Library를 ROS 2 Application에 연결해 본다.