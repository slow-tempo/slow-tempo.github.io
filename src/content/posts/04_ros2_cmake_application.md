---
title: "CMake 4장 - ROS 2 C++ Application 만들기"
date: "2026-08-27"
category: "CMake"
tags: ["CMake", "Build", "Cpp", "ROS2"]
summary: "ament_cmake와 rclcpp를 사용하여 ROS 2 C++ Package를 만들고 colcon으로 빌드한 뒤 ros2 run으로 실행해 본다."
---

## 1. Pure CMake 다음 단계
앞 단계까지는 Pure CMake를 사용하여 C++ Library와 Application의 Build 구조를 확인했다.
이번 장에서는 처음으로 ROS 2 환경을 추가한다.
기존 Pure CMake 프로젝트는 다음과 같은 구조였다.

```text
Source Code
↓
CMake
↓
Library / Executable
```

ROS 2에서는 기존 CMake 구조 위에 ROS 2 Package와 Build 관리 구조가 추가된다.

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

이번 단계의 목표는 다음과 같다.

> ROS 2 C++ Package를 만들고, rclcpp를 사용하여 Application을 빌드하고 실행한다.

이번 장에서는 아직 기존 Pure C++ Library나 Qt Library를 연결하지 않는다.

먼저 ROS 2 C++ Application 자체가 정상적으로 Build되고 실행되는 구조를 확인한다.

---

## 2. ROS 2 환경 확인

먼저 ROS 2 환경을 사용할 수 있도록 Setup 파일을 적용한다.

```bash
source /opt/ros/humble/setup.bash
```

현재 ROS 2 배포판은 다음 명령으로 확인할 수 있다.

```bash
echo $ROS_DISTRO
```

실습 환경에서는 다음 결과를 확인했다.

```text
humble
```

`ros2` 명령어의 위치도 확인했다.

```bash
which ros2
```

결과:

```text
/opt/ros/humble/bin/ros2
```

이제 현재 Terminal에서 ROS 2 환경을 사용할 수 있다.

---

## 3. ROS 2 Workspace와 Package 구조

ROS 2 Package를 별도의 Workspace에서 테스트했다.

전체 구조는 다음과 같다.

```text
ros_ws/
└── src/
    └── pkg_ros_app/
        ├── CMakeLists.txt
        ├── package.xml
        └── src/
            └── main.cpp
```

ROS 2 Workspace에서는 일반적으로 `src/` 아래에 Package를 배치한다.

이번에 만든 Package 이름은 다음과 같다.

```text
pkg_ros_app
```

이 Package는 C++로 작성한 ROS 2 Application을 포함한다.

일반적인 CMake 프로젝트와 비교하면 ROS 2 Package에는 `package.xml`이 추가된다.

```text
pkg_ros_app/
├── CMakeLists.txt
├── package.xml
└── src/
    └── main.cpp
```

각 파일의 역할은 다음과 같다.

| 파일 | 역할 |
| --- | --- |
| `CMakeLists.txt` | CMake Build 구조와 Target 정의 |
| `package.xml` | ROS 2 Package 정보와 Dependency 정의 |
| `src/main.cpp` | 실제 C++ Application 코드 |

즉 ROS 2 Package는 기존 CMake 프로젝트 구조를 사용하면서 ROS 2 Package 관리 정보를 추가로 가진다.

---

## 4. ROS 2 Application의 기본 구조

ROS 2 C++ Application에서는 `rclcpp`를 사용한다.

기본적인 실행 흐름은 다음과 같다.

```text
rclcpp::init()
↓
Node 생성
↓
ROS 2 기능 사용
↓
rclcpp::shutdown()
```

이번 실습에서는 ROS 2 Application이 정상적으로 실행되는지 확인하는 것이 목적이므로 최소 Node를 생성하고 로그를 출력했다.

이 단계에서는 아직 Publisher나 Subscriber를 사용하지 않는다.

먼저 다음 구조가 정상적으로 동작하는지 확인한다.

```text
C++
↓
rclcpp
↓
ROS 2 Node
↓
Application 실행
```

---

## 5. ROS 2 Application 코드

파일 위치는 다음과 같다.

```text
ros_ws/src/pkg_ros_app/src/main.cpp
```

전체 코드는 다음과 같다.

```cpp
#include <memory>
#include <rclcpp/rclcpp.hpp>
int main(
    int argc,
    char * argv[]
)
{
    rclcpp::init(
        argc,
        argv
    );
    auto node =
        std::make_shared<
            rclcpp::Node
        >(
            "ros_app"
        );
    RCLCPP_INFO(
        node->get_logger(),
        "ROS 2 Application started."
    );
    rclcpp::shutdown();
    return 0;
}
```

코드의 흐름은 다음과 같다.

### ROS 2 초기화

```cpp
rclcpp::init(
    argc,
    argv
);
```

ROS 2 C++ Application을 사용하기 전에 ROS 2 실행 환경을 초기화한다.

---

### Node 생성

```cpp
auto node =
    std::make_shared<
        rclcpp::Node
    >(
        "ros_app"
    );
```

`ros_app`이라는 이름의 ROS 2 Node를 생성한다.

---

### 로그 출력

```cpp
RCLCPP_INFO(
    node->get_logger(),
    "ROS 2 Application started."
);
```

ROS 2 Logger를 사용하여 Application이 정상적으로 실행되었는지 확인한다.

---

### ROS 2 종료

```cpp
rclcpp::shutdown();
```

Application이 종료되기 전에 ROS 2를 종료한다.

전체 실행 흐름은 다음과 같다.

```text
Application 시작
↓
rclcpp::init()
↓
Node 생성
↓
RCLCPP_INFO()
↓
rclcpp::shutdown()
↓
Application 종료
```

---

## 6. CMakeLists.txt 구성

ROS 2 Package의 CMake 파일에서는 먼저 `ament_cmake`와 `rclcpp`를 찾는다.

```cmake
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
```

`ament_cmake`는 ROS 2에서 CMake 기반 Package Build 구조를 구성하기 위해 사용한다.

`rclcpp`는 C++에서 ROS 2 Node와 관련 기능을 사용하기 위한 Client Library다.

실행 파일을 생성한다.

```cmake
add_executable(
    ros_app
    src/main.cpp
)
```

이후 `ros_app` Target에 ROS 2 Dependency를 연결한다.

```cmake
ament_target_dependencies(
    ros_app
    rclcpp
)
```

실행 파일을 ROS 2 Package 구조에 맞게 설치한다.

```cmake
install(
    TARGETS
    ros_app
    DESTINATION
    lib/${PROJECT_NAME}
)
```

마지막으로 ROS 2 Package 설정을 마무리한다.

```cmake
ament_package()
```

전체 구조는 다음과 같다.

```text
pkg_ros_app
↓
CMakeLists.txt
↓
find_package(ament_cmake)
find_package(rclcpp)
↓
add_executable(ros_app)
↓
ament_target_dependencies()
↓
ament_package()
```

이번 단계에서 중요한 점은 ROS 2에서도 기본적으로 CMake Target을 사용한다는 것이다.

다만 ROS 2 Package에서는 일반 CMake 구조 위에 `ament_cmake`와 ROS 2 Package 관리 구조가 추가된다.

---

## 7. colcon으로 빌드하기

ROS 2 Workspace의 최상위 위치로 이동한다.

```bash
cd /home/dl/_code/vscode/ros_ws
```

특정 Package를 Build한다.

```bash
colcon build --packages-select pkg_ros_app
```

Build가 완료되면 Workspace에 다음과 같은 Directory가 생성된다.

```text
ros_ws/
├── build/
├── install/
├── log/
└── src/
    └── pkg_ros_app/
```

Build 흐름을 단순화하면 다음과 같다.

```text
colcon
↓
ROS 2 Package
↓
ament_cmake
↓
CMake
↓
Executable
```

`colcon`은 ROS 2 Workspace 내부의 Package Build 과정을 관리한다.

각 Package의 CMake Build 과정에서는 `ament_cmake`가 ROS 2 Package 구조와 Dependency를 연결한다.

---

## 8. ROS 2 Application 실행

Build가 완료된 후 Workspace 환경을 적용한다.

```bash
source install/setup.bash
```

이후 다음 명령으로 실행 파일을 실행한다.

```bash
ros2 run pkg_ros_app ros_app
```

실행 결과는 다음과 같았다.

```text
[INFO] [ros_app]: ROS 2 Application started.
```

즉 C++로 작성한 Application이 다음 과정을 거쳐 정상적으로 실행되는 것을 확인했다.

```text
C++ Source
↓
ROS 2 Package
↓
ament_cmake
↓
colcon build
↓
install
↓
ros2 run
↓
ROS 2 Application 실행 성공
```

---

## 9. Pure CMake와 ROS 2 CMake의 관계

Pure CMake 프로젝트에서는 CMake가 직접 Target과 Dependency를 구성한다.

예를 들면 다음과 같은 구조를 사용한다.

```cmake
cmake_minimum_required(
    VERSION 3.8
)
project(pkg_algorithm)
add_library(
    ...
)
target_include_directories(
    ...
)
target_link_libraries(
    ...
)
```

ROS 2 Package에서도 기본적인 CMake Target 구조는 그대로 사용한다.

다만 ROS 2에서는 다음과 같은 Package 관리 구조가 추가된다.

```cmake
find_package(
    ament_cmake
    REQUIRED
)
find_package(
    rclcpp
    REQUIRED
)
add_executable(
    ...
)
ament_target_dependencies(
    ...
    rclcpp
)
ament_package()
```

두 구조를 단순화하면 다음과 같다.

```text
Pure CMake
Source
↓
CMake Target
↓
Library / Executable
```

```text
ROS 2
ROS 2 Package
↓
ament_cmake
↓
CMake Target
↓
ROS 2 Dependency
↓
Executable
```

즉 ROS 2에서도 Application 자체는 CMake Target으로 만들어진다.

`ament_cmake`는 이 Target을 ROS 2 Package와 Dependency 구조에 맞게 구성하는 역할을 추가한다.

---

## 10. 이번 단계에서 확인한 구조

이번 실습에서 실제로 확인한 전체 흐름은 다음과 같다.

```text
ROS 2 Humble
↓
source /opt/ros/humble/setup.bash
↓
ROS 2 Workspace
↓
pkg_ros_app
↓
ament_cmake
+
rclcpp
↓
CMake Target
↓
colcon build
↓
install
↓
ros2 run
↓
ROS 2 Application 실행 성공
```

이번 단계에서는 먼저 ROS 2 C++ Application 자체가 정상적으로 동작하는 것을 확인했다.

아직 기존 Pure C++ Library나 Qt Library를 연결하지 않았다.

이번 장의 범위는 다음과 같다.

```text
ROS 2 환경 확인
↓
ROS 2 Workspace 생성
↓
ROS 2 Package 구성
↓
ament_cmake 사용
↓
rclcpp 연결
↓
colcon build
↓
ros2 run
↓
Application 실행 확인
```

---

## 11. 다음 단계

이번 단계에서는 ROS 2 C++ Application 자체가 정상적으로 Build되고 실행되는 구조를 확인했다.

다음 단계에서는 기존에 Pure CMake로 만든 C++ Algorithm Library를 ROS 2 Application에 연결한다.

구조는 다음과 같이 확장된다.

```text
Pure C++ Library
↓
install / export
↓
find_package()
↓
ROS 2 Application
↓
pkg_algorithm 사용
```

즉 다음 단계에서는 ROS 2 Application이 기존 Pure CMake Package를 어떻게 찾고 연결할 수 있는지 확인한다.