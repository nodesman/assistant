#include <QApplication>
#include "mainwindow.h"

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);

    MainWindow mainWindow;
    mainWindow.setWindowTitle("My Basic Qt App");
    mainWindow.resize(400, 300); // Optional: Set a default size
    mainWindow.show();

    return app.exec();
}