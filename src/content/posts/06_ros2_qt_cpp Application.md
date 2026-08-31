---
title: "CMake 6장 - ROS 2 Application에서 Pure CMake와 Qt 패키지 통합하기"
date: "2026-08-28"
category: "CMake"
tags: ["CMake", "Build", "Cpp", "ROS2", "Qt"]
summary: "Pure CMake로 만든 C++ 알고리즘과 Qt UI 라이브러리를 ROS 2 ament_cmake Application에서 find_package()와 target_link_libraries()로 연결하고, Qt와 ROS 2 간 데이터 흐름까지 실제로 검증한다."
---

## 1. ROS 2 Application에서 Pure CMake Package 통합하기

이전 단계에서는 Pure CMake를 사용하여 두 개의 독립적인 라이브러리를 만들었다.

```text
pkg_algorithm
Pure C++ Library
```

```text
pkg_ui
Pure Qt Library
```

두 라이브러리는 각각 Build와 install을 완료했고, 다른 프로젝트에서 `find_package()`를 통해 사용할 수 있는 CMake Package 구조까지 확인했다.

이번 단계에서는 이전에 만든 두 Package를 ROS 2 Application에서 실제로 사용한다.

목표는 단순히 Qt와 ROS 2를 하나의 프로그램에서 실행하는 것이 아니다.

이전에 만든 Pure CMake Package가 다른 Build 구조인 ROS 2 `ament_cmake` Application에서도 정상적으로 재사용되는지 확인한다.

전체 구조는 다음과 같다.

```text
pkg_algorithm
Pure C++ / CMake
        │
        │ install / export
        ▼
ROS 2 Application
        │
        ├── ROS 2
        │
        ├── pkg_algorithm
        │
        └── pkg_ui
              │
              ▼
            Qt UI
```

이번 실험에서 유지하는 구조는 다음과 같다.

```text
pkg_algorithm
    ↓
ROS 2를 모른다.

pkg_ui
    ↓
ROS 2를 모른다.

ROS 2와 Qt의 연결
    ↓
최종 Application 계층에서 담당한다.
```

즉 각 라이브러리에 불필요한 의존성을 추가하지 않고, 최종 Application에서 필요한 구성 요소를 연결한다.

---

## 2. 이번 실험의 전체 구조

이번 실험에서는 Pure CMake Workspace와 ROS 2 Workspace를 분리했다.

```text
Pure CMake Workspace
│
├── pkg_algorithm
│       ↓ install
│
└── pkg_ui
        ↓ install

ROS 2 Workspace
│
└── pkg_ros_app
        │
        ├── find_package(pkg_algorithm)
        │
        ├── find_package(pkg_ui)
        │
        └── ros_app
```

`pkg_algorithm`과 `pkg_ui`는 ROS 2 Workspace 내부에서 직접 Build하는 패키지가 아니다.

이전 단계에서 각각 독립적인 Pure CMake Package로 Build와 install을 완료했다.

ROS 2 Application에서는 설치된 Package를 다음과 같이 찾는다.

```cmake
find_package(pkg_algorithm REQUIRED)
find_package(pkg_ui REQUIRED)
```

그리고 export된 CMake Target을 실행 파일에 연결한다.

```cmake
target_link_libraries(
    ros_app
    pkg_algorithm::pkg_algorithm
    pkg_ui::pkg_ui
)
```

즉 ROS 2 Application이 Package의 소스 코드를 직접 포함하는 것이 아니라, install/export된 CMake Package Interface를 통해 라이브러리를 사용한다.

---

## 3. Application 계층의 역할

이번 구조에서 최종 Application은 서로 다른 시스템을 연결하는 역할을 한다.

```text
                Application
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
       Qt          ROS 2    pkg_algorithm
```

각 구성 요소의 역할은 다음과 같이 구분했다.

| 구성 요소 | 역할 |
| --- | --- |
| `pkg_algorithm` | Pure C++ 알고리즘 |
| `pkg_ui` | Qt Widgets 기반 UI |
| `MyNode` | ROS 2 Publisher, Subscriber, Callback |
| Application | Qt, ROS 2, Algorithm 연결 |

중요한 점은 각 구성 요소가 자신의 역할 외의 시스템을 직접 알 필요가 없다는 것이다.

```text
pkg_algorithm
    ↓
Pure C++

pkg_ui
    ↓
Qt UI

MyNode
    ↓
ROS 2

Application
    ↓
각 구성 요소 연결
```

즉 최종 Application이 각 시스템 사이의 연결 지점 역할을 한다.

---

## 4. ROS 2 Dependency와 Pure CMake Package 연결

이번 Application에서는 ROS 2 의존성과 이전에 만든 Pure CMake Package를 함께 사용한다.

먼저 필요한 Package를 찾는다.

```cmake
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)
find_package(pkg_algorithm REQUIRED)
find_package(pkg_ui REQUIRED)
```

여기서 ROS 2 관련 의존성과 Pure CMake Package는 연결 방식이 다르다.

### ROS 2 Package

ROS 2 관련 의존성은 `ament_target_dependencies()`를 사용했다.

```cmake
ament_target_dependencies(
    ros_app
    rclcpp
    std_msgs
)
```

### Pure CMake Package

이전에 install/export한 Pure CMake Package는 export된 Target을 직접 링크한다.

```cmake
target_link_libraries(
    ros_app
    pkg_algorithm::pkg_algorithm
    pkg_ui::pkg_ui
)
```

전체 구조를 단순화하면 다음과 같다.

```text
                    ros_app
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
ament_target_dependencies()   target_link_libraries()
         │                           │
         │                           │
         ▼                           ▼
      rclcpp                   pkg_algorithm
      std_msgs                 pkg_ui
```

즉 하나의 ROS 2 Application에서 다음 두 종류의 의존성을 함께 사용할 수 있다.

```text
ROS 2 Package
        +
Pure CMake Package
        ↓
하나의 실행 파일
```

여기서 중요한 점은 `pkg_algorithm`과 `pkg_ui`가 ROS 2 Package가 아니라는 것이다.

두 라이브러리는 일반적인 CMake Package로 install/export되어 있기 때문에 ROS 2 Application에서도 `find_package()`와 Target 링크를 통해 사용할 수 있다.

---

## 5. pkg_ui와 Qt 의존성 전달

`pkg_ui`는 Qt5 Widgets를 사용하는 Pure CMake Library다.

ROS 2 Application은 `pkg_ui`의 라이브러리 파일이나 include 경로를 직접 지정하지 않는다.

대신 export된 Target을 연결한다.

```cmake
target_link_libraries(
    ros_app
    pkg_ui::pkg_ui
)
```

`pkg_ui`는 내부적으로 Qt 관련 Target과 연결되어 있다.

따라서 최종 Application은 Qt의 라이브러리 경로나 include directory를 직접 관리하지 않고 `pkg_ui::pkg_ui` Target을 통해 필요한 의존성을 전달받는다.

개념적으로는 다음과 같다.

```text
ros_app
    │
    ▼
pkg_ui::pkg_ui
    │
    ▼
Qt 관련 의존성
```

즉 최종 Application은 라이브러리 파일의 실제 경로나 include directory를 직접 지정하는 대신 CMake Target 관계를 사용한다.

---

## 6. 최종 CMakeLists.txt

파일 위치는 다음과 같다.

```text
/home/dl/_code/vscode/ros_ws/src/pkg_ros_app/CMakeLists.txt
```

전체 코드는 다음과 같다.

```cmake
cmake_minimum_required(VERSION 3.8)
project(pkg_ros_app)

if(CMAKE_COMPILER_IS_GNUCXX OR
   CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(
    -Wall
    -Wextra
    -Wpedantic
  )
endif()

find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)
find_package(pkg_algorithm REQUIRED)
find_package(pkg_ui REQUIRED)

add_executable(
  ros_app
  src/main.cpp
)

ament_target_dependencies(
  ros_app
  rclcpp
  std_msgs
)

target_link_libraries(
  ros_app
  pkg_algorithm::pkg_algorithm
  pkg_ui::pkg_ui
)

install(
  TARGETS ros_app
  DESTINATION
  lib/${PROJECT_NAME}
)

if(BUILD_TESTING)
  find_package(
    ament_lint_auto
    REQUIRED
  )
  set(
    ament_cmake_copyright_FOUND
    TRUE
  )
  set(
    ament_cmake_cpplint_FOUND
    TRUE
  )
  ament_lint_auto_find_test_dependencies()
endif()

ament_package()
```

이 CMakeLists.txt의 핵심은 다음과 같다.

```text
ROS 2 Dependency
find_package()
        ↓
ament_target_dependencies()

Pure CMake Package
find_package()
        ↓
target_link_libraries()
```

그리고 최종적으로 모든 의존성이 `ros_app` 실행 파일에 연결된다.

---

## 7. Qt, ROS 2, Algorithm을 연결하는 Application 코드

파일 위치는 다음과 같다.

```text
/home/dl/_code/vscode/ros_ws/src/pkg_ros_app/src/main.cpp
```

이번 검증에서는 Qt에서 입력한 데이터가 ROS 2를 통해 전달되고, 알고리즘을 실행한 결과가 다시 Qt UI에 표시되는 구조를 만들었다.

전체 코드는 다음과 같다.

```cpp
#include <functional>
#include <memory>
#include <thread>
#include <QApplication>
#include <rclcpp/rclcpp.hpp>
#include <std_msgs/msg/string.hpp>
#include "pkg_algorithm/fast.h"
#include "pkg_ui/mainwindow.h"

class MyNode
    : public rclcpp::Node
{
public:
    using ResultCallback =
        std::function<void(
            const std::string&
        )>;

    MyNode()
        : Node("ros_app")
    {
        subscription_ =
            this->create_subscription<
                std_msgs::msg::String
            >(
                "input",
                10,
                std::bind(
                    &MyNode::inputCallback,
                    this,
                    std::placeholders::_1
                )
            );

        result_publisher_ =
            this->create_publisher<
                std_msgs::msg::String
            >(
                "algorithm_result",
                10
            );

        input_publisher_ =
            this->create_publisher<
                std_msgs::msg::String
            >(
                "input",
                10
            );

        result_subscription_ =
            this->create_subscription<
                std_msgs::msg::String
            >(
                "algorithm_result",
                10,
                std::bind(
                    &MyNode::resultCallback,
                    this,
                    std::placeholders::_1
                )
            );
    }

    void publishInput(
        const std::string& input
    )
    {
        std_msgs::msg::String msg;
        msg.data = input;

        input_publisher_->publish(
            msg
        );

        RCLCPP_INFO(
            this->get_logger(),
            "Published: %s",
            input.c_str()
        );
    }

    void setResultCallback(
        ResultCallback callback
    )
    {
        result_callback_ =
            std::move(callback);
    }

private:
    void inputCallback(
        const std_msgs::msg::String::SharedPtr msg
    )
    {
        RCLCPP_INFO(
            this->get_logger(),
            "Received: %s",
            msg->data.c_str()
        );

        std::string result =
            fast_.run(
                msg->data
            );

        RCLCPP_INFO(
            this->get_logger(),
            "Algorithm result: %s",
            result.c_str()
        );

        std_msgs::msg::String output_msg;
        output_msg.data =
            result;

        result_publisher_->publish(
            output_msg
        );
    }

    void resultCallback(
        const std_msgs::msg::String::SharedPtr msg
    )
    {
        RCLCPP_INFO(
            this->get_logger(),
            "Result topic received: %s",
            msg->data.c_str()
        );

        if (result_callback_)
        {
            result_callback_(
                msg->data
            );
        }
    }

    rclcpp::Subscription<
        std_msgs::msg::String
    >::SharedPtr subscription_;

    rclcpp::Publisher<
        std_msgs::msg::String
    >::SharedPtr input_publisher_;

    rclcpp::Publisher<
        std_msgs::msg::String
    >::SharedPtr result_publisher_;

    rclcpp::Subscription<
        std_msgs::msg::String
    >::SharedPtr result_subscription_;

    pkg_algorithm::Fast fast_;

    ResultCallback result_callback_;
};

int main(
    int argc,
    char * argv[]
)
{
    rclcpp::init(
        argc,
        argv
    );

    QApplication app(
        argc,
        argv
    );

    MainWindow window;

    auto node =
        std::make_shared<
            MyNode
        >();

    node->setResultCallback(
        [&window](
            const std::string& result
        )
        {
            window.setResult(
                result
            );
        }
    );

    std::thread ros_thread(
        [node]()
        {
            rclcpp::spin(
                node
            );
        }
    );

    QObject::connect(
        &window,
        &MainWindow::runRequested,
        [node](
            const std::string& input
        )
        {
            node->publishInput(
                input
            );
        }
    );

    window.show();

    int result =
        app.exec();

    rclcpp::shutdown();

    ros_thread.join();

    return result;
}
```

이번 장에서는 Qt와 ROS 2를 동시에 동작시키기 위해 두 실행 구조를 분리했다.

```text
Main Thread
    ↓
Qt Event Loop
app.exec()

ros_thread
    ↓
ROS 2 Executor
rclcpp::spin()
```

이번 장에서는 Package 통합과 전체 데이터 흐름을 검증하는 데 집중한다.

Qt Event Loop와 ROS 2 Executor가 각각 어떤 Thread에서 동작하는지, 그리고 Callback과 UI 업데이트에서 발생할 수 있는 Thread 문제는 다음 단계에서 별도로 분석할 수 있다.

---

## 8. Qt에서 ROS 2로 데이터 전달

Qt UI는 ROS 2를 직접 사용하지 않는다.

`MainWindow`는 사용자가 버튼을 클릭했을 때 Signal을 발생시킨다.

```cpp
signals:
    void runRequested(
        const std::string& input
    );
```

Application에서는 이 Signal을 ROS 2 Node와 연결한다.

```cpp
QObject::connect(
    &window,
    &MainWindow::runRequested,
    [node](
        const std::string& input
    )
    {
        node->publishInput(
            input
        );
    }
);
```

데이터 흐름은 다음과 같다.

```text
Qt UI
    │
    │ runRequested()
    ▼
Application
    │
    │ node->publishInput()
    ▼
ROS 2 Publisher
    │
    ▼
input Topic
```

여기서 `pkg_ui`는 ROS 2를 직접 알지 않는다.

Qt UI는 사용자의 입력을 Signal로 전달하고, ROS Publisher를 호출하는 것은 최종 Application이다.

---

## 9. ROS 2 Callback에서 Algorithm 실행

`MyNode`는 `input` Topic을 구독한다.

```cpp
subscription_ =
    this->create_subscription<
        std_msgs::msg::String
    >(
        "input",
        10,
        std::bind(
            &MyNode::inputCallback,
            this,
            std::placeholders::_1
        )
    );
```

메시지가 들어오면 `inputCallback()`이 호출된다.

```cpp
void inputCallback(
    const std_msgs::msg::String::SharedPtr msg
)
```

Callback 내부에서는 Pure C++ Library인 `pkg_algorithm`을 사용한다.

```cpp
std::string result =
    fast_.run(
        msg->data
    );
```

흐름은 다음과 같다.

```text
input
    │
    ▼
ROS Callback
    │
    ▼
pkg_algorithm::Fast
    │
    ▼
Result
```

`pkg_algorithm`은 자신이 ROS 2 Callback 내부에서 호출되고 있다는 사실을 알 필요가 없다.

단순히 다음 함수가 호출될 뿐이다.

```cpp
fast_.run(input)
```

즉 알고리즘 라이브러리는 ROS 2에 직접 의존하지 않고 Pure C++ Library로 유지된다.

---

## 10. Algorithm 결과를 ROS 2와 Qt UI로 전달

알고리즘 실행 결과는 `algorithm_result` Topic으로 Publish한다.

```cpp
std_msgs::msg::String output_msg;
output_msg.data =
    result;

result_publisher_->publish(
    output_msg
);
```

따라서 ROS 2 내부에서는 다음과 같은 흐름이 만들어진다.

```text
input
    │
    ▼
inputCallback()
    │
    ▼
pkg_algorithm::Fast
    │
    ▼
result
    │
    ▼
algorithm_result
```

`MyNode`는 `MainWindow`를 직접 사용하지 않는다.

대신 일반 C++ Callback을 사용한다.

```cpp
using ResultCallback =
    std::function<void(
        const std::string&
    )>;
```

Application에서는 결과를 처리할 함수를 등록한다.

```cpp
node->setResultCallback(
    [&window](
        const std::string& result
    )
    {
        window.setResult(
            result
        );
    }
);
```

ROS 결과 Topic을 받으면 다음 Callback이 실행된다.

```cpp
if (result_callback_)
{
    result_callback_(
        msg->data
    );
}
```

최종 데이터 흐름은 다음과 같다.

```text
Qt UI
    │
    │ runRequested("123")
    ▼
Application
    │
    │ publishInput()
    ▼
ROS 2
    │
    │ input
    ▼
inputCallback()
    │
    ▼
pkg_algorithm::Fast
    │
    ▼
algorithm_result
    │
    ▼
resultCallback()
    │
    ▼
ResultCallback
    │
    ▼
Application에서 등록한 Lambda
    │
    │ window.setResult()
    ▼
Qt UI
```

즉 `MyNode`는 Qt UI의 구조를 직접 알 필요가 없다.

```text
MyNode
    ↓
MainWindow를 직접 모른다.
Qt Signal을 직접 사용하지 않는다.
Qt UI 구조에 직접 의존하지 않는다.
```

ROS Node는 결과 데이터를 일반 C++ Callback으로 전달하고, 실제 Qt UI와의 연결은 Application에서 결정한다.

---

## 11. Build 환경과 CMAKE_PREFIX_PATH

이전 Build 결과의 영향을 제거하기 위해 ROS 2 Workspace를 초기화했다.

```bash
cd /home/dl/_code/vscode/ros_ws
rm -rf build install log
```

이후 ROS 2 환경을 다시 설정했다.

```bash
source /opt/ros/humble/setup.bash
```

ROS 2 Workspace 외부에 설치된 Pure CMake Package를 찾기 위해 `CMAKE_PREFIX_PATH`를 설정했다.

```bash
export CMAKE_PREFIX_PATH="/home/dl/_code/vscode/test1/install/pkg_algorithm:/home/dl/_code/vscode/test1/install/pkg_ui"
```

이 경로를 통해 CMake는 다음 Package를 찾을 수 있다.

```cmake
find_package(pkg_algorithm REQUIRED)
find_package(pkg_ui REQUIRED)
```

즉 이전 단계에서 install/export한 Package가 ROS 2 Workspace 외부에 존재하더라도 CMake Package 경로를 통해 사용할 수 있다.

---

## 12. Build

ROS 2 Package는 `colcon`을 사용하여 Build했다.

```bash
cd /home/dl/_code/vscode/ros_ws
colcon build --packages-select pkg_ros_app
```

Build가 성공하면 ROS 2 Workspace의 `install` 영역에 실행 파일이 설치된다.

이후 Workspace 환경을 적용한다.

```bash
source install/setup.bash
```

---

## 13. 실행 결과

다음 명령으로 Application을 실행했다.

```bash
ros2 run pkg_ros_app ros_app
```

Qt GUI가 정상적으로 실행되었다.

입력창에 다음 값을 입력했다.

```text
123
```

버튼을 클릭했을 때 다음 로그가 출력되었다.

```text
[INFO] [1787923746.099856700] [ros_app]: Published: 123
[INFO] [1787923746.100267237] [ros_app]: Received: 123
[INFO] [1787923746.100377254] [ros_app]: Algorithm result: Fast result: 123
[INFO] [1787923746.100525624] [ros_app]: Result topic received: Fast result: 123
```

Qt UI에서도 다음 결과가 정상적으로 표시되었다.

```text
Fast result: 123
```

따라서 실제 실행 과정에서 다음 전체 흐름을 확인했다.

```text
Qt Input
    ↓
123
    ↓
Qt Signal
    ↓
Application
    ↓
ROS Publisher
Published: 123
    ↓
ROS Subscriber
Received: 123
    ↓
pkg_algorithm::Fast
Algorithm result: Fast result: 123
    ↓
ROS Publisher
    ↓
ROS Subscriber
Result topic received: Fast result: 123
    ↓
Application Callback
    ↓
Qt UI
Fast result: 123
```

즉 이번 실험에서는 단순히 CMake Package가 Build 단계에서 연결되는 것만 확인한 것이 아니다.

실제 실행 과정에서 다음 데이터 흐름까지 확인했다.

```text
Qt
↓
ROS 2
↓
Pure C++ Algorithm
↓
ROS 2
↓
Qt
```

---

## 14. 이번 실험에서 확인한 핵심

### 1. Pure CMake Package는 ROS 2 Application에서도 사용할 수 있다

`pkg_algorithm`과 `pkg_ui`는 ROS 2 Package가 아니다.

하지만 CMake Package로 정상적으로 install/export되어 있다면 다음과 같이 사용할 수 있다.

```cmake
find_package(pkg_algorithm REQUIRED)
find_package(pkg_ui REQUIRED)
```

그리고 export된 Target을 연결한다.

```cmake
target_link_libraries(
    ros_app
    pkg_algorithm::pkg_algorithm
    pkg_ui::pkg_ui
)
```

즉 Package 자체가 어떤 Framework에서 만들어졌는지보다 다른 프로젝트에서 사용할 수 있도록 CMake Package Interface가 구성되어 있는지가 중요하다.

---

### 2. ROS 2 Dependency와 Pure CMake Package를 함께 사용할 수 있다

ROS 2 관련 의존성은 다음과 같이 처리했다.

```cmake
ament_target_dependencies(
    ros_app
    rclcpp
    std_msgs
)
```

Pure CMake Package는 다음과 같이 연결했다.

```cmake
target_link_libraries(
    ros_app
    pkg_algorithm::pkg_algorithm
    pkg_ui::pkg_ui
)
```

즉 하나의 실행 파일에서 다음 두 구조를 함께 사용할 수 있다.

```text
ROS 2 Package
        ↓
ament_target_dependencies()

Pure CMake Package
        ↓
target_link_libraries()

        ↓
      ros_app
```

---

### 3. Application 계층에서 서로 다른 시스템을 연결할 수 있다

이번 구조에서는 다음 세 가지 구성 요소가 연결된다.

```text
Qt
ROS 2
Pure C++ Algorithm
```

하지만 각각의 라이브러리가 서로를 직접 의존할 필요는 없다.

```text
pkg_algorithm
    ↓
Pure C++

pkg_ui
    ↓
Qt

MyNode
    ↓
ROS 2

Application
    ↓
각 구성 요소 연결
```

즉 최종 Application이 각 시스템 사이의 통합 지점 역할을 한다.

---

### 4. 실제 데이터 흐름까지 검증했다

이번 실험에서는 단순히 Build 성공만 확인하지 않았다.

실제로 다음 흐름이 정상적으로 동작하는 것을 확인했다.

```text
Qt Input
↓
Qt Signal
↓
ROS 2 Publish
↓
ROS 2 Subscribe
↓
Pure C++ Algorithm
↓
ROS 2 Result Topic
↓
Application Callback
↓
Qt UI
```

따라서 CMake Package 연결과 실제 Application 실행 흐름을 함께 검증했다.

---
## 15. 지금까지의 CMake 학습 흐름과 마무리

지금까지의 실험을 CMake 관점에서 정리하면 다음과 같다.

```text
Source Code
    ↓
CMake Target
    ↓
Library 생성
    ↓
install()
    ↓
export / Config
    ↓
find_package()
    ↓
다른 Project에서 재사용
    ↓
ROS 2 Application과 통합
```

현재까지 만든 전체 구조는 다음과 같다.

```text
                Pure CMake
        ┌─────────────────────┐
        │                     │
        ▼                     ▼
pkg_algorithm              pkg_ui
Pure C++                   Pure Qt
        │                     │
        │ install/export      │ install/export
        │                     │
        └──────────┬──────────┘
                   │
                   ▼
             find_package()
                   │
                   ▼
        ┌──────────────────┐
        │                  │
        │    ROS 2 App     │
        │                  │
        │   ament_cmake    │
        │   rclcpp         │
        │   std_msgs       │
        │                  │
        └────────┬─────────┘
                 │
                 ▼
               ros_app
```

이번 장에서는 이전 단계에서 만든 Pure CMake Package를 ROS 2 Application에서 실제로 재사용하고, Qt와 ROS 2, Pure C++ Algorithm을 하나의 최종 Application으로 연결했다.

이를 통해 지금까지 학습한 CMake의 핵심 흐름을 하나의 구조로 연결해 확인했다.

```text
Source Code
    ↓
CMake Target
    ↓
Library 생성
    ↓
target_include_directories()
    ↓
target_link_libraries()
    ↓
install()
    ↓
export()
    ↓
CMake Package 생성
    ↓
find_package()
    ↓
다른 Project에서 재사용
    ↓
Qt Application 연결
    ↓
ROS 2 Application 연결
```

처음에는 하나의 C++ Source를 Build하는 기본적인 CMake 구조에서 시작했다.

이후 CMake Target을 중심으로 Source와 Header, Library Dependency를 관리하는 구조를 확인했다.

```text
Source Code
    ↓
add_library()
    ↓
CMake Target
    ↓
target_include_directories()
    ↓
target_link_libraries()
```

그 다음에는 생성한 Library를 다른 Project에서도 사용할 수 있도록 install 구조를 구성했다.

```text
Library
    ↓
install()
    ↓
Header 설치
Library 설치
    ↓
export()
    ↓
Config.cmake
    ↓
CMake Package
```

이후 다른 Project에서는 직접 Library 파일이나 Include 경로를 지정하지 않고 다음과 같이 Package를 사용할 수 있음을 확인했다.

```cmake
find_package(pkg_algorithm REQUIRED)
target_link_libraries(
    app
    PRIVATE
        pkg_algorithm::pkg_algorithm
)
```

같은 방식으로 Pure C++ Library뿐만 아니라 Qt를 사용하는 `pkg_ui`도 독립적인 CMake Package로 구성했다.

```text
pkg_ui
    ↓
Pure Qt Library
    ↓
install / export
    ↓
pkg_ui::pkg_ui
```

그리고 최종적으로 두 Pure CMake Package를 ROS 2 Application에서 함께 사용했다.

```text
pkg_algorithm
Pure C++
        │
        │ install / export
        ▼
pkg_algorithm::pkg_algorithm
        │
        ├───────────────┐
        │               │
        ▼               ▼
     ROS 2 App       pkg_ui
                     Pure Qt
                         │
                         │ install / export
                         ▼
                    pkg_ui::pkg_ui
```

ROS 2 Application에서는 ROS 2 Dependency와 Pure CMake Package를 각각의 방식으로 연결했다.

```cmake
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)
```

ROS 2 Dependency는 다음과 같이 연결했다.

```cmake
ament_target_dependencies(
    ros_app
    rclcpp
    std_msgs
)
```

반면 Pure CMake Package는 export된 Target을 직접 연결했다.

```cmake
find_package(pkg_algorithm REQUIRED)
find_package(pkg_ui REQUIRED)
target_link_libraries(
    ros_app
    pkg_algorithm::pkg_algorithm
    pkg_ui::pkg_ui
)
```

최종적으로 하나의 Application에서 다음 구조가 실제로 동작하는 것을 확인했다.

```text
Pure C++ Library
        +
Pure Qt Library
        +
ROS 2
        ↓
ROS 2 Application
        ↓
Qt UI
```

또한 Build 구조뿐만 아니라 실제 실행 과정에서도 각 구성 요소가 연결되는 것을 확인했다.

```text
Qt UI
    ↓
Qt Signal
    ↓
Application
    ↓
ROS 2 Publisher
    ↓
ROS 2 Subscriber
    ↓
Pure C++ Algorithm
    ↓
ROS 2 Result Topic
    ↓
Application Callback
    ↓
Qt UI
```

이번 CMake 학습에서 확인한 핵심은 다음과 같다.

```text
CMake는 단순히 Source Code를 Compile하는 도구가 아니다.
```

CMake에서는 Source Code와 Library를 Target으로 구성하고, Target 간의 Dependency를 연결한다.

```text
Source
    ↓
Target
    ↓
Dependency
    ↓
Library
    ↓
install
    ↓
export
    ↓
Package
    ↓
find_package
    ↓
재사용
```

또한 CMake Package로 구성된 Library는 특정 Application 구조에 묶일 필요가 없다.

```text
pkg_algorithm
        ↓
Pure C++ Library
```

는 일반 C++ Application에서도 사용할 수 있고,

```text
Pure C++ Application
        ↓
pkg_algorithm
```

Qt Application에서도 사용할 수 있으며,

```text
Qt Application
        ↓
pkg_algorithm
```

ROS 2 Application에서도 사용할 수 있다.

```text
ROS 2 Application
        ↓
pkg_algorithm
```

중요한 점은 Library 자체가 특정 Framework에 불필요하게 의존하지 않고, 필요한 최종 Application에서 각 구성 요소를 연결할 수 있다는 것이다.

현재까지 학습한 전체 구조를 정리하면 다음과 같다.

```text
                    ┌───────────────────┐
                    │   pkg_algorithm   │
                    │                   │
                    │     Pure C++      │
                    └─────────┬─────────┘
                              │
                              │ install / export
                              ▼
                    pkg_algorithm::pkg_algorithm
                              │
                              │
                              ▼
                    ┌───────────────────┐
                    │                   │
                    │      ros_app      │
                    │                   │
                    │    ROS 2 App      │
                    │                   │
                    └─────────┬─────────┘
                              ▲
                              │
                              │
                    pkg_ui::pkg_ui
                              ▲
                              │
                              │ install / export
                              │
                    ┌─────────┴─────────┐
                    │      pkg_ui       │
                    │                   │
                    │      Pure Qt      │
                    └───────────────────┘
```

이번 장까지의 실습을 통해 다음 흐름을 실제 코드와 Build 결과를 통해 확인했다.

```text
Pure C++ Source
    ↓
CMake Target
    ↓
Static Library
    ↓
install()
    ↓
export / Config
    ↓
find_package()
    ↓
다른 Project에서 재사용
```

그리고 이 구조를 확장하여 다음까지 연결했다.

```text
Pure C++ Library
        +
Pure Qt Library
        ↓
CMake Package
        ↓
find_package()
        ↓
ROS 2 Application
        ↓
ament_cmake
        +
rclcpp
        +
std_msgs
        ↓
최종 Application
```

따라서 이번 장을 마지막으로 현재 진행한 **CMake 학습은 마무리한다.**

이번 학습에서는 단순한 CMake 문법을 개별적으로 확인하는 것에서 끝나지 않고, 실제 프로젝트 구조를 기준으로 다음 과정을 단계적으로 확인했다.

```text
CMake 기본 구조
    ↓
CMake Target
    ↓
Library
    ↓
Dependency 관리
    ↓
install()
    ↓
export()
    ↓
CMake Package
    ↓
find_package()
    ↓
다른 Project에서 재사용
    ↓
Qt Library 통합
    ↓
ROS 2 Application 통합
```

결과적으로 현재 구조에서는 각 구성 요소가 자신의 역할을 유지한다.

```text
pkg_algorithm
    ↓
Pure C++ Algorithm
```

```text
pkg_ui
    ↓
Qt UI
```

```text
pkg_ros_app
    ↓
ROS 2
```

그리고 최종 Application에서 필요한 구성 요소를 연결한다.

```text
Pure C++
    +
Qt
    +
ROS 2
    ↓
Final Application
```

이것으로 현재 목표로 진행한 CMake 학습을 마무리한다.
