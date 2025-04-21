#ifndef HOMESCREENWIDGET_H
#define HOMESCREENWIDGET_H

#include <QWidget>
#include <QUuid> // Include QUuid

// Forward declarations
class QListWidget;
class QPushButton;
class SettingsManager;
class QListWidgetItem;

class HomeScreenWidget : public QWidget
{
    Q_OBJECT
public:
    explicit HomeScreenWidget(SettingsManager *settingsManager, QWidget *parent = nullptr);
    void populateConversationList(); // Public method to refresh list

signals:
    void conversationSelected(const QUuid& conversationId, const QString& title);
    void newConversationRequested();

private slots:
    void onNewConversationClicked();
    void onConversationListItemClicked(QListWidgetItem *item);

private:
    void setupUi();

    SettingsManager *m_settingsManager; // Non-owning pointer
    QListWidget *m_conversationListWidget;
    QPushButton *m_newConversationButton;
    // Add search, filter widgets later
};

#endif // HOMESCREENWIDGET_H