const {
  CustomBadRequestError,
  CustomNotFoundError,
  CustomServerError,
  CustomUnauthorizedError,
} = require("../errors/CustomErrors");
const prisma = require("../prisma/client");
const asyncHandler = require("express-async-handler");
const NotificationService = require("../services/notificationService");
const SocketService = require("../services/socketService");

exports.getConversations = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
            isHidden: false,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        participants: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                profilePicUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.conversation.count({
      where: {
        participants: {
          some: { userId: userId },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    if (conversations.length === 0) {
      return res.json({
        success: true,
        message: "User currently has no open conversations",
        data: conversations,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    }
    res.json({
      success: true,
      message: "Conversations retrieved successfully",
      data: conversations,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error(err);
    throw new CustomServerError("Server error when retrieving conversations");
  }
});

exports.createConversation = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);
  const { participants, title, isGroup } = req.body;
  console.log("participants", participants);
  try {
    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      throw new CustomBadRequestError("Participant list is required");
    }

    if (!isGroup && participants.length !== 1) {
      throw new CustomBadRequestError(
        "Direct conversations require exactly one participant"
      );
    }

    if (isGroup && !title) {
      throw new CustomBadRequestError("Group conversations require a title");
    }

    const participantIds = participants.map((p) => parseInt(p));
    const existingUsers = await prisma.user.findMany({
      where: {
        id: { in: participantIds },
      },
      select: { id: true },
    });

    if (existingUsers.length !== participantIds.length) {
      throw new CustomNotFoundError("One or more participants do not exist");
    }

    let existingConversation;

    if (!isGroup) {
      const otherUserId = participantIds[0];

      existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            some: { userId: userId },
          },
          AND: [
            {
              participants: {
                some: { userId: otherUserId },
              },
            },
            {
              participants: {
                every: {
                  userId: { in: [userId, otherUserId] },
                },
              },
            },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  profilePicUrl: true,
                },
              },
            },
          },
        },
      });
    } else {
      const allParticipantIds = [userId, ...participantIds];

      existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: true,
          title: title,
          participants: {
            every: {
              userId: { in: allParticipantIds },
            },
          },
          AND: {
            participants: {
              none: {
                userId: { notIn: allParticipantIds },
              },
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  profilePicUrl: true,
                },
              },
            },
          },
        },
      });
    }

    if (existingConversation) {
      const currentUserParticipant = existingConversation.participants.find(
        (participant) => participant.user.id === userId
      );

      if (currentUserParticipant && currentUserParticipant.isHidden) {
        await prisma.conversationParticipant.update({
          where: { id: currentUserParticipant.id },
          data: { isHidden: false },
        });

        const updatedConversation = await prisma.conversation.findUnique({
          where: { id: existingConversation.id },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    profilePicUrl: true,
                  },
                },
              },
            },
          },
        });

        return res.json({
          success: true,
          message: "Conversation restored and ready",
          data: updatedConversation,
        });
      }

      return res.json({
        success: true,
        message: "Conversation already exists",
        data: existingConversation,
      });
    }

    const conversation = await prisma.conversation.create({
      data: {
        title: isGroup ? title : null,
        isGroup,
        participants: {
          create: [{ userId }, ...participantIds.map((id) => ({ userId: id }))],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profilePicUrl: true,
              },
            },
          },
        },
      },
    });

    const notificationService = new NotificationService(
      req.io,
      req.activeUsers
    );
    notificationService.notifyNewConversation(conversation, userId);

    res.json({
      success: true,
      message: "Conversation created successfully",
      data: conversation,
    });
  } catch (err) {
    console.error(err);
    if (
      err instanceof CustomBadRequestError ||
      err instanceof CustomNotFoundError
    ) {
      throw err;
    }
    throw new CustomServerError("Server error when creating conversation");
  }
});

exports.getSpecificConversation = asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.conversationId);
  const userId = parseInt(req.user);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const skip = (page - 1) * limit;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        messages: {
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profilePicUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new CustomNotFoundError(
        `Conversation with id (${conversationId}) not found`
      );
    }

    const isParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
    });

    if (!isParticipant) {
      throw new CustomUnauthorizedError(
        "You are not a participant in this conversation"
      );
    }

    const total = conversation._count.messages;
    const totalPages = Math.ceil(total / limit);

    const participant = await prisma.conversationParticipant.update({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    const latestMessage = conversation.messages[0];
    if (latestMessage) {
      const socketService = new SocketService(req.io, req.activeUsers);
      socketService.notifyMessageRead(conversationId, userId, latestMessage.id);
    }

    res.json({
      success: true,
      message: "Conversation successfully retrieved",
      data: conversation,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error(err);
    if (
      err instanceof CustomNotFoundError ||
      err instanceof CustomUnauthorizedError
    ) {
      throw err;
    }
    throw new CustomServerError(
      `Server error when retrieving conversation with id (${conversationId})`
    );
  }
});

exports.updateTitle = asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.conversationId);
  const userId = parseInt(req.user);
  const { title } = req.body;
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new CustomNotFoundError(
        `Conversation with id (${conversationId}) not found`
      );
    }

    const isParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
    });
    if (!isParticipant) {
      throw new CustomUnauthorizedError(
        "You are not a participant in this conversation"
      );
    }

    if (conversation.isGroup === false) {
      throw new CustomBadRequestError("Direct messages do not have a title");
    }

    if (!title || title.trim().length === 0) {
      throw new CustomBadRequestError("Title cannot be empty");
    }

    const updatedConversation = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        title,
      },
    });

    const socketService = new SocketService(req.io, req.activeUsers);
    socketService.notifyConversationRenamed(conversationId, title, userId);

    res.json({
      success: true,
      message: "Conversation title changed successfully",
      data: updatedConversation,
    });
  } catch (err) {
    console.error(err);
    if (
      err instanceof CustomNotFoundError ||
      err instanceof CustomUnauthorizedError ||
      err instanceof CustomBadRequestError
    ) {
      throw err;
    }
    throw new CustomServerError(
      `Server error when updating title of conversation with id (${conversationId})`
    );
  }
});

exports.hideConversation = asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.conversationId);
  const userId = parseInt(req.user);
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

    const currentUserParticipant = conversation.participants.find(
      (participant) => participant.user.id === userId
    );

    if (!currentUserParticipant) {
      throw new CustomUnauthorizedError(
        "You are not a participant of this conversation"
      );
    }

    if (currentUserParticipant.isHidden) {
      throw new CustomBadRequestError("Conversation is already deleted");
    }

    const updatedConversation = await prisma.conversationParticipant.update({
      where: {
        id: currentUserParticipant.id,
      },
      data: { isHidden: true },
    });
    res.json({
      success: true,
      message: "Conversation successfully deleted",
      data: updatedConversation,
    });
  } catch (err) {
    console.error(err);
    if (
      err instanceof CustomNotFoundError ||
      err instanceof CustomUnauthorizedError ||
      err instanceof CustomBadRequestError
    ) {
      throw err;
    }
    throw new CustomServerError(
      `Server error when deleting conversation with id (${conversationId})`
    );
  }
});

exports.markConversationAsRead = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);
  const conversationId = parseInt(req.params.conversationId);

  try {
    await prisma.conversationParticipant.update({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    await prisma.$executeRaw`
  UPDATE "Message"
  SET "isRead" = true
  WHERE "conversationId" = ${conversationId}
    AND "isRead" = false
    AND "senderId" != ${userId}
`;

    res.json({
      success: true,
      message: "Conversation marked as read",
    });
  } catch (err) {
    console.error(err);
    throw new CustomServerError(
      "Server error when marking conversation as read"
    );
  }
});
