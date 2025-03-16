const {
  CustomNotFoundError,
  CustomBadRequestError,
  CustomServerError,
} = require("../errors/CustomErrors");
const prisma = require("../prisma/client");
const asyncHandler = require("express-async-handler");
const NotificationService = require("../services/notificationService");

exports.sendRequest = asyncHandler(async (req, res) => {
  const friendId = parseInt(req.params.userId);
  const userId = parseInt(req.user);
  try {
    if (userId === friendId) {
      throw new CustomBadRequestError(
        "You cannot send a friend request to yourself"
      );
    }

    const friend = await prisma.user.findUnique({
      where: {
        id: friendId,
      },
    });
    if (!friend) {
      throw new CustomNotFoundError(`Friend with id (${friendId}) not found`);
    }

    const existingRequest = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "REJECTED") {
        await prisma.friend.delete({
          where: {
            id: existingRequest.id,
          },
        });
      } else {
        throw new CustomBadRequestError("Friend request already exists");
      }
    }

    const request = await prisma.friend.create({
      data: {
        userId,
        friendId,
      },
    });

    const notificationService = new NotificationService(
      req.io,
      req.activeUsers
    );
    notificationService.notifyFriendRequest(userId, friendId, request.id);

    res.json({
      success: true,
      message: `Friend request from user with id (${userId}) sent successfully to user with id (${friendId}))`,
      data: request,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err;
    }
    if (err instanceof CustomBadRequestError) {
      throw err;
    }
    throw new CustomServerError("Server error when attempting to send request");
  }
});

exports.deleteRequest = asyncHandler(async (req, res) => {
  const friendId = parseInt(req.params.userId);
  const userId = parseInt(req.user);
  try {
    if (userId === friendId) {
      throw new CustomBadRequestError(
        "You cannot delete a friend request from yourself"
      );
    }

    const friend = await prisma.user.findUnique({
      where: {
        id: friendId,
      },
    });
    if (!friend) {
      throw new CustomNotFoundError(`Friend with id (${friendId}) not found`);
    }

    const existingRequest = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (!existingRequest) {
      throw new CustomBadRequestError("Friend request does not exist");
    }

    if (existingRequest.status === "ACCEPTED") {
      throw new CustomBadRequestError(
        "You cannot delete a request that was already accepted"
      );
    }

    const deletedRequest = await prisma.friend.delete({
      where: {
        id: existingRequest.id,
      },
    });
    res.json({
      success: true,
      message: `Friend request from user with id (${userId}) removed successfully from user with id (${friendId}))`,
      data: deletedRequest,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err;
    }
    if (err instanceof CustomBadRequestError) {
      throw err;
    }
    throw new CustomServerError(
      "Server error when attempting to delete request"
    );
  }
});

exports.getPending = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);
  try {
    const pending = await prisma.friend.findMany({
      where: {
        OR: [{ userId: userId }, { friendId: userId }],
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
      },
    });
    res.json({
      success: true,
      message: "Successfully retrieved pending friend requests",
      data: pending,
    });
  } catch (err) {
    console.error(err);
    throw new CustomServerError(
      "Server error when retrieving pending friend requests"
    );
  }
});

exports.acceptRequest = asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.requestId);
  const userId = parseInt(req.user);
  try {
    const request = await prisma.friend.findUnique({
      where: {
        id: requestId,
      },
    });
    if (!request) {
      throw new CustomBadRequestError(
        `Friend request with id (${requestId}) does not exist`
      );
    }
    if (userId === request.userId) {
      throw new CustomBadRequestError(
        "You cannot accept a friend request that you sent"
      );
    }

    if (userId !== request.friendId) {
      throw new CustomBadRequestError(
        "You can only accept friend requests sent to you"
      );
    }

    if (request.status !== "PENDING") {
      throw new CustomBadRequestError(
        "This friend request has already been processed"
      );
    }

    const acceptedRequest = await prisma.friend.update({
      where: {
        id: requestId,
      },
      data: {
        status: "ACCEPTED",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    const notificationService = new NotificationService(
      req.io,
      req.activeUsers
    );
    notificationService.notifyFriendRequestAccepted(
      userId,
      acceptedRequest.userId
    );

    res.json({
      success: true,
      message: "Friend request successfully accepted",
      data: acceptedRequest,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomBadRequestError) {
      throw err;
    }
    throw new CustomServerError(
      "Server error when attempting to accept request"
    );
  }
});

exports.rejectRequest = asyncHandler(async (req, res) => {
  const requestId = parseInt(req.params.requestId);
  const userId = parseInt(req.user);
  try {
    const request = await prisma.friend.findUnique({
      where: {
        id: requestId,
      },
    });
    if (!request) {
      throw new CustomBadRequestError(
        `Friend request with id (${requestId}) does not exist`
      );
    }
    if (userId === request.userId) {
      throw new CustomBadRequestError(
        "You cannot reject a friend request that you sent"
      );
    }

    if (userId !== request.friendId) {
      throw new CustomBadRequestError(
        "You can only reject friend requests sent to you"
      );
    }

    if (request.status !== "PENDING") {
      throw new CustomBadRequestError(
        "This friend request has already been processed"
      );
    }

    const acceptedRequest = await prisma.friend.update({
      where: {
        id: requestId,
      },
      data: {
        status: "REJECTED",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    res.json({
      success: true,
      message: "Friend request successfully rejected",
      data: acceptedRequest,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomBadRequestError) {
      throw err;
    }
    throw new CustomServerError(
      "Server error when attempting to reject request"
    );
  }
});

exports.removeFriend = asyncHandler(async (req, res) => {
  const friendId = parseInt(req.params.friendId);
  const userId = parseInt(req.user);
  try {
    if (userId === friendId) {
      throw new CustomBadRequestError("You cannot remove yourself as a friend");
    }

    const friend = await prisma.user.findUnique({
      where: {
        id: friendId,
      },
    });
    if (!friend) {
      throw new CustomNotFoundError(`Friend with id (${friendId}) not found`);
    }

    const friendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });
    if (!friendship || friendship.status !== "ACCEPTED") {
      throw new CustomBadRequestError("You are not friends with this user");
    }

    const removedFriend = await prisma.friend.delete({
      where: {
        id: friendship.id,
      },
    });
    res.json({
      success: true,
      message: "Friend successfully removed",
      data: removedFriend,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomBadRequestError) {
      throw err;
    }
    throw new CustomServerError(
      "Server error when attempting to remove friend"
    );
  }
});

exports.getFriendsFromUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const userExists = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!userExists) {
      throw new CustomNotFoundError(`User with id (${userId}) not found`);
    }

    const sentFriends = await prisma.friend.findMany({
      where: {
        userId: userId,
        status: "ACCEPTED",
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
      },
    });

    const receivedFriends = await prisma.friend.findMany({
      where: {
        friendId: userId,
        status: "ACCEPTED",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
      },
    });

    const formattedReceivedFriends = receivedFriends.map((friendship) => ({
      ...friendship,
      friend: friendship.user,
    }));

    const allFriends = [...sentFriends, ...formattedReceivedFriends];

    res.json({
      success: true,
      message: "Friends retrieved successfully",
      data: allFriends,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err;
    }
    throw new CustomServerError("Server error when retrieving friends");
  }
});
