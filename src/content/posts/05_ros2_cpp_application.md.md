---
title: "Pure C++ Library를 ROS 2 Application에 연결하기"
date: "2026-08-28"
category: "CMake"
summary: "Pure CMake로 만든 C++ Algorithm Library를 ROS 2 Application에서 find_package()와 CMAKE_PREFIX_PATH를 이용해 연결해 보기"
---

## 1. ROS 2와 Pure C++ Library를 연결하는 이유

앞 단계에서는 `ament_cmake`와 `rclcpp`를 사용하여 ROS 2 C++ Application을 만들고 실행했다.

이번에는 기존에 Pure CMake로 만들었던 `pkg_algorithm` Library를 ROS 2 Application에서 사용한다.

기존 구조는 다음과 같았다.

```text
pkg_algorithm
    ↓
Pure C++ Library
```

그리고 ROS 2 Application은 다음과 같다.

```text
pkg_ros_app
    ↓
ROS 2
    ↓
rclcpp
```

이번 단계에서는 두 구조를 연결한다.

```text
pkg_algorithm
      ↓
Pure C++ Library
      ↓
pkg_ros_app
      ↓
rclcpp
      ↓
ROS 2 Application
```

중요한 점은 `pkg_algorithm` 자체에 ROS 2 Dependency를 추가하지 않는다는 것이다.

Algorithm Library는 계속 Pure C++ Library로 유지한다.

ROS 2는 최종 Application Layer에서만 사용한다.

---

## 2. 전체 구조

이번에 테스트한 구조는 개념적으로 다음과 같다.

```text
[project]/
├── install/
│   └── pkg_algorithm/
│
└── ros_ws/
    └── src/
        └── pkg_ros_app/
            ├── CMakeLists.txt
            ├── package.xml
            └── src/
                └── main.cpp
```

`pkg_algorithm`은 이미 Pure CMake 프로젝트에서 Build와 Install을 완료한 상태다.

```text
pkg_algorithm
      ↓
Build
      ↓
Install
      ↓
/home/[user]/[project]/install/pkg_algorithm
```

이제 ROS 2 Application에서 이 설치된 Package를 찾아 사용한다.

---

## 3. pkg_algorithm은 ROS 2를 모른다

이번 구조에서 중요한 점은 `pkg_algorithm`이 ROS 2를 직접 사용하지 않는다는 것이다.

```text
pkg_algorithm
```

안에는 다음과 같은 ROS 2 관련 Dependency가 없다.

```text
rclcpp
ament_cmake
ros2
```

Algorithm Library는 단순히 자신의 기능만 제공한다.

예를 들어 구조는 다음과 같다.

```text
pkg_algorithm
├── include/
│   └── pkg_algorithm/
│       └── fast.h
└── src/
    └── fast.cpp
```

이 Library는 ROS 2 없이도 사용할 수 있다.

```text
Pure C++ Application
        ↓
pkg_algorithm
```

또는 이번처럼 ROS 2 Application에서도 사용할 수 있다.

```text
ROS 2 Application
        ↓
pkg_algorithm
```

즉, Algorithm Layer와 ROS 2 Layer를 분리할 수 있다.

---

## 4. ROS 2 Package에서 pkg_algorithm 찾기

`pkg_ros_app`의 `CMakeLists.txt`에서 기존 ROS 2 Dependency와 함께 `pkg_algorithm`을 찾는다.

```cmake
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)

find_package(pkg_algorithm REQUIRED)
```

여기서 `pkg_algorithm`은 ROS 2 Package가 아니다.

Pure CMake로 만들어서 별도로 Install한 CMake Package다.

이번 실험에서는 ROS 2 Application의 CMake 프로젝트에서 Pure CMake로 설치한 pkg_algorithm을 find_package()로 찾아 사용할 수 있음을 확인했다.

즉, 구조는 다음과 같다.

```text
pkg_ros_app
     │
     ├── find_package(rclcpp)
     │
     └── find_package(pkg_algorithm)
```

이번 실험에서는 하나의 ROS 2 Application에서 rclcpp와 Pure CMake Package인 pkg_algorithm을 함께 Dependency로 구성할 수 있음을 확인했다.

---

## 5. CMAKE_PREFIX_PATH로 Package 위치 지정하기

`pkg_algorithm`은 ROS 2 Workspace의 `install/` 아래에 있는 Package가 아니다.

별도의 경로에 설치되어 있다.

```text
/home/[user]/[project]/install/pkg_algorithm
```

따라서 CMake가 이 위치에서 `pkg_algorithm`을 찾을 수 있도록 `CMAKE_PREFIX_PATH`를 지정했다.

실제로 다음 명령을 사용했다.

```bash
cmake \
    -S src/pkg_ros_app \
    -B build/test_find_algorithm \
    -DCMAKE_PREFIX_PATH=/home/[user]/[project]/install/pkg_algorithm
```

이 명령의 역할은 다음과 같다.

```text
-S
↓
ROS 2 Package Source Directory

-B
↓
Build Directory

-DCMAKE_PREFIX_PATH
↓
pkg_algorithm이 설치된 위치
```

CMake는 `CMAKE_PREFIX_PATH`를 참고하여 설치된 `pkg_algorithm` Package를 찾는다.

```text
CMAKE_PREFIX_PATH
        ↓
install/pkg_algorithm
        ↓
pkg_algorithmConfig.cmake
        ↓
find_package(pkg_algorithm)
```

---

## 6. ROS 2 Application에 Algorithm Library 연결하기

`pkg_algorithm`을 찾은 뒤에는 CMake Target을 연결한다.

개념적으로는 다음과 같다.

```text
pkg_ros_app
      ↓
pkg_algorithm::pkg_algorithm
```

ROS 2 Application Target에서 Pure C++ Library Target을 사용한다.

즉, 구조는 다음과 같다.

```text
ros_app
   ├── rclcpp
   │
   └── pkg_algorithm::pkg_algorithm
```

ROS 2 Dependency와 Algorithm Library Dependency는 서로 다른 역할을 가진다.

```text
rclcpp
↓
ROS 2 기능

pkg_algorithm::pkg_algorithm
↓
Pure C++ Algorithm 기능
```

하지만 둘 다 최종적으로 CMake Target Dependency로 Application에 연결된다.

---

## 7. Application 코드에서 Algorithm 사용하기

ROS 2 Application에서는 `pkg_algorithm`의 Header를 포함하고 Algorithm 객체를 사용할 수 있다.

구조는 다음과 같다.

```text
ROS 2 Application 시작
        ↓
pkg_algorithm 사용
        ↓
결과 출력
```

실제 실행 결과는 다음과 같았다.

```text
[INFO] [ros_app]: Algorithm result: Fast result: hello from ROS 2.
```

즉, ROS 2 Application 내부에서 Pure C++ Library가 정상적으로 연결되고 실행되는 것을 확인했다.

전체 흐름은 다음과 같다.

```text
ROS 2 Application
        ↓
pkg_algorithm
        ↓
Fast
        ↓
Algorithm result
```

---

## 8. Build 성공

이번 테스트에서는 `pkg_ros_app`을 ROS 2 Workspace 전체의 일반적인 `colcon build` 방식이 아니라 CMake를 직접 실행하여 별도의 Build Directory에서 확인했다.

사용한 명령은 다음과 같다.

```bash
cmake \
    -S src/pkg_ros_app \
    -B build/test_find_algorithm \
    -DCMAKE_PREFIX_PATH=/home/[user]/[project]/install/pkg_algorithm
```

그리고 Build를 진행했다.

```bash
cmake --build build/test_find_algorithm
```

Build가 정상적으로 완료된 후 실행 파일을 실행했다.

결과:

```text
[INFO] [ros_app]: Algorithm result: Fast result: hello from ROS 2.
```

이를 통해 Pure C++로 만든 Library를 ROS 2 Application에서 정상적으로 찾고 연결할 수 있다는 것을 확인했다.

---

## 9. 이번 구조에서 중요한 점

이번 실습의 핵심은 ROS 2를 Algorithm Library까지 확장하지 않았다는 점이다.

잘못하면 다음과 같이 모든 코드가 ROS 2에 의존하는 구조가 될 수 있다.

```text
Algorithm
    ↓
ROS 2
    ↓
rclcpp
```

하지만 이번 구조에서는 역할을 분리한다.

```text
pkg_algorithm
      ↓
Pure C++

pkg_ros_app
      ↓
ROS 2
      ↓
rclcpp
```

그리고 최종 Application에서 두 Layer를 연결한다.

```text
pkg_algorithm
       │
       ▼
    ros_app
       ▲
       │
     rclcpp
```

이 구조를 사용하면 Algorithm Library는 ROS 2가 없는 일반적인 C++ 프로젝트에서도 사용할 수 있다.

---

## 10. CMake 관점에서 다시 보기

이번 단계에서는 서로 다른 두 종류의 Dependency를 하나의 Application에서 사용했다.

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

### Pure CMake Package

```cmake
find_package(pkg_algorithm REQUIRED)
```

그리고 CMake Target을 통해 연결한다.

```cmake
target_link_libraries(
    ros_app
    PRIVATE
        pkg_algorithm::pkg_algorithm
)
```
ROS 2의 rclcpp는 ament_target_dependencies()로 연결하고, Pure CMake Package인 pkg_algorithm은 exported CMake Target인 pkg_algorithm::pkg_algorithm을 target_link_libraries()로 연결했다.

두 방식은 사용하는 Package 관리 구조는 다르지만 최종적으로는 Application Target의 Dependency를 구성한다.

```text
ros_app
   │
   ├── ROS 2 Dependency
   │       └── rclcpp
   │
   └── CMake Package Dependency
           └── pkg_algorithm::pkg_algorithm
```

---

## 11. 이번 단계에서 확인한 전체 흐름

이번 실습을 통해 다음 구조가 실제로 동작하는 것을 확인했다.

```text
Pure C++ Source
        ↓
pkg_algorithm
        ↓
CMake Build
        ↓
Install
        ↓
CMake Package
        ↓
CMAKE_PREFIX_PATH
        ↓
find_package(pkg_algorithm)
        ↓
pkg_algorithm::pkg_algorithm
        ↓
ROS 2 Application
        ↓
Algorithm 실행 성공
```

실행 결과:

```text
[INFO] [ros_app]: Algorithm result: Fast result: hello from ROS 2.
```

이번 단계에서 확인한 핵심은 다음과 같다.

> Pure C++ Library는 ROS 2를 알 필요가 없다.

그리고 ROS 2 Application은 필요한 위치에서 기존 Pure C++ Library를 CMake Package로 찾아 연결할 수 있다.

```text
Pure C++ Algorithm Library
            ↓
        Install
            ↓
       CMake Package
            ↓
      find_package()
            ↓
      ROS 2 Application
```

이제 다음 단계에서는 ROS 2의 Publisher, Subscriber, Callback 등 실제 ROS 2 통신 구조를 추가하고, 받은 데이터를 Application 내부의 다른 Layer와 연결하는 구조로 확장할 수 있다.