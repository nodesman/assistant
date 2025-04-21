# tests/CMakeLists.txt

# Define the test executable
add_executable(UnitTests
    test_example.cpp
    # Add source files needed for testing (data models, core logic, potentially UI classes under test)
    ${CMAKE_SOURCE_DIR}/src/datamodels.cpp
    ${CMAKE_SOURCE_DIR}/src/settingsmanager.cpp
    ${CMAKE_SOURCE_DIR}/src/mainwindow.cpp # Keep for now, test_example includes mainwindow.h
    # Add homescreenwidget.cpp, conversationworkspacewidget.cpp, settingsdialog.cpp etc. if tests directly use or depend on them
    # Add more test files here as needed
)

# Include header files from src
target_include_directories(UnitTests PRIVATE ${CMAKE_SOURCE_DIR}/src)

# Link necessary Qt libraries
# Linking Qt6::Widgets transitively includes Qt6::Gui and Qt6::Core
# Qt6::Test is needed for QTest framework
target_link_libraries(UnitTests PRIVATE
    Qt6::Test
    Qt6::Widgets # Needed because mainwindow.h includes QMainWindow, and potentially other widgets used indirectly
)

# Enable AUTOMOC because mainwindow.h uses Q_OBJECT (via mainwindow.cpp)
# and test_example.cpp uses Q_OBJECT. Also needed if other tested classes use Q_OBJECT.
set_target_properties(UnitTests PROPERTIES AUTOMOC ON)