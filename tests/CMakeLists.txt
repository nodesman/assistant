# tests/CMakeLists.txt

# Define the test executable
add_executable(UnitTests
    test_example.cpp
    ${CMAKE_SOURCE_DIR}/src/mainwindow.cpp # Add source file directly
    # Add more test files here as needed
)

# Include header files from src
target_include_directories(UnitTests PRIVATE ${CMAKE_SOURCE_DIR}/src)

# Link necessary Qt libraries
# Linking Qt6::Widgets transitively includes Qt6::Gui and Qt6::Core
target_link_libraries(UnitTests PRIVATE
    Qt6::Test
    Qt6::Widgets
)

# Enable AUTOMOC because mainwindow.h uses Q_OBJECT (via mainwindow.cpp)
# and test_example.cpp uses Q_OBJECT.
set_target_properties(UnitTests PROPERTIES AUTOMOC ON)