#include "datamodels.h"
#include <QJsonArray>
#include <QUuid>
#include <QDateTime> // Required for QDateTime conversions

// --- AiProvider ---
QJsonObject AiProvider::toJson() const {
    return QJsonObject{
        {"id", id},
        {"name", name}
    };
}

AiProvider AiProvider::fromJson(const QJsonObject &json) {
    AiProvider provider;
    provider.id = json["id"].toString();
    provider.name = json["name"].toString();
    return provider;
}

// --- ApiKey ---
QJsonObject ApiKey::toJson() const {
    return QJsonObject{
        {"providerId", providerId},
        {"key", key} // *** INSECURE ***
    };
}

ApiKey ApiKey::fromJson(const QJsonObject &json) {
    ApiKey apiKey;
    apiKey.providerId = json["providerId"].toString();
    apiKey.key = json["key"].toString(); // *** INSECURE ***
    return apiKey;
}

// --- Message ---
QJsonObject Message::toJson() const {
    return QJsonObject{
        {"id", id.toString(QUuid::WithoutBraces)},
        {"parentId", parentId.isNull() ? QJsonValue() : parentId.toString(QUuid::WithoutBraces)},
        {"role", role},
        {"content", content},
        {"timestamp", timestamp.toString(Qt::ISODateWithMs)},
        {"providerId", providerId}
    };
}

Message Message::fromJson(const QJsonObject &json) {
    Message msg;
    msg.id = QUuid(json["id"].toString());
    msg.parentId = json["parentId"].isNull() ? QUuid() : QUuid(json["parentId"].toString());
    msg.role = json["role"].toString();
    msg.content = json["content"].toString();
    msg.timestamp = QDateTime::fromString(json["timestamp"].toString(), Qt::ISODateWithMs);
    msg.timestamp.setTimeSpec(Qt::UTC); // Ensure it's read as UTC
    msg.providerId = json["providerId"].toString();
    return msg;
}


// --- Conversation ---
QJsonObject Conversation::toJson() const {
    QJsonObject json{
        {"id", id.toString(QUuid::WithoutBraces)},
        {"title", title},
        {"createdAt", createdAt.toString(Qt::ISODateWithMs)},
        {"lastModifiedAt", lastModifiedAt.toString(Qt::ISODateWithMs)}
    };
    QJsonArray messagesArray;
    for(const auto& msg : messages) {
        messagesArray.append(msg.toJson());
    }
    json["messages"] = messagesArray;
    return json;
}

Conversation Conversation::fromJson(const QJsonObject &json) {
    Conversation conv;
    conv.id = QUuid(json["id"].toString());
    conv.title = json["title"].toString();
    conv.createdAt = QDateTime::fromString(json["createdAt"].toString(), Qt::ISODateWithMs);
    conv.createdAt.setTimeSpec(Qt::UTC);
    conv.lastModifiedAt = QDateTime::fromString(json["lastModifiedAt"].toString(), Qt::ISODateWithMs);
    conv.lastModifiedAt.setTimeSpec(Qt::UTC);

    QJsonArray messagesArray = json["messages"].toArray();
    for(const QJsonValue& val : messagesArray) {
        conv.messages.append(Message::fromJson(val.toObject()));
    }
    // TODO: Could sort messages by timestamp here if needed
    return conv;
}

// --- AppSettings ---
QJsonObject AppSettings::toJson() const {
     QJsonObject json{
        {"schemaVersion", schemaVersion}
     };
     QJsonArray keysArray;
     for(const auto& key : apiKeys) {
         keysArray.append(key.toJson());
     }
     json["apiKeys"] = keysArray;

     QJsonArray convOrderArray;
     for(const auto& id : conversationOrder) {
         convOrderArray.append(id.toString(QUuid::WithoutBraces));
     }
     json["conversationOrder"] = convOrderArray;

     return json;
}

AppSettings AppSettings::fromJson(const QJsonObject &json) {
    AppSettings settings;
    // Check schema version here in the future for migration
    settings.schemaVersion = json.contains("schemaVersion") ? json["schemaVersion"].toInt(1) : 1;

    QJsonArray keysArray = json["apiKeys"].toArray();
    for(const QJsonValue& val : keysArray) {
        settings.apiKeys.append(ApiKey::fromJson(val.toObject()));
    }

    QJsonArray convOrderArray = json["conversationOrder"].toArray();
     for(const QJsonValue& val : convOrderArray) {
         settings.conversationOrder.append(QUuid(val.toString()));
     }

    return settings;
}