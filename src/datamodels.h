#ifndef DATAMODELS_H
#define DATAMODELS_H

#include <QString>
#include <QList>
#include <QDateTime>
#include <QJsonObject>
#include <QUuid> // For unique IDs

// Represents an AI Provider (OpenAI, Gemini, etc.)
struct AiProvider {
    QString id; // e.g., "openai", "gemini-pro"
    QString name; // e.g., "OpenAI GPT-4", "Google Gemini Pro"

    // Basic serialization/deserialization (can be expanded)
    QJsonObject toJson() const;
    static AiProvider fromJson(const QJsonObject &json);
};

// Represents an API Key for a specific provider
struct ApiKey {
    QString providerId;
    QString key; // *** INSECURE STORAGE - FOR INITIAL DEV ONLY ***

    QJsonObject toJson() const;
    static ApiKey fromJson(const QJsonObject &json);
};

// Represents a single message in a conversation
struct Message {
    QUuid id;
    QUuid parentId; // Null for root messages
    QString role; // e.g., "user", "assistant"
    QString content;
    QDateTime timestamp;
    QString providerId; // Which provider generated this message (if assistant)

    Message() : id(QUuid::createUuid()) {} // Generate unique ID on creation

    QJsonObject toJson() const;
    static Message fromJson(const QJsonObject &json);
};

// Represents a full conversation thread (potentially branched)
struct Conversation {
    QUuid id;
    QString title;
    QDateTime createdAt;
    QDateTime lastModifiedAt;
    QList<Message> messages; // Simple list for now, tree logic managed by parentId

    Conversation() : id(QUuid::createUuid()), createdAt(QDateTime::currentDateTimeUtc()) {}

    // Serialization/deserialization for the entire conversation (likely saved to separate files)
    QJsonObject toJson() const;
    static Conversation fromJson(const QJsonObject &json);
};

// Represents overall application settings
struct AppSettings {
    int schemaVersion = 1; // For future migrations
    QList<ApiKey> apiKeys;
    QList<QUuid> conversationOrder; // Store order of conversation IDs for display
    // Add other user preferences here later

    QJsonObject toJson() const;
    static AppSettings fromJson(const QJsonObject &json);
};


#endif // DATAMODELS_H