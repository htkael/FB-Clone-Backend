const prisma = require("../prisma/client");
const SocketService = require("./socketService");

class NotificationService {
  constructor(io, activeUsers) {
    this.io = io;
    this.activeUsers = activeUsers;
    this.socketService = new SocketService(io, activeUsers);
  }

  async createNotification(data) {
    const notification = await prisma.notification.create({
      data,
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
      },
    });

    console.log(
      `Attempt to send notification to user ${
        notification.userId
      }. User active: ${this.socketService.isUserActive(notification.userId)}`
    );

    if (this.socketService.isUserActive(notification.userId)) {
      console.log(
        `Emitting notification:new to user ${notification.userId}`,
        notification
      );
      this.socketService.emitToUser(
        notification.userId,
        "notification:new",
        notification
      );
    }

    return notification;
  }

  async notifyNewMessage(message, conversation) {
    this.socketService.emitToConversation(
      message.conversationId,
      "message:new",
      { message, conversation }
    );

    await Promise.all(
      conversation.participants
        .filter((participant) => participant.userId !== message.senderId)
        .map(async (participant) => {
          return this.createNotification({
            type: "message",
            content: `New message from ${
              message.sender.username
            }: ${message.content.substring(0, 50)}${
              message.content.length > 50 ? "..." : ""
            }`,
            userId: participant.userId,
            fromUserId: message.senderId,
            conversationId: message.conversationId,
            messageId: message.id,
          });
        })
    );
  }

  async notifyNewConversation(conversation, creatorId) {
    await Promise.all(
      conversation.participants
        .filter((participant) => participant.userId !== creatorId)
        .map(async (participant) => {
          return this.createNotification({
            type: "new_conversation",
            content: `You were added to ${
              conversation.isGroup ? "a group" : "a conversation"
            }${conversation.title ? `: ${conversation.title}` : ""}`,
            userId: participant.userId,
            fromUserId: creatorId,
            conversationId: conversation.id,
          });
        })
    );
  }

  async notifyUserAddedToConversation(conversation, userId, addedById) {
    this.socketService.emitToConversation(
      conversation.id,
      "conversation:user_added",
      {
        conversationId: conversation.id,
        userId,
        addedById,
        timestamp: new Date(),
      }
    );

    await this.createNotification({
      type: "added_to_conversation",
      content: `You were added to ${
        conversation.isGroup ? "a group" : "a conversation"
      }${conversation.title ? `: ${conversation.title}` : ""}`,
      userId,
      fromUserId: addedById,
      conversationId: conversation.id,
    });
  }

  async notifyFriendRequest(fromUserId, toUserId, requestId) {
    const fromUser = await prisma.user.findUnique({
      where: { id: fromUserId },
      select: { username: true },
    });

    await this.createNotification({
      type: "friend_request",
      content: `${fromUser.username} sent you a friend request`,
      userId: toUserId,
      fromUserId,
      friendRequestId: requestId,
    });
  }

  async notifyFriendRequestAccepted(fromUserId, toUserId) {
    const fromUser = await prisma.user.findUnique({
      where: { id: fromUserId },
      select: { username: true },
    });

    await this.createNotification({
      type: "friend_accepted",
      content: `${fromUser.username} accepted your friend request`,
      userId: toUserId,
      fromUserId,
    });
  }

  async notifyPostLike(postId, likerId, authorId) {
    if (likerId === authorId) return; // Don't notify yourself

    const liker = await prisma.user.findUnique({
      where: { id: likerId },
      select: { username: true },
    });

    await this.createNotification({
      type: "post_like",
      content: `${liker.username} liked your post`,
      userId: authorId,
      fromUserId: likerId,
      postId,
    });
  }

  async notifyPostComment(commentId, postId, commenterId, authorId) {
    if (commenterId === authorId) return; // Don't notify yourself

    const commenter = await prisma.user.findUnique({
      where: { id: commenterId },
      select: { username: true },
    });

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    await this.createNotification({
      type: "post_comment",
      content: `${commenter.username} commented: "${comment.content.substring(
        0,
        50
      )}${comment.content.length > 50 ? "..." : ""}"`,
      userId: authorId,
      fromUserId: commenterId,
      postId,
      commentId,
    });
  }
}

module.exports = NotificationService;
