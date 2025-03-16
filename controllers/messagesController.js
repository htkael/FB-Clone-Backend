const {
  CustomBadRequestError,
  CustomNotFoundError,
  CustomUnauthorizedError,
  CustomServerError,
  CustomValidationError,
} = require("../errors/CustomErrors");
const prisma = require("../prisma/client");
const asyncHandler = require("express-async-handler");
const { postValidation } = require("../middleware/validators");
const { validationResult } = require("express-validator");
const NotificationService = require("../services/notificationService");
const SocketService = require("../services/socketService");

exports.sendMessage = [
  postValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array();
      const formData = req.body;
      throw new CustomValidationError(
        "Validation Failed",
        validationErrors,
        formData
      );
    }
    const conversationId = parseInt(req.params.conversationId);
    const senderId = parseInt(req.user);
    const { content, imageUrl } = req.body;
    try {
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });
      if (!conversation) {
        throw new CustomNotFoundError(
          `Conversation with id (${conversationId}) not found`
        );
      }

      const currentParticipant =
        await prisma.conversationParticipant.findUnique({
          where: {
            userId_conversationId: {
              userId: senderId,
              conversationId,
            },
          },
        });
      if (!currentParticipant) {
        throw new CustomBadRequestError(
          "You are not a participant of this conversation"
        );
      }

      let receiverId;

      if (!conversation.isGroup) {
        const receiver = conversation.participants.find(
          (participant) => participant.user.id !== senderId
        );
        receiverId = receiver ? receiver.user.id : null;
      }

      const message = await prisma.message.create({
        data: {
          content,
          imageUrl,
          senderId,
          receiverId,
          conversationId,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profilePicUrl: true,
            },
          },
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          updatedAt: new Date(),
        },
      });

      const notificationService = new NotificationService(
        req.io,
        req.activeUsers
      );
      notificationService.notifyNewMessage(message, conversation);

      res.json({
        success: true,
        message: "Message sent successfully",
        data: message,
      });
    } catch (err) {
      console.error(err);
      if (
        err instanceof CustomBadRequestError ||
        err instanceof CustomNotFoundError ||
        err instanceof CustomUnauthorizedError ||
        err instanceof CustomValidationError
      ) {
        throw err;
      }
      throw new CustomServerError("Server error while sending message");
    }
  }),
];

exports.editMessage = [
  postValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array();
      const formData = req.body;
      throw new CustomValidationError(
        "Validation Failed",
        validationErrors,
        formData
      );
    }
    const conversationId = parseInt(req.params.conversationId);
    const messageId = parseInt(req.params.messageId);
    const senderId = parseInt(req.user);
    const { content, imageUrl } = req.body;
    try {
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });
      if (!conversation) {
        throw new CustomNotFoundError(
          `Conversation with id (${conversationId}) not found`
        );
      }

      const currentParticipant =
        await prisma.conversationParticipant.findUnique({
          where: {
            userId_conversationId: {
              userId: senderId,
              conversationId,
            },
          },
        });
      if (!currentParticipant) {
        throw new CustomBadRequestError(
          "You are not a participant of this conversation"
        );
      }

      const message = await prisma.message.findUnique({
        where: {
          id: messageId,
        },
      });
      if (!message) {
        throw new CustomNotFoundError(
          `Message with id (${messageId}) not found`
        );
      }

      if (senderId !== message.senderId) {
        throw new CustomUnauthorizedError(
          "You can only edit messages that you sent"
        );
      }

      const updatedMessage = await prisma.message.update({
        where: {
          id: messageId,
        },
        data: {
          content,
          imageUrl,
        },
      });

      const socketService = new SocketService(req.io, req.activeUsers);
      socketService.notifyMessageEdited(updatedMessage);

      res.json({
        success: true,
        message: "Message edited successfully",
        data: updatedMessage,
      });
    } catch (err) {
      console.error(err);
      if (
        err instanceof CustomBadRequestError ||
        err instanceof CustomNotFoundError ||
        err instanceof CustomUnauthorizedError ||
        err instanceof CustomValidationError
      ) {
        throw err;
      }
      throw new CustomServerError("Server error while editing message");
    }
  }),
];

exports.deleteMessage = asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.conversationId);
  const messageId = parseInt(req.params.messageId);
  const senderId = parseInt(req.user);

  try {
    console.log(`Attempting to delete message:`, {
      conversationId,
      messageId,
      senderId,
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!conversation) {
      console.log(`Conversation not found: ${conversationId}`);
      throw new CustomNotFoundError(
        `Conversation with id (${conversationId}) not found`
      );
    }

    const currentParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: senderId,
          conversationId,
        },
      },
    });

    if (!currentParticipant) {
      console.log(`User not a participant: ${senderId}`);
      throw new CustomBadRequestError(
        "You are not a participant of this conversation"
      );
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      console.log(`Message not found: ${messageId}`);
      throw new CustomNotFoundError(`Message with id (${messageId}) not found`);
    }

    if (senderId !== message.senderId) {
      console.log(
        `Unauthorized delete attempt: sender ${senderId}, message sender ${message.senderId}`
      );
      throw new CustomUnauthorizedError(
        "You can only delete messages that you sent"
      );
    }

    const deletedMessage = await prisma.message.delete({
      where: { id: messageId },
    });

    console.log(`Message deleted:`, deletedMessage);

    const socketService = new SocketService(req.io, req.activeUsers);
    socketService.notifyMessageDeleted(message);

    res.json({
      success: true,
      message: "Message deleted successfully",
      deletedMessage,
    });
  } catch (err) {
    console.error("Full delete error:", err);

    if (
      err instanceof CustomBadRequestError ||
      err instanceof CustomNotFoundError ||
      err instanceof CustomUnauthorizedError ||
      err instanceof CustomValidationError
    ) {
      throw err;
    }

    throw new CustomServerError("Server error while deleting message");
  }
});

exports.getUnread = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);
  try {
    const participations = await prisma.conversationParticipant.findMany({
      where: {
        userId: userId,
        isHidden: false,
      },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    const unreadCountsPromises = participations.map(async (participation) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: participation.conversationId,
          senderId: { not: userId },
          createdAt: { gt: participation.lastReadAt },
        },
      });
      return {
        conversationId: participation.conversationId,
        unreadCount,
      };
    });

    const unreadCounts = await Promise.all(unreadCountsPromises);

    const totalUnread = unreadCounts.reduce(
      (sum, item) => sum + item.unreadCount,
      0
    );

    res.json({
      success: true,
      message: "Unread message counts retrieved successfully",
      data: {
        conversations: unreadCounts,
        totalUnread,
      },
    });
  } catch (err) {
    console.error(err);
    throw new CustomServerError(
      "Server error when retrieving unread message counts"
    );
  }
});

exports.getConversationUnreadCount = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);
  const conversationId = parseInt(req.params.conversationId);
  try {
    const currentParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
    });
    if (!currentParticipant) {
      throw new CustomBadRequestError(
        "You are not a participant of this conversation"
      );
    }

    const unreadCount = await prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        createdAt: { gt: currentParticipant.lastReadAt },
      },
    });

    res.json({
      success: true,
      message: "Unread message count retrieved successfully",
      data: {
        conversationId,
        unreadCount,
      },
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomUnauthorizedError) {
      throw err;
    }
    throw new CustomServerError(
      "Server error when retrieving conversation unread count"
    );
  }
});
