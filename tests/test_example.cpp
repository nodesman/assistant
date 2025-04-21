#include <QObject>
#include <QTest>
#include "mainwindow.h" // Include the header for the class we want to test

class TestExample : public QObject
{
    Q_OBJECT // Required for test classes using QTest framework

private slots:
    // Test initialization and cleanup (optional)
    void initTestCase();    // Runs once before all tests
    void cleanupTestCase(); // Runs once after all tests
    void init();            // Runs before each test function
    void cleanup();         // Runs after each test function

    // --- Test Functions ---
    void testAddition();    // Test the add() method of MainWindow
    // void testGuiElement(); // Example placeholder for GUI tests (more complex)

private:
    MainWindow *testWindow; // Instance of the class to test
};

void TestExample::initTestCase()
{
    qDebug("Starting test suite...");
    // Can perform one-time setup here
}

void TestExample::cleanupTestCase()
{
    qDebug("Finished test suite.");
    // Can perform one-time cleanup here
}

void TestExample::init()
{
    // Create a new instance before each test function
    testWindow = new MainWindow();
}

void TestExample::cleanup()
{
    // Delete the instance after each test function
    delete testWindow;
    testWindow = nullptr;
}

void TestExample::testAddition()
{
    // Arrange
    int x = 5;
    int y = 10;
    int expected = 15;

    // Act
    int result = testWindow->add(x, y);

    // Assert
    QCOMPARE(result, expected); // Basic Qt Test comparison macro

    // Example of a failing test with a clear message
    QVERIFY2(result == expected + 1, "Addition result was not the expected incorrect value (demonstrating failure).");
    // QVERIFY2 provides a custom message on failure.
    // QCOMPARE provides automatic messages like "Compared values are not the same. Expected: 15, Actual: 16"
}

// Example of testing GUI elements (often needs more setup)
// void TestExample::testGuiElement() {
//     // You might need QApplication instance for widgets
//     // QVERIFY(testWindow->findChild<QPushButton*>("myButton"));
//     // QTest::keyClick(testWindow, Qt::Key_A);
//     // QCOMPARE(testWindow->findChild<QLineEdit*>("myLineEdit")->text(), "A");
// }


// Macro to create the main function for the test executable
QTEST_MAIN(TestExample)

// Include the MOC generated file (required due to Q_OBJECT)
// The name follows the pattern test_classname.moc
#include "test_example.moc"