# MyQtApp

A basic Qt application built with CMake.

## Building

This project uses CMake and Qt. You can build it using CLion's build functionality or via the command line.

**Command Line Build:**

1.  **Configure (Create build directory and generate build files):**
    ```bash
    # For a Debug build (most common for development)
    cmake -B cmake-build-debug -S . -DCMAKE_BUILD_TYPE=Debug

    # For a Release build (optimized for performance)
    # cmake -B cmake-build-release -S . -DCMAKE_BUILD_TYPE=Release
    ```

2.  **Build (Compile the project):**
    ```bash
    # Build the Debug configuration
    cmake --build cmake-build-debug

    # Build the Release configuration
    # cmake --build cmake-build-release
    ```

The main application executable (`MyQtApp`) and the test executable (`UnitTests`) will be placed in the corresponding build directory (e.g., `cmake-build-debug/src/MyQtApp` and `cmake-build-debug/tests/UnitTests`).

## Running the Application

*   **From CLion:** Select the `MyQtApp` run configuration and click the 'Run' button.
*   **From Command Line:**
    ```bash
    ./cmake-build-debug/src/MyQtApp
    ```

## Running Tests

Tests are run using CTest, which is CMake's testing tool.

*   **Using CLion:**
    1.  Select the `All CTest` run configuration from the dropdown menu near the top-right.
    2.  Click the green 'Run' button (the triangle). Results will appear in the 'Test Runner' panel.
    3.  Alternatively, open a test file (e.g., `tests/test_example.cpp`) and click the run icons (green triangles) in the gutter next to the test class or individual test functions.

*   **Using Command Line:**
    1.  Navigate to your build directory:
        ```bash
        cd cmake-build-debug
        ```
    2.  Run CTest:
        ```bash
        # Run all tests defined in CMakeLists.txt
        ctest

        # Run with verbose output (shows PASS/FAIL details for each test function)
        ctest -V

        # Run specific tests matching a name pattern (useful if you have many tests)
        # For example, run only tests with "Addition" in their name:
        # ctest -R Addition
        ```