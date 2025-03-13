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
    const userIdStr = userId.toString();
    const isActive = this.activeUsers.has(userIdStr);
    console.log(`Checking if user ${userIdStr} is active: ${isActive}`);
    console.log(
      `Active users: ${Array.from(this.activeUsers.keys()).join(", ")}`
    );
    return isActive;
  }

  getActiveUsersCount() {
    return this.activeUsers.size;
  }

  notifyUserStoppedTyping(conversationId, userId) {
    this.io.to(`conversation:${conversationId}`).emit("user:typing:stop", {
      conversationId,
      userId,
      timestamp: new Date(),
    });
  }

  mitToUser(userId, event, data) {
    userId = userId.toString();
    const room = `user:${userId}`;
    console.log(`Emitting ${event} to room ${room}`);

    // Check if room exists and has connections
    const socketsInRoom = this.io.sockets.adapter.rooms.get(room);
    if (socketsInRoom) {
      console.log(`Room ${room} has ${socketsInRoom.size} sockets`);
    } else {
      console.log(`Room ${room} does not exist or is empty`);
    }

    this.io.to(room).emit(event, data);
    console.log(`Emission to ${room} complete`);
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
