# Define the main application executable
add_executable(${PROJECT_NAME}
    main.cpp
    mainwindow.cpp
    datamodels.cpp
    settingsmanager.cpp
    homescreenwidget.cpp
    conversationworkspacewidget.cpp
    settingsdialog.cpp
    # Do NOT list header files (.h) here
)

# Link Qt libraries to the application
# Linking Widgets transitively includes Gui and Core
target_link_libraries(${PROJECT_NAME} PRIVATE
    Qt6::Widgets
)

# Include current directory for local headers (like mainwindow.h)
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Note: CMAKE_AUTOMOC, AUTOUIC, AUTORCC are typically set globally in the root CMakeLists.txt
# If they weren't, you'd add:
# set_target_properties(${PROJECT_NAME} PROPERTIES AUTOMOC ON AUTOUIC ON AUTORCC ON)