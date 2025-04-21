#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>

// Forward declaration if using UI file later
// namespace Ui {
// class MainWindow;
// }

class MainWindow : public QMainWindow
{
    Q_OBJECT // Required for classes with signals/slots

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

    // Example method we might want to test later
    int add(int a, int b);

private:
    // If using Qt Designer UI file later:
    // Ui::MainWindow *ui;
};

#endif // MAINWINDOW_H