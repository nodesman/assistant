#include "homescreenwidget.h"
#include "settingsmanager.h" // Include SettingsManager definition
#include "datamodels.h"      // Include Conversation definition

#include <QVBoxLayout>
#include <QPushButton>
#include <QListWidget>
#include <QListWidgetItem>
#include <QDebug>
#include <QLocale> // For SystemLocaleShortDate

HomeScreenWidget::HomeScreenWidget(SettingsManager *settingsManager, QWidget *parent)
    : QWidget(parent), m_settingsManager(settingsManager)
{
    Q_ASSERT(m_settingsManager != nullptr);
    setupUi();
    populateConversationList(); // Initial population
}

void HomeScreenWidget::setupUi() {
    QVBoxLayout *mainLayout = new QVBoxLayout(this);
    setLayout(mainLayout);

    // Add "New Conversation" button
    m_newConversationButton = new QPushButton(QIcon::fromTheme("document-new"), " New Conversation");
    connect(m_newConversationButton, &QPushButton::clicked, this, &HomeScreenWidget::onNewConversationClicked);
    mainLayout->addWidget(m_newConversationButton);

    // Add Conversation List Widget
    m_conversationListWidget = new QListWidget(this);
    m_conversationListWidget->setObjectName("conversationList");
    connect(m_conversationListWidget, &QListWidget::itemClicked, this, &HomeScreenWidget::onConversationListItemClicked);
    mainLayout->addWidget(m_conversationListWidget);

    // Add placeholder for search/filter later
}

void HomeScreenWidget::populateConversationList() {
    if (!m_settingsManager) return;

    m_conversationListWidget->clear();
    const AppSettings& settings = m_settingsManager->getSettings();
    // We need the actual conversation objects to get titles
    const QMap<QUuid, Conversation>& conversations = m_settingsManager->getConversations();

    // Add items based on the saved order
    for (const QUuid& id : settings.conversationOrder) {
        if (conversations.contains(id)) {
            const Conversation& convo = conversations[id];
            QString title = convo.title.isEmpty() ? "Untitled Conversation" : convo.title;
            QListWidgetItem *item = new QListWidgetItem(title, m_conversationListWidget);
            item->setData(Qt::UserRole, QVariant::fromValue(id)); // Store UUID
            item->setToolTip(QString("ID: %1\nLast Modified: %2")
                             .arg(id.toString())
                             .arg(convo.lastModifiedAt.toLocalTime().toString(Qt::SystemLocaleShortDate))); // Use SystemLocaleShortDate
            m_conversationListWidget->addItem(item);
        } else {
            qWarning() << "Conversation ID" << id << "in order list but not found in loaded conversations map.";
            // Optionally remove invalid ID from settings.conversationOrder here?
        }
    }
     // TODO: Add logic to handle conversations existing in the map but NOT in the order list?
}

void HomeScreenWidget::onNewConversationClicked() {
    emit newConversationRequested();
}

void HomeScreenWidget::onConversationListItemClicked(QListWidgetItem *item) {
    if (!item) return;
    QUuid id = item->data(Qt::UserRole).toUuid();
    if (!id.isNull()) {
        emit conversationSelected(id, item->text());
    } else {
         qWarning() << "Clicked list item has invalid UUID data.";
    }
}