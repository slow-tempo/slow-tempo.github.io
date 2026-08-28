---
title: "CMake · Qt · ROS 2 학습 목차"
date: "2026-08-23"
category: "CMake"
summary: "Pure CMake부터 Qt, ROS 2까지 단계적으로 학습하기 위한 목차"
---

## 1. 이 시리즈에서 공부할 것

이번 시리즈에서는 C++ 프로젝트를 직접 만들면서 CMake의 구조를 이해하고, 그 위에 Qt와 ROS 2를 단계적으로 추가한다.

최종 목표는 다음 구조를 직접 구현하고 이해하는 것이다.

```text
Pure C++ Algorithm Library
        │
        ├───────────────┐
        │               │
        ▼               ▼
    Pure Qt UI       ROS 2 App
        │               │
        └───────┬───────┘
                ▼
           Application
```

학습 순서는 다음과 같다.

```text
PART 1 → Pure CMake
PART 2 → Qt + CMake
PART 3 → ROS 2 + ament_cmake
```

## 2. PART 1 — Pure CMake

### 2-1. CMake란 무엇인가?
Compiler, Build System, CMake의 관계를 알아본다.

### 2-2. Source와 Build Directory
`-S`, `-B`, Build Directory와 Out-of-source Build를 이해한다.

### 2-3. CMake Target
`add_executable()`, `add_library()`와 Target 개념을 이해한다.

### 2-4. Static Library
Object File, Static Library, `.a` 파일과 Library/Application 분리를 알아본다.

### 2-5. Install
Build 결과를 Install Tree로 옮긴다.

### 2-6. Export와 Package
Export Target, `Targets.cmake`, `Config.cmake`의 관계를 알아본다.

### 2-7. find_package()
`CMAKE_PREFIX_PATH`를 이용해 설치된 Package를 찾는다.

### 2-8. Dependency
`target_link_libraries()`, `PUBLIC`, `PRIVATE`, `INTERFACE`를 이해한다.

### 2-9. 실제 프로젝트
Pure C++ Algorithm Library `pkg_algorithm`을 만들고 Application에서 재사용한다.

## 3. PART 2 — Qt + CMake

### 3-1. Qt와 CMake
Pure CMake 프로젝트에 Qt5를 추가한다.

### 3-2. Qt Target
`find_package(Qt5 REQUIRED COMPONENTS Widgets)`와 `Qt5::Widgets`를 사용한다.

### 3-3. Pure Qt Library
`pkg_ui`를 만들고 Qt dependency를 Target에 연결한다.

### 3-4. Dependency 전달
`PUBLIC`과 Transitive Dependency가 어떻게 전달되는지 확인한다.

### 3-5. Package 재사용
`pkg_ui`를 Install하고 `pkg_app`에서 사용한다.

## 4. PART 3 — ROS 2 + ament_cmake

### 4-1. ROS 2 Package
ROS 2 Package의 기본 구조를 알아본다.

### 4-2. ament_cmake
Pure CMake와 `ament_cmake`의 차이를 비교한다.

### 4-3. colcon
ROS 2 Workspace에서 Package를 Build한다.

### 4-4. rclcpp
ROS 2 Application에서 `rclcpp`를 사용한다.

### 4-5. Pure C++ Library와 ROS 2
ROS 2 Application이 기존 Pure C++ Algorithm Library를 사용하는 구조를 만든다.

## 5. 최종 목표

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

그리고 이 구조 위에 다음 단계를 순서대로 추가한다.

```text
Pure CMake
    ↓
Qt
    ↓
ROS 2
```
