---
title: "Pure Qt Library를 CMake로 만들기"
date: "2026-08-26"
category: "CMake"
summary: "Pure CMake Library 구조에 Qt5를 추가하고 Qt dependency가 CMake Target을 통해 전달되는 과정을 이해하기"
---

## 1. Pure CMake에서 Qt로 넘어가기

앞 단계에서는 Qt나 ROS 2 없이 Pure C++ Library를 만들었다.

이번에는 그 구조를 그대로 유지하면서 Qt5를 추가한다.

중요한 점은 Qt를 Application에 직접 붙이는 것보다 **Qt를 사용하는 Library Target을 만들고 그 Dependency를 Application으로 전달하는 구조**를 확인하는 것이다.

전체 흐름은 다음과 같다.

```text
Qt5
 ↓
Qt5::Widgets
 ↓
pkg_ui
 ↓
pkg_app
```

이번 단계에서도 ROS 2는 사용하지 않는다.

## 2. 프로젝트 구조

`pkg_ui`는 Pure Qt UI Library로 구성한다.

```text
[project]/
└── src/
    └── pkg_ui/
        ├── CMakeLists.txt
        ├── include/
        │   └── pkg_ui/
        │       └── mainwindow.h
        ├── src/
        │   └── mainwindow.cpp
        └── ui/
            └── mainwindow.ui
```

앞 단계의 `pkg_algorithm`과 마찬가지로 UI도 독립적인 Library 프로젝트로 취급한다.

최종적으로는 다음 구조를 만든다.

```text
pkg_algorithm
      │
      ├──────────────┐
      ↓              ↓
   pkg_ui         pkg_app
      │
      └──────────────→ pkg_app
```

## 3. CMake에서 Qt 찾기

Qt를 사용하기 위해 CMake에서 Qt5 Widgets 모듈을 찾는다.

```cmake
find_package(Qt5 REQUIRED COMPONENTS Widgets)
```

여기서 중요한 것은 Qt의 실제 Library 파일 경로를 직접 지정하지 않는다는 것이다.

CMake가 제공하는 Target을 사용한다.

```text
Qt5::Widgets
```

## 4. pkg_ui가 Qt에 의존하도록 만들기

`pkg_ui`는 Qt Widgets를 사용하는 Library이므로 CMake Target에 Qt dependency를 연결한다.

```cmake
target_link_libraries(${PROJECT_NAME}
    PUBLIC
        Qt5::Widgets
)
```

여기서 `PUBLIC`이 중요하다.

`pkg_ui` 자체가 Qt를 사용하면서 동시에 `pkg_ui`를 사용하는 Target에도 Qt dependency가 전달될 수 있도록 정의한다.

개념적으로 보면:

```text
pkg_app
   ↓
pkg_ui::pkg_ui
   ↓
Qt5::Widgets
```

와 같은 Dependency 관계가 만들어진다.

## 5. Qt Dependency도 Target으로 관리하기

앞 단계에서 Library를 직접 `.a` 파일 경로로 연결하지 않고 CMake Target을 사용했다.

Qt도 같은 방식으로 접근한다.

```cmake
Qt5::Widgets
```

라는 CMake Target을 사용하기 때문에 Qt5 Widgets dependency를 Target 관계로 연결할 수 있다.

따라서 단순히 다음과 같이 생각하면 안 된다.

```text
pkg_ui → libQt5Widgets.so
```

보다 정확하게는:

```text
pkg_ui Target
      ↓
Qt5::Widgets Target
```

이라는 CMake Target 간 Dependency 관계로 이해하는 것이 중요하다.

## 6. pkg_ui를 Build하기

`pkg_ui`도 앞 단계의 Library와 같은 방식으로 별도의 Build Directory를 사용한다.

```bash
cmake -S src/pkg_ui -B build/pkg_ui
```

그리고 Build한다.

```bash
cmake --build build/pkg_ui
```

Library가 정상적으로 생성되면 `pkg_ui` 역시 Application에서 사용할 수 있는 별도의 Library Target이 된다.

## 7. pkg_ui를 Install하기

UI Library도 다른 프로젝트에서 재사용하려면 Install할 수 있는 Package 구조를 만들어야 한다.

예를 들어 다음과 같이 Install한다.

```bash
cmake --install build/pkg_ui     --prefix /home/[user]/[project]/install/pkg_ui
```

이렇게 하면 `pkg_algorithm`과 `pkg_ui`를 각각 독립적인 설치 Package로 관리할 수 있다.

```text
install/
├── pkg_algorithm/
└── pkg_ui/
```

## 8. pkg_app에서 두 Library 사용하기

이제 Application에서는 두 Package를 찾는다.

```cmake
find_package(pkg_algorithm REQUIRED)
find_package(pkg_ui REQUIRED)
```

그리고 Target을 연결한다.

```cmake
add_executable(${PROJECT_NAME}
    src/main.cpp
)

target_link_libraries(${PROJECT_NAME}
    PRIVATE
        pkg_algorithm::pkg_algorithm
        pkg_ui::pkg_ui
)
```

두 Package가 서로 다른 Install Prefix에 있기 때문에 CMake가 두 위치를 찾을 수 있도록 `CMAKE_PREFIX_PATH`에 모두 지정한다.

```bash
cmake     -S src/pkg_app     -B build/pkg_app     -DCMAKE_PREFIX_PATH="/home/[user]/[project]/install/pkg_algorithm;/home/[user]/[project]/install/pkg_ui"
```

## 9. Dependency가 전달되는 구조

여기서 이번 단계의 핵심을 확인할 수 있다.

Application이 직접 Qt를 사용하지 않고 `pkg_ui`를 사용하는 경우에도 `pkg_ui`가 Qt에 의존한다는 정보가 CMake Target 관계를 통해 연결될 수 있다.

개념적으로:

```text
pkg_app
   ↓
pkg_ui::pkg_ui
   ↓
Qt5::Widgets
```

이다.

따라서 Library를 만들 때 Dependency를 어떻게 정의하느냐가 중요하다.

특히 `PUBLIC`, `PRIVATE`, `INTERFACE`는 단순한 문법 옵션이 아니라 Target 간 Dependency를 어떻게 전달할 것인지를 정의하는 역할을 한다.

## 10. 이번 단계에서 이해한 것

이번 단계에서는 앞에서 만든 Pure CMake 구조에 Qt5를 추가했다.

핵심 흐름은 다음과 같다.

```text
Pure CMake
    ↓
Qt5
    ↓
Qt5::Widgets
    ↓
pkg_ui
    ↓
pkg_app
```

그리고 Library와 Application을 분리하면서도 Dependency는 CMake Target을 통해 연결할 수 있다는 것을 확인했다.

특히 다음 두 가지가 중요하다.

1. Qt Library를 직접 파일 경로로 연결하지 않고 `Qt5::Widgets` Target을 사용한다.
2. `pkg_ui`가 사용하는 Qt dependency를 CMake Target 관계로 관리한다.

이제 Pure CMake와 Pure Qt Library 구조를 만들었으므로 다음 단계에서 처음으로 ROS 2와 `ament_cmake`를 추가할 수 있다.
