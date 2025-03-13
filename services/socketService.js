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
    // Make sure userId is a string for consistent comparison
    const userIdStr = userId.toString();

    // Debug logs
    console.log(
      `Checking if user ${userIdStr} is active with type ${typeof userIdStr}`
    );
    console.log(
      `Active users: ${Array.from(this.activeUsers.keys()).join(", ")}`
    );

    // Log each active user with its type for comparison
    for (const activeId of this.activeUsers.keys()) {
      console.log(`Active user: ${activeId} with type ${typeof activeId}`);
    }

    // Try both direct and string comparison
    const directCheck = this.activeUsers.has(userId);
    const stringCheck = this.activeUsers.has(userIdStr);

    console.log(`Direct check: ${directCheck}, String check: ${stringCheck}`);

    // Return the more likely correct result
    return stringCheck;
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

  // Broadcast to everyone except sender
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = SocketService;
