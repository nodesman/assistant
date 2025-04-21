#include "mainwindow.h"
#include "settingsmanager.h" // Include the settings manager
#include "datamodels.h"      // Include our data models

#include <QtWidgets> // Include necessary Qt Widgets headers
#include <QStackedWidget> // For switching between main views
#include <QMenuBar>      // For menus
#include <QStatusBar>    // For status bar
#include <QMessageBox>
#include <QUuid>
#include <QDebug> // For logging

#include "homescreenwidget.h" // Include the home screen widget header
#include "conversationworkspacewidget.h" // Include the conversation workspace widget header
#include "settingsdialog.h" // Include the settings dialog header


MainWindow::MainWindow(QWidget *parent) :
    QMainWindow(parent)
    //, ui(new Ui::MainWindow) // If using UI file later
{
    m_settingsManager = new SettingsManager(this); // Create instance first

    setupUi(); // Creates stacked widget and pages
    createMenus(); // Creates actions and menus

    // Load settings as soon as possible
    if (!m_settingsManager->loadSettings()) {
        QMessageBox::warning(this, "Settings Error", "Could not load application settings. Defaults will be used, but saving may fail.");
        // Consider disabling save actions or providing more robust error handling
    }

    // Use QTimer::singleShot to allow the event loop to start before loading data
    QTimer::singleShot(0, this, &MainWindow::loadInitialData);

    // Connect signals from page widgets to MainWindow slots
    connect(m_homeScreenWidget, &HomeScreenWidget::newConversationRequested,
            this, &MainWindow::handleNewConversationRequested);
    connect(m_homeScreenWidget, &HomeScreenWidget::conversationSelected,
            this, &MainWindow::handleConversationSelected);
    connect(m_conversationWorkspaceWidget, &ConversationWorkspaceWidget::goHomeRequested,
            this, &MainWindow::switchToHomeScreen);

    // Connect stacked widget page change to update actions
    connect(m_stackedWidget, &QStackedWidget::currentChanged, this, &MainWindow::updateActionsForCurrentPage);

    // Initial state
    switchToHomeScreen(); // Start on the home screen
    statusBar()->showMessage("Ready");
    resize(1000, 700); // Set a reasonable default size
}


MainWindow::~MainWindow()
{
    // If using UI file later:
    // delete ui;

    // Settings manager is automatically deleted due to parent=this
    // Page widgets are owned by m_stackedWidget which is owned by MainWindow
}

// --- Setup ---


void MainWindow::setupUi() {
    // Create the main stacked widget
    m_stackedWidget = new QStackedWidget(this);
    setCentralWidget(m_stackedWidget);

    // Create the page widgets (passing the SettingsManager)
    // Pass m_stackedWidget as parent so they are owned by the stack
    m_homeScreenWidget = new HomeScreenWidget(m_settingsManager, m_stackedWidget);
    m_conversationWorkspaceWidget = new ConversationWorkspaceWidget(m_settingsManager, m_stackedWidget);

    // Add pages to the stacked widget
    m_stackedWidget->addWidget(m_homeScreenWidget);
    m_stackedWidget->addWidget(m_conversationWorkspaceWidget);
}

void MainWindow::createActions() {
    // File Actions
    m_newConversationAction = new QAction(tr("&New Conversation..."), this);
    m_newConversationAction->setShortcut(QKeySequence::New);
    connect(m_newConversationAction, &QAction::triggered, this, &MainWindow::handleNewConversationRequested);

    m_exitAction = new QAction(tr("E&xit"), this);
    m_exitAction->setShortcut(QKeySequence::Quit);
    connect(m_exitAction, &QAction::triggered, this, &QWidget::close);

    // Edit Actions (Standard - can be connected later if needed)
    // QAction *cutAction = new QAction(tr("Cu&t"), this); cutAction->setShortcut(QKeySequence::Cut);
    // QAction *copyAction = new QAction(tr("&Copy"), this); copyAction->setShortcut(QKeySequence::Copy);
    // QAction *pasteAction = new QAction(tr("&Paste"), this); pasteAction->setShortcut(QKeySequence::Paste);

    // View Actions
    m_goHomeAction = new QAction(tr("&Go Home"), this);
    connect(m_goHomeAction, &QAction::triggered, this, &MainWindow::switchToHomeScreen);

    // Conversation Actions (Placeholders - connect later)
    m_renameConversationAction = new QAction(tr("&Rename Conversation..."), this);
    m_forkConversationAction = new QAction(tr("&Fork Conversation..."), this);
    m_deleteConversationAction = new QAction(tr("&Delete Conversation..."), this);
    // m_renameConversationAction->setEnabled(false); // Disable initially
    // m_forkConversationAction->setEnabled(false);
    // m_deleteConversationAction->setEnabled(false);

    // Settings Action
    m_preferencesAction = new QAction(tr("&Preferences..."), this);
    m_preferencesAction->setShortcut(QKeySequence::Preferences);
    connect(m_preferencesAction, &QAction::triggered, this, &MainWindow::showSettingsDialog);

    // Help Actions
    m_checkForUpdatesAction = new QAction(tr("Check for &Updates..."), this);
    connect(m_checkForUpdatesAction, &QAction::triggered, this, &MainWindow::checkForUpdates);
    m_aboutAction = new QAction(tr("&About..."), this);
    connect(m_aboutAction, &QAction::triggered, this, &MainWindow::showAboutDialog);

}

void MainWindow::createMenus() {
    createActions(); // Create the action objects first

    // File Menu
    QMenu *fileMenu = menuBar()->addMenu(tr("&File"));
    fileMenu->addAction(m_newConversationAction);
    fileMenu->addSeparator();
    fileMenu->addAction(m_exitAction);

    // Edit Menu (placeholder)
    QMenu *editMenu = menuBar()->addMenu(tr("&Edit"));
    // Add cut/copy/paste later

    // View Menu
    QMenu *viewMenu = menuBar()->addMenu(tr("&View"));
    viewMenu->addAction(m_goHomeAction);
    // Add full screen, zoom actions later

    // Conversation Menu
    QMenu *conversationMenu = menuBar()->addMenu(tr("&Conversation"));
    conversationMenu->addAction(m_renameConversationAction);
    conversationMenu->addAction(m_forkConversationAction);
    conversationMenu->addSeparator();
    // Add export action later
    conversationMenu->addAction(m_deleteConversationAction);

    // Settings Menu (placeholder)
    QMenu *settingsMenu = menuBar()->addMenu(tr("&Settings"));
    settingsMenu->addAction(m_preferencesAction);

    // Help Menu (placeholder)
    QMenu *helpMenu = menuBar()->addMenu(tr("&Help"));
    helpMenu->addAction(m_checkForUpdatesAction);
    helpMenu->addSeparator();
    helpMenu->addAction(m_aboutAction);
}

// --- Data Loading ---

void MainWindow::loadInitialData() {
    // Load settings (already done in constructor, ensure it succeeded)
    if (!m_settingsManager) return; // Should not happen

    // Load the conversation list metadata into memory
    if (!m_settingsManager->loadConversations()) {
        qWarning() << "Failed to load conversations.";
        // Handle error appropriately
    }

    // Tell the HomeScreenWidget to populate its list display
    m_homeScreenWidget->populateConversationList();
}

// --- Conversation Handling Slots ---

void MainWindow::handleNewConversationRequested() {
     qInfo() << "Main window handling new conversation request...";
     newConversation(); // Call the internal method to create and save
}

void MainWindow::handleConversationSelected(const QUuid& conversationId, const QString& title) {
    if (conversationId.isNull()) {
        qWarning() << "Cannot open null conversation ID";
        return;
    }
    qInfo() << "Main window opening conversation:" << conversationId << title;
    // Tell the workspace widget to open this conversation
    m_conversationWorkspaceWidget->openConversation(conversationId, title);
    // Switch the view
    switchToWorkspace();
}

void MainWindow::newConversation() {
    qInfo() << "Creating new conversation (internal)...";
    Conversation newConv;
    newConv.title = "New Conversation"; // Default title
    newConv.createdAt = QDateTime::currentDateTimeUtc();
    newConv.lastModifiedAt = newConv.createdAt;
    // Add a default first message? Maybe not needed yet.

    // Update SettingsManager state *before* saving
    m_settingsManager->updateConversationCache(newConv); // Add to in-memory map
    m_settingsManager->getSettings().conversationOrder.prepend(newConv.id); // Add to top of order

    // Save the new conversation file
    if (!m_settingsManager->saveConversation(newConv)) {
        QMessageBox::warning(this, "Error", "Could not save the new conversation file.");
        // Need to remove from order list if save fails?
        m_settingsManager->getSettings().conversationOrder.removeOne(newConv.id); // Remove if save failed
        m_settingsManager->updateConversationCache(Conversation()); // Invalidate cache entry? Or handle removal differently
        return;
    } else {
        // Save the updated settings only if conversation save succeeded
        m_settingsManager->saveSettings();

        // If currently on home screen, update its list immediately
        if (m_stackedWidget->currentWidget() == m_homeScreenWidget) {
            m_homeScreenWidget->populateConversationList();
        }

        // Automatically open the new conversation
        handleConversationSelected(newConv.id, newConv.title);
    }
}

// --- Placeholder Slots ---

void MainWindow::showSettingsDialog() {
    SettingsDialog dialog(this); // 'this' makes MainWindow the parent
    // TODO: Load current settings into the dialog widgets before showing
    // dialog.loadSettings(m_settingsManager->getSettings()); // Example signature

    if (dialog.exec() == QDialog::Accepted) {
        // OK button clicked
        qDebug() << "Settings accepted";
        // TODO: Retrieve settings from dialog widgets and apply/save them
        // AppSettings updatedSettings = dialog.getSettings(); // Example signature
        // m_settingsManager->getSettings() = updatedSettings; // Example
        // m_settingsManager->saveSettings();
    } else {
        // Cancel button clicked or dialog closed
        qDebug() << "Settings cancelled";
    }
}

void MainWindow::checkForUpdates() {
    QMessageBox::information(this, "Updates", "Update checking not implemented yet.");
}

void MainWindow::showAboutDialog() {
     QMessageBox::about(this, tr("About My AI Client"),
                        tr("A unified interface for interacting with various AI models.\n"
                           "Version 0.1.0")); // Replace with actual version later
}

// --- Page Switching Logic ---

void MainWindow::switchToHomeScreen() {
    if (m_stackedWidget->currentWidget() != m_homeScreenWidget) {
        m_stackedWidget->setCurrentWidget(m_homeScreenWidget);
        // Optionally refresh the list when returning home
        m_homeScreenWidget->populateConversationList();
        qInfo() << "Switched to Home Screen";
    }
}

void MainWindow::switchToWorkspace() {
     if (m_stackedWidget->currentWidget() != m_conversationWorkspaceWidget) {
        m_stackedWidget->setCurrentWidget(m_conversationWorkspaceWidget);
        qInfo() << "Switched to Conversation Workspace";
    }
}

void MainWindow::updateActionsForCurrentPage() {
    bool isWorkspaceVisible = (m_stackedWidget->currentWidget() == m_conversationWorkspaceWidget);

    // Enable "Go Home" only when NOT on the home screen
    m_goHomeAction->setEnabled(isWorkspaceVisible);

    // Enable conversation-specific actions only when in the workspace
    m_renameConversationAction->setEnabled(isWorkspaceVisible);
    m_forkConversationAction->setEnabled(isWorkspaceVisible);
    m_deleteConversationAction->setEnabled(isWorkspaceVisible);

    // You might add further logic here, e.g., disable fork if no message is selected in the tree view
}