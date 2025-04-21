# Define the test executable
add_executable(UnitTests
    test_example.cpp
    # Add more test files here as needed
)

# Link Qt Test library
target_link_libraries(UnitTests PRIVATE Qt6::Test)

# --- Linking Application Code for Testing ---
# Option 1: If you make application code a library (recommended for larger projects)
# target_link_libraries(UnitTests PRIVATE YourAppLibrary)

# Option 2: Link specific source files (simpler for small projects)
# Include header files from src
target_include_directories(UnitTests PRIVATE ${CMAKE_SOURCE_DIR}/src)
# Link implementation files needed for tests directly
# Be careful with main.cpp - don't link it here!
target_link_libraries(UnitTests PRIVATE ${CMAKE_SOURCE_DIR}/src/mainwindow.cpp) # Link implementation

# If mainwindow.cpp includes headers that require MOC, AUTOUIC, AUTORCC, enable them
# set_target_properties(UnitTests PROPERTIES AUTOMOC ON AUTOUIC ON AUTORCC ON)
# In this simple case, it might not be needed yet, but good practice.
# Simpler: Just link against the main executable's sources if not made into a library.
# target_link_libraries(UnitTests PRIVATE ${PROJECT_NAME}) # Be cautious with this approach


# For Qt classes used within the tested code (like QMainWindow in mainwindow.h/cpp)
# We need to link the corresponding Qt modules as well.
target_link_libraries(UnitTests PRIVATE Qt6::Core Qt6::Gui Qt6::Widgets)

# Enable MOC for test files if they use Q_OBJECT etc.
set_target_properties(UnitTests PROPERTIES AUTOMOC ON)