class SocketService {
  constructor(io, activeUsers) {
    this.io = io;
    this.activeUsers = activeUsers;
  }

  notifyNewMessage(message, conversation) {
    this.io.to(`conversation:${message.conversationId}`).emit("message:new", {
      message,
      conversation,
    });

    conversation.participants.forEach((participant) => {
      if (
        participant.userId !== message.senderId &&
        this.isUserActive(participant.userId)
      ) {
        this.io.to(`user:${participant.userId}`).emit("notification:message", {
          type: "new_message",
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderName: message.sender.username,
          content:
            message.content.substring(0, 50) +
            (message.content.length > 50 ? "..." : ""),
          timestamp: new Date(),
        });
      }
    });
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

  notifyNewConversation(conversation, creatorId) {
    conversation.participants.forEach((participant) => {
      if (participant.userId !== creatorId) {
        this.io
          .to(`user:${participant.userId}`)
          .emit("notification:conversation", {
            type: "new_conversation",
            conversationId: conversation.id,
            title: conversation.title || "New Direct Message",
            isGroup: conversation.isGroup,
            creatorId,
            timestamp: new Date(),
          });
      }
    });
  }

  notifyUserAddedToConversation(conversation, userId, addedById) {
    this.io.to(`user:${userId}`).emit("notification:conversation", {
      type: "added_to_conversation",
      conversationId: conversation.id,
      title: conversation.title || "New Conversation",
      isGroup: conversation.isGroup,
      addedById,
      timestamp: new Date(),
    });

    this.io
      .to(`conversation:${conversation.id}`)
      .emit("conversation:user_added", {
        conversationId: conversation.id,
        userId,
        addedById,
        timestamp: new Date(),
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

  notifyFriendRequest(fromUserId, toUserId, requestId) {
    this.io.to(`user:${toUserId}`).emit("notification:friend_requested", {
      type: "friend_request",
      fromUserId,
      toUserId,
      timestamp: new Date(),
    });
  }

  notifyFriendRequestAccepted(fromUserId, toUserId) {
    this.io.to(`user:${toUserId}`).emit("notification:friend_accepted", {
      type: "friend_accepted",
      fromUserId,
      timestamp: new Date(),
    });
  }

  isUserActive(userId) {
    return this.activeUsers.has(userId.toString());
  }

  getActiveUsersCount() {
    return this.activeUsers.size;
  }
}

module.exports = SocketService;
