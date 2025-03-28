class SocketService {
  constructor(io, activeUsers) {
    this.io = io;
    this.activeUsers = activeUsers;
  }

  notifyMessageEdited(message) {
    this.io
      .to(`conversation:${message.conversationId}`)
      .emit("message:updated", {
        message,
      });
  }

  notifyMessageDeleted(message) {
    this.io
      .to(`conversation:${message.conversationId}`)
      .emit("message:deleted", {
        messageId: message.id,
        conversationId: message.conversationId,
      });
  }

  notifyUserLeftConversation(conversationId, userId) {
    this.io
      .to(`conversation:${conversationId}`)
      .emit("conversation:user_left", {
        conversationId,
        userId,
        timestamp: new Date(),
      });
  }

  notifyConversationRenamed(conversationId, newTitle, userId) {
    this.io.to(`conversation:${conversationId}`).emit("conversation:renamed", {
      conversationId,
      newTitle,
      userId,
      timestamp: new Date(),
    });
  }

  notifyUserTyping(conversationId, userId, username) {
    this.io.to(`conversation:${conversationId}`).emit("user:typing", {
      conversationId,
      userId,
      username,
      timestamp: new Date(),
    });
  }

  notifyMessageRead(conversationId, userId, lastReadMessageId) {
    this.io.to(`conversation:${conversationId}`).emit("message:read", {
      conversationId,
      userId,
      lastReadMessageId,
      timestamp: new Date(),
    });
  }

  notifyNotificationsRead(userId, notificationIds) {
    this.io.to(`user:${userId}`).emit("notification:read", {
      userId,
      notificationIds,
    });
  }

  notifyNotificationsReadAll(userId, notificationIds) {
    this.io.to(`user:${userId}`).emit("notification:read:all", {
      userId,
    });
  }

  notifyNotificationsCleared(userId) {
    this.io.to(`user:${userId}`).emit("notification:clear", {
      userId,
    });
  }

  isUserActive(userId) {
    const userIdNum = typeof userId === "string" ? parseInt(userId) : userId;

    const isActive = this.activeUsers.has(userIdNum);

    console.log(`Checking if user ${userId} is active: ${isActive}`);

    return isActive;
  }

  notifyUserStoppedTyping(conversationId, userId) {
    this.io.to(`conversation:${conversationId}`).emit("user:typing:stop", {
      conversationId,
      userId,
      timestamp: new Date(),
    });
  }

  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  emitToConversation(conversationId, event, data) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = SocketService;
