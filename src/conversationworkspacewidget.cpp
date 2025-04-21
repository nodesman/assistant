#include "conversationworkspacewidget.h"
#include "settingsmanager.h"
#include "datamodels.h"
// Include the future tab content widget header here
// #include "conversationtabcontentwidget.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QTabWidget>
#include <QTreeView>
#include <QStandardItemModel>
#include <QSplitter>
#include <QPushButton>
#include <QDebug>
#include <QMessageBox>
#include <QTextEdit> // Placeholder for tab content
#include <QLineEdit> // Placeholder
#include <QHeaderView> // For tree view header sizing
#include <QStandardItem> // For tree model items

// Helper function definitions (copied/adapted from previous mainwindow.cpp)
void ConversationWorkspaceWidget::addMessageToTreeModel(
    const Message& msg,
    const QMap<QUuid, QList<Message>>& childrenMap,
    QMap<QUuid, QStandardItem*>& itemMap,
    QStandardItem* parentItem,
    QStandardItemModel* model)
{
    QStandardItem *item = new QStandardItem();
    // Set display text (customize as needed)
    item->setText(QString("[%1] %2").arg(msg.role).arg(msg.content.left(50) + (msg.content.length() > 50 ? "..." : "")));
    item->setEditable(false);
    item->setData(QVariant::fromValue(msg.id), Qt::UserRole); // Store message ID
    parentItem->appendRow(item);
    itemMap[msg.id] = item; // Store the item pointer

    // Recursively add children
    if (childrenMap.contains(msg.id)) {
        // Iterate directly over the QList associated with the key
        for (const Message& childMsg : childrenMap[msg.id]) {
            addMessageToTreeModel(childMsg, childrenMap, itemMap, item, model);
        }
    }
}


ConversationWorkspaceWidget::ConversationWorkspaceWidget(SettingsManager *settingsManager, QWidget *parent)
    : QWidget(parent), m_settingsManager(settingsManager)
{
     Q_ASSERT(m_settingsManager != nullptr);
     setupUi();
}

void ConversationWorkspaceWidget::setupUi() {
    QVBoxLayout *mainLayout = new QVBoxLayout(this);
    setLayout(mainLayout);
    mainLayout->setContentsMargins(0,0,0,0); // Use full space

    // --- Top Bar (Go Home) ---
    QHBoxLayout* topBarLayout = new QHBoxLayout();
    m_goHomeButton = new QPushButton(QIcon::fromTheme("go-home"), " Home Screen");
    connect(m_goHomeButton, &QPushButton::clicked, this, &ConversationWorkspaceWidget::onGoHomeClicked);
    topBarLayout->addWidget(m_goHomeButton);
    topBarLayout->addStretch(1); // Push button to the left
    mainLayout->addLayout(topBarLayout);


    // --- Main Splitter (Tabs | Tree) ---
    m_mainSplitter = new QSplitter(Qt::Horizontal, this);
    mainLayout->addWidget(m_mainSplitter, 1); // Give splitter stretch factor

    // Left side: Tab Widget
    m_tabWidget = new QTabWidget(m_mainSplitter);
    m_tabWidget->setObjectName("conversationTabWidget");
    m_tabWidget->setTabsClosable(true);
    m_tabWidget->setMovable(true);
    m_tabWidget->setDocumentMode(true);
    connect(m_tabWidget, &QTabWidget::tabCloseRequested, this, &ConversationWorkspaceWidget::onTabCloseRequested);
    connect(m_tabWidget, &QTabWidget::currentChanged, this, &ConversationWorkspaceWidget::onCurrentTabChanged);
    m_mainSplitter->addWidget(m_tabWidget);

    // Right side: Tree View
    QWidget* treeContainer = new QWidget(m_mainSplitter); // Container for layout
    QVBoxLayout* treeLayout = new QVBoxLayout(treeContainer);
    treeLayout->setContentsMargins(0,0,0,0);
    m_treeView = new QTreeView(treeContainer);
    m_treeModel = new QStandardItemModel(this);
    m_treeModel->setHorizontalHeaderLabels({"Message Node"});
    m_treeView->setModel(m_treeModel);
    m_treeView->header()->setSectionResizeMode(QHeaderView::ResizeToContents);
    treeLayout->addWidget(m_treeView);
    treeContainer->setLayout(treeLayout);
    m_mainSplitter->addWidget(treeContainer);

    // Set initial splitter sizes (adjust as needed)
    m_mainSplitter->setSizes({700, 300});
}

void ConversationWorkspaceWidget::onGoHomeClicked() {
    emit goHomeRequested();
}

void ConversationWorkspaceWidget::openConversation(const QUuid& conversationId, const QString& title) {
    if (conversationId.isNull()) {
        qWarning() << "Attempted to open null conversation ID";
        return;
    }
    // Check if already open
    if (m_openConversationTabs.contains(conversationId)) {
        m_tabWidget->setCurrentIndex(m_openConversationTabs[conversationId]);
        return;
    }

    // Load conversation data
    Conversation conversation = m_settingsManager->loadConversation(conversationId);
    if (conversation.id.isNull()) {
        QMessageBox::warning(this, "Error", QString("Could not load conversation data for ID: %1").arg(conversationId.toString()));
        // Maybe emit signal to remove item from HomeScreenWidget list?
        return;
    }

    // Create the content widget for the tab
    // Replace this with instantiation of ConversationTabContentWidget later
    QWidget *tabContent = createTabContentWidget(conversation);
    // --------------------------------------------------------------

    // Add the new widget as a tab
    int newIndex = m_tabWidget->addTab(tabContent, title);
    m_tabWidget->setCurrentIndex(newIndex);

    // Store the mapping
    m_openConversationTabs[conversationId] = newIndex;

    // Store conversation ID in the tab widget itself for easy retrieval
    tabContent->setProperty("conversationId", QVariant::fromValue(conversationId));

    // Trigger tree update for the newly opened tab (will be called via currentChanged signal anyway)
    // onCurrentTabChanged(newIndex); // Redundant due to signal connection
}


// Replace this with proper ConversationTabContentWidget later
QWidget* ConversationWorkspaceWidget::createTabContentWidget(const Conversation& conversation) {
    QWidget* contentWidget = new QWidget(m_tabWidget);
    QVBoxLayout* layout = new QVBoxLayout(contentWidget);

    QTextEdit* messageDisplay = new QTextEdit();
    messageDisplay->setReadOnly(true);
    layout->addWidget(messageDisplay, 1); // Make text edit expand

    // Populate display (simple version)
    QString displayText;
    for (const auto& msg : qAsConst(conversation.messages)) {
         displayText += QString("[%1] %2: %3\n\n")
                            .arg(msg.timestamp.toLocalTime().toString(Qt::ISODate))
                            .arg(msg.role)
                            .arg(msg.content);
    }
     if (conversation.messages.isEmpty()) {
         displayText = "Conversation started. Send your first message.";
     }
    messageDisplay->setPlainText(displayText);


    QHBoxLayout *inputLayout = new QHBoxLayout();
    QLineEdit *promptInput = new QLineEdit();
    promptInput->setPlaceholderText("Enter your prompt here...");
    QPushButton *sendButton = new QPushButton("Send");
    inputLayout->addWidget(promptInput, 1);
    inputLayout->addWidget(sendButton);
    layout->addLayout(inputLayout);

    // TODO: Connect sendButton clicked signal

    contentWidget->setLayout(layout);
    return contentWidget;
}


void ConversationWorkspaceWidget::onTabCloseRequested(int index) {
     if (index < 0 || index >= m_tabWidget->count()) return;

    QWidget *tabContent = m_tabWidget->widget(index);
    QUuid conversationId = tabContent->property("conversationId").toUuid();

    // Remove from our tracking map
    if (!conversationId.isNull()) {
        m_openConversationTabs.remove(conversationId);
    }

    // Remove the tab itself (this also deletes the widget *tabContent*)
    m_tabWidget->removeTab(index);

    // Update indices in m_openConversationTabs for tabs after the closed one
    QMap<QUuid, int> updatedTabs;
    for(auto it = m_openConversationTabs.constBegin(); it != m_openConversationTabs.constEnd(); ++it) {
        int oldIndex = it.value();
        if (oldIndex > index) {
            updatedTabs[it.key()] = oldIndex - 1;
        } else if (oldIndex < index) {
             updatedTabs[it.key()] = oldIndex;
        }
        // If oldIndex == index, it was removed
    }
    m_openConversationTabs = updatedTabs;

    // If last tab closed, maybe switch back home automatically?
    if (m_tabWidget->count() == 0) {
        m_treeModel->clear(); // Clear tree if no tabs open
        m_treeModel->setHorizontalHeaderLabels({"Message Node"});
        // emit goHomeRequested(); // Option: Automatically go home
    }
}

void ConversationWorkspaceWidget::onCurrentTabChanged(int index) {
    m_treeModel->clear();
    m_treeModel->setHorizontalHeaderLabels({"Message Node"});

    if (index < 0 || index >= m_tabWidget->count()) {
        return; // No tab selected
    }

    QWidget *currentWidget = m_tabWidget->widget(index);
    if (!currentWidget) return;

    QUuid conversationId = currentWidget->property("conversationId").toUuid();
    if (conversationId.isNull()) {
        return; // Should not happen for conversation tabs
    }

    // Reload conversation for tree view consistency
    Conversation conversation = m_settingsManager->loadConversation(conversationId);
    if (!conversation.id.isNull()) {
        buildConversationTree(conversation);
        m_treeView->expandToDepth(0); // Expand top level
    } else {
         qWarning() << "Could not load conversation" << conversationId << "for tree view.";
    }
}


void ConversationWorkspaceWidget::buildConversationTree(const Conversation& conversation) {
    // 1. Group messages by parent ID
    QMap<QUuid, QList<Message>> childrenMap;
    QList<Message> rootMessages;
    for (const Message& msg : qAsConst(conversation.messages)) {
        if (msg.parentId.isNull()) {
            rootMessages.append(msg);
        } else {
            childrenMap[msg.parentId].append(msg);
        }
    }
    // TODO: Sort messages by timestamp within each list?

    // 2. Recursively add to model
    QMap<QUuid, QStandardItem*> itemMap;
    QStandardItem *invisibleRoot = m_treeModel->invisibleRootItem();
    for (const Message& rootMsg : qAsConst(rootMessages)) {
        addMessageToTreeModel(rootMsg, childrenMap, itemMap, invisibleRoot, m_treeModel);
    }
}