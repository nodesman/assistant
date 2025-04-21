#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>

// Forward declarations
class QStackedWidget; // Use QStackedWidget for main content area
class HomeScreenWidget; // New widget for home screen
class ConversationWorkspaceWidget; // New widget for conversation tabs/tree
class SettingsManager; // Forward declare SettingsManager
struct Conversation;   // Forward declare Conversation struct
class QListWidgetItem;
class QUuid; // Use QUuid directly
class QAction; // For menu actions


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

    // int add(int a, int b); // Remove example method

private slots:
    void loadInitialData(); // Renamed for clarity
    void handleNewConversationRequested(); // Slot for signal from HomeScreenWidget
    void handleConversationSelected(const QUuid& conversationId, const QString& title); // Slot for signal from HomeScreenWidget
    void newConversation();
    void showSettingsDialog(); // Placeholder
    void checkForUpdates(); // Placeholder
    void showAboutDialog(); // Placeholder

    // Page Switching
    void switchToHomeScreen();
    void switchToWorkspace();
    void updateActionsForCurrentPage(); // Enable/disable actions based on active page

private:
    void setupUi();
    void createMenus();
    void createActions(); // Helper to create QAction objects

    // If using Qt Designer UI file later:
    // Ui::MainWindow *ui;

    SettingsManager *m_settingsManager;
    QStackedWidget *m_stackedWidget;
    HomeScreenWidget *m_homeScreenWidget;
    ConversationWorkspaceWidget *m_conversationWorkspaceWidget;
    // QLineEdit *m_promptInput; // Add later
    // QPushButton *m_sendButton; // Add later

    // Actions (for enabling/disabling etc.)
    QAction *m_newConversationAction;
    QAction *m_exitAction;
    QAction *m_goHomeAction;
    QAction *m_renameConversationAction; // Placeholder
    QAction *m_forkConversationAction; // Placeholder
    QAction *m_deleteConversationAction; // Placeholder
    QAction *m_preferencesAction;
    QAction *m_checkForUpdatesAction;
    QAction *m_aboutAction;
};

#endif // MAINWINDOW_H