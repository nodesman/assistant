#ifndef SETTINGSMANAGER_H
#define SETTINGSMANAGER_H

#include "datamodels.h"
#include <QObject> // Needed for signals/slots if we add them later
#include <QString>
#include <QMap> // To hold loaded conversations
#include <QUuid> // Include QUuid

class SettingsManager : public QObject {
    Q_OBJECT
public:
    explicit SettingsManager(QObject *parent = nullptr);

    bool loadSettings();
    bool saveSettings() const;

    bool loadConversations(); // Loads conversations listed in settings
    bool saveConversation(const Conversation& conversation) const;
    Conversation loadConversation(const QUuid& conversationId) const; // Load single on demand

    const AppSettings& getSettings() const;
    AppSettings& getSettings(); // Allow modification

    const QMap<QUuid, Conversation>& getConversations() const;
    void updateConversationCache(const Conversation& conversation); // Add/Update in-memory map

    // Utility to get data paths
    static QString getSettingsFilePath();
    static QString getConversationsDir();

signals:
    void settingsChanged(); // Example signal if needed later
    void conversationListChanged(); // When list changes (add/delete)
    void conversationUpdated(const QUuid& conversationId); // When content changes


private:
    AppSettings m_settings;
    QMap<QUuid, Conversation> m_conversations; // Cache loaded conversations (key: UUID)
    bool ensureDataPathsExist() const;

};

#endif // SETTINGSMANAGER_H