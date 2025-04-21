#include "settingsmanager.h"
#include <QStandardPaths>
#include <QDir>
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QDebug> // For error messages

SettingsManager::SettingsManager(QObject *parent) : QObject(parent) {}

QString SettingsManager::getSettingsFilePath() {
    QString configPath = QStandardPaths::writableLocation(QStandardPaths::AppConfigLocation);
    // On macOS this might be ~/Library/Preferences/your.org.appname
    // On Linux ~/.config/your-org/appname.conf or similar
    // On Windows %APPDATA%/your-org/appname/appname.conf
    // Let's use AppDataLocation for potentially larger data and put config there too for simplicity
    configPath = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    if (configPath.isEmpty()) {
        qWarning() << "Could not determine AppDataLocation!";
        // Fallback or error handling needed
        return QString();
    }
    // Use a specific file name
    return configPath + QDir::separator() + "settings.json";
}

QString SettingsManager::getConversationsDir() {
     QString dataPath = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
     if (dataPath.isEmpty()) {
         qWarning() << "Could not determine AppDataLocation!";
         return QString();
     }
     return dataPath + QDir::separator() + "conversations";
}

bool SettingsManager::ensureDataPathsExist() const {
    QString configPath = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    QString convPath = getConversationsDir();

    if (configPath.isEmpty() || convPath.isEmpty()) {
        qCritical() << "Cannot determine data paths!";
        return false;
    }

    QDir dir;
    if (!dir.mkpath(configPath)) {
         qCritical() << "Failed to create config directory:" << configPath;
         return false;
    }
     if (!dir.mkpath(convPath)) {
         qCritical() << "Failed to create conversations directory:" << convPath;
         return false;
     }
    return true;
}


bool SettingsManager::loadSettings() {
    if (!ensureDataPathsExist()) return false;

    QString filePath = getSettingsFilePath();
    QFile file(filePath);

    if (!file.exists()) {
        qInfo() << "Settings file not found, creating default:" << filePath;
        m_settings = AppSettings(); // Create default settings
        return saveSettings(); // Save the default settings immediately
    }

    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        qWarning() << "Couldn't open settings file for reading:" << filePath;
        return false;
    }

    QByteArray data = file.readAll();
    file.close();

    QJsonParseError parseError;
    QJsonDocument doc = QJsonDocument::fromJson(data, &parseError);

    if (doc.isNull()) {
        qWarning() << "Failed to parse settings JSON:" << parseError.errorString() << "at offset" << parseError.offset;
        // Maybe backup the corrupt file and create a default one?
        m_settings = AppSettings(); // Load default on error
        return false; // Indicate load failure
    }

    if (!doc.isObject()) {
         qWarning() << "Settings JSON root is not an object.";
         m_settings = AppSettings();
         return false;
    }

    m_settings = AppSettings::fromJson(doc.object());
    qInfo() << "Settings loaded successfully from" << filePath;
    // TODO: Add schema version check/migration logic here later
    return true;
}

bool SettingsManager::saveSettings() const {
     if (!ensureDataPathsExist()) return false;

    QString filePath = getSettingsFilePath();
    QFile file(filePath);

    if (!file.open(QIODevice::WriteOnly | QIODevice::Text | QIODevice::Truncate)) {
        qWarning() << "Couldn't open settings file for writing:" << filePath;
        return false;
    }

    QJsonObject settingsJson = m_settings.toJson();
    QJsonDocument doc(settingsJson);

    qint64 bytesWritten = file.write(doc.toJson(QJsonDocument::Indented)); // Use Indented for readability
    file.close();

    if (bytesWritten == -1) {
         qWarning() << "Failed to write settings file:" << filePath;
         return false;
    }

    qInfo() << "Settings saved successfully to" << filePath;
    return true;
}

bool SettingsManager::loadConversations() {
     m_conversations.clear();
     QString convDir = getConversationsDir();
     if (convDir.isEmpty()) return false;

     QDir directory(convDir);
     QStringList fileList = directory.entryList(QStringList() << "*.json", QDir::Files);

     int loadedCount = 0;
     // Load conversations specified in the settings order first, then any others
     for(const QUuid& id : qAsConst(m_settings.conversationOrder)) {
         QString filename = id.toString(QUuid::WithoutBraces) + ".json";
         if (fileList.contains(filename)) {
             Conversation conv = loadConversation(id);
             if (!conv.id.isNull()) {
                 m_conversations[conv.id] = conv;
                 loadedCount++;
             }
             fileList.removeOne(filename); // Remove from list to avoid loading twice
         } else {
             qWarning() << "Conversation" << id << "listed in settings but file not found:" << filename;
             // Optionally remove this ID from m_settings.conversationOrder here
         }
     }

     // Load any remaining conversation files not explicitly ordered
     for(const QString& filename : qAsConst(fileList)) {
         QUuid id(filename.chopped(5)); // Remove ".json"
         if (!id.isNull() && !m_conversations.contains(id)) {
              Conversation conv = loadConversation(id);
             if (!conv.id.isNull()) {
                 m_conversations[conv.id] = conv;
                 // Add to the end of the ordered list if desired?
                 // m_settings.conversationOrder.append(conv.id); // Causes modification - handle carefully
                 loadedCount++;
             }
         }
     }

     qInfo() << "Loaded" << loadedCount << "conversations.";
     emit conversationListChanged();
     return true;
}

Conversation SettingsManager::loadConversation(const QUuid& conversationId) const {
     QString convDir = getConversationsDir();
     if (convDir.isEmpty() || conversationId.isNull()) return Conversation(); // Return invalid/null conv

     QString filePath = convDir + QDir::separator() + conversationId.toString(QUuid::WithoutBraces) + ".json";
     QFile file(filePath);

     if (!file.exists()) {
         qWarning() << "Conversation file does not exist:" << filePath;
         return Conversation();
     }

     if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        qWarning() << "Couldn't open conversation file for reading:" << filePath;
        return Conversation();
    }

    QByteArray data = file.readAll();
    file.close();

    QJsonParseError parseError;
    QJsonDocument doc = QJsonDocument::fromJson(data, &parseError);

    if (doc.isNull() || !doc.isObject()) {
        qWarning() << "Failed to parse conversation JSON or not an object:" << filePath << parseError.errorString();
        return Conversation();
    }

    Conversation conv = Conversation::fromJson(doc.object());
    // Basic validation
    if (conv.id != conversationId) {
         qWarning() << "Conversation ID mismatch in file:" << filePath << "- expected" << conversationId << "got" << conv.id;
         return Conversation(); // ID mismatch is serious
    }

    return conv;
}


bool SettingsManager::saveConversation(const Conversation& conversation) const {
    if (!ensureDataPathsExist() || conversation.id.isNull()) return false;

    QString convDir = getConversationsDir();
    QString filePath = convDir + QDir::separator() + conversation.id.toString(QUuid::WithoutBraces) + ".json";
    QFile file(filePath);

    if (!file.open(QIODevice::WriteOnly | QIODevice::Text | QIODevice::Truncate)) {
        qWarning() << "Couldn't open conversation file for writing:" << filePath;
        return false;
    }

    QJsonObject convJson = conversation.toJson();
    QJsonDocument doc(convJson);

    qint64 bytesWritten = file.write(doc.toJson(QJsonDocument::Indented)); // Indented optional
    file.close();

     if (bytesWritten == -1) {
         qWarning() << "Failed to write conversation file:" << filePath;
         return false;
     }

    // No qDebug message here, happens frequently. Maybe signal success?
    // emit conversationUpdated(conversation.id); // Need non-const method or member variable access
    return true;
}


const AppSettings& SettingsManager::getSettings() const {
    return m_settings;
}

// Provide non-const access to allow modification before saving
AppSettings& SettingsManager::getSettings() {
    return m_settings;
}


const QMap<QUuid, Conversation>& SettingsManager::getConversations() const {
    return m_conversations;
}

// Add method to allow adding/updating conversations in the map
// Note: Consider thread safety if accessed from multiple threads later.
void SettingsManager::updateConversationCache(const Conversation& conversation) {
    if (!conversation.id.isNull()) {
        m_conversations[conversation.id] = conversation;
        // Optionally emit conversationUpdated signal here if needed elsewhere
        // emit conversationUpdated(conversation.id);
    }
}