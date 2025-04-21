#ifndef CONVERSATIONWORKSPACEWIDGET_H
#define CONVERSATIONWORKSPACEWIDGET_H

#include <QWidget>
#include <QUuid>
#include <QMap>

// Forward declarations
class QTabWidget;
class QTreeView;
class QStandardItemModel;
class QSplitter;
class SettingsManager;
struct Conversation; // From datamodels.h
struct Message;      // From datamodels.h
class QStandardItem;
class QPushButton; // For "Go Home"

class ConversationWorkspaceWidget : public QWidget
{
    Q_OBJECT
public:
    explicit ConversationWorkspaceWidget(SettingsManager *settingsManager, QWidget *parent = nullptr);

    void openConversation(const QUuid& conversationId, const QString& title); // Main entry point

signals:
    void goHomeRequested(); // Signal to tell MainWindow to switch back

private slots:
    void onTabCloseRequested(int index);
    void onCurrentTabChanged(int index);
    void onGoHomeClicked();
    // void sendMessageInCurrentTab(); // Slot to handle sending message

private:
    void setupUi();
    void buildConversationTree(const Conversation& conversation);
    void addMessageToTreeModel(const Message& msg, const QMap<QUuid, QList<Message>>& childrenMap, QMap<QUuid, QStandardItem*>& itemMap, QStandardItem* parentItem, QStandardItemModel* model);
    QWidget* createTabContentWidget(const Conversation& conversation); // Helper to create the content for a tab

    SettingsManager *m_settingsManager; // Non-owning pointer
    QSplitter *m_mainSplitter;
    QTabWidget *m_tabWidget;
    QTreeView *m_treeView;
    QStandardItemModel *m_treeModel;
    QPushButton *m_goHomeButton; // Simple way back for now

    // Map to track open tabs: Conversation UUID -> Tab Index
    QMap<QUuid, int> m_openConversationTabs;
};

#endif // CONVERSATIONWORKSPACEWIDGET_H