const {
  CustomNotFoundError,
  CustomBadRequestError,
  CustomUnauthorizedError,
  CustomServerError,
} = require("../errors/CustomErrors");
const prisma = require("../prisma/client");
const asyncHandler = require("express-async-handler");
const SocketService = require("../services/socketService");

exports.addParticipant = asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.conversationId);
  const userId = parseInt(req.user);
  const { userToAdd } = req.body;
  const userToAddId = parseInt(userToAdd);
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
        `Conversation with id(${conversationId}) not found`
      );
    }

    if (!conversation.isGroup) {
      throw new CustomBadRequestError(
        "Cannot add participants to direct conversations"
      );
    }

    const currentUserParticipant = conversation.participants.find(
      (participant) => participant.user.id === userId
    );

    if (!currentUserParticipant) {
      throw new CustomUnauthorizedError(
        "You are not a participant of this conversation and cannot add participants to it"
      );
    }

    const userExists = await prisma.user.findUnique({
      where: {
        id: userToAddId,
      },
    });
    if (!userExists) {
      throw new CustomNotFoundError(`User with id (${userToAddId}) not found`);
    }

    const isAlreadyParticipant = conversation.participants.some(
      (participant) => participant.user.id === userToAddId
    );
    if (isAlreadyParticipant) {
      throw new CustomBadRequestError(
        "User is already a participant of this group"
      );
    }

    const addedUser = await prisma.conversationParticipant.create({
      data: {
        userId: userToAddId,
        conversationId,
      },
    });

    const socketService = new SocketService(req.io, req.activeUsers);
    socketService.notifyUserAddedToConversation(
      conversation,
      userToAddId,
      userId
    );

    res.json({
      success: true,
      message: "User successfully added to group",
      data: addedUser,
    });
  } catch (err) {
    console.error(err);
    if (
      err instanceof CustomNotFoundError ||
      err instanceof CustomBadRequestError ||
      err instanceof CustomUnauthorizedError
    ) {
      throw err;
    }
    throw new CustomServerError(
      "Server error when adding user to conversation"
    );
  }
});

exports.removeSelf = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);
  const conversationId = parseInt(req.params.conversationId);
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
        `Conversation with id(${conversationId}) not found`
      );
    }

    if (!conversation.isGroup) {
      throw new CustomBadRequestError(
        "Cannot remove self from direct conversations"
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

    await prisma.conversationParticipant.delete({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
    });

    const socketService = new SocketService(req.io, req.activeUsers);
    socketService.notifyUserLeftConversation(conversationId, userId);

    res.json({
      success: true,
      message: "Successfully removed self from conversation",
    });
  } catch (err) {
    console.error(err);
    if (
      err instanceof CustomNotFoundError ||
      err instanceof CustomBadRequestError ||
      err instanceof CustomUnauthorizedError
    ) {
      throw err;
    }
    throw new CustomServerError(
      "Server error when removing self from conversation"
    );
  }
});

exports.getParticipants = asyncHandler(async (req, res) => {
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
                username: true,
                profilePicUrl: true,
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
        "You are not a participant of this conversation and cannot view the participants of it"
      );
    }

    res.json({
      success: true,
      message: "Participants of conversation retrieved",
      data: conversation.participants,
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
      "Server error when retrieving participants from conversation"
    );
  }
});
