cmake_minimum_required(VERSION 3.16)
project(MyQtApp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# --- Qt Configuration ---
# Provide the path to your Qt installation
set(QT_INSTALL_PATH "/Users/rajsekharan/Qt/6.5.3/macos" CACHE PATH "Path to Qt installation")
set(CMAKE_PREFIX_PATH ${QT_INSTALL_PATH} ${CMAKE_PREFIX_PATH})

# Find required Qt packages
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Test)

# --- Project Subdirectories ---
add_subdirectory(src)
add_subdirectory(tests)

# --- Testing Setup ---
enable_testing()

# Add the test executable defined in tests/CMakeLists.txt as a test case
# The name "UnitTests" here must match the target name in tests/CMakeLists.txt
# The second "UnitTests" is the name CTest will use for this test suite.
add_test(NAME UnitTests COMMAND UnitTests)

# Optional: Ensure tests run after the main application is built (if tests depend on it)
# In this simple setup, they are independent, but this can be useful later.
# add_dependencies(UnitTests ${PROJECT_NAME})