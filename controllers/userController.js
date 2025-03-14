const prisma = require("../prisma/client");
const {
  CustomServerError,
  CustomNotFoundError,
  CustomUnauthorizedError,
} = require("../errors/CustomErrors");

const asyncHandler = require("express-async-handler");

exports.getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const currentUserId = parseInt(req.user);

  const users = await prisma.user.findMany({
    skip,
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      profilePicUrl: true,
      bio: true,
      createdAt: true,
      status: true,
      _count: {
        select: {
          posts: true,
          sentFriends: {
            where: { status: "ACCEPTED" },
          },
          receivedFriends: {
            where: { status: "ACCEPTED" },
          },
        },
      },
    },
  });

  if (currentUserId) {
    const userIds = users.map((user) => user.id);

    const friendships = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: currentUserId, friendId: { in: userIds } },
          { userId: { in: userIds }, friendId: currentUserId },
        ],
      },
      select: {
        userId: true,
        friendId: true,
        status: true,
      },
    });

    users.forEach((user) => {
      const friendship = friendships.find((f) => {
        return (
          (f.userId === currentUserId && f.friendId === user.id) ||
          (f.userId === user.id && f.friendId === currentUserId)
        );
      });

      user.relationship = friendship
        ? {
            status: friendship.status,
            isFriend: friendship.status === "ACCEPTED",
          }
        : { status: null, isFriend: false };

      user.friendCount = user._count.sentFriends + user._count.receivedFriends;
      user.postCount = user._count.posts;
      delete user._count;
    });
  }

  const total = await prisma.user.count();
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  res.json({
    success: true,
    message: "Users retrieved successfully",
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    },
  });
});

exports.getUserById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.userId);
  const currentUserId = parseInt(req.user);
  console.log("ID:", id);
  try {
    const user = await prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        profilePicUrl: true,
        bio: true,
        createdAt: true,
        status: true,
      },
    });
    if (!user) {
      throw new CustomNotFoundError(`User with id (${id}) not found`);
    }

    const postCount = await prisma.post.count({
      where: {
        authorId: id,
      },
    });

    const friendCount = await prisma.friend.count({
      where: {
        OR: [
          { userId: id, status: "ACCEPTED" },
          { friendId: id, status: "ACCEPTED" },
        ],
      },
    });

    let isFriend = false;
    let friendshipStatus = null;

    if (currentUserId) {
      const friendship = await prisma.friend.findFirst({
        where: {
          OR: [
            { userId: currentUserId, friendId: id },
            { userId: id, friendId: currentUserId },
          ],
        },
      });
      if (friendship) {
        friendshipStatus = friendship.status;
        isFriend = friendship.status === "ACCEPTED";
      }
    }

    res.json({
      success: true,
      message: "User Found!",
      data: {
        ...user,
        stats: {
          postCount,
          friendCount,
        },
        relationship: {
          isFriend,
          friendshipStatus,
        },
      },
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err; // Let the error handler deal with it
    }
    if (err instanceof CustomUnauthorizedError) {
      throw err; // Let the error handler deal with it
    }
    throw new CustomServerError(
      "Internal Server Error when finding single user."
    );
  }
});

exports.updateUser = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.userId);
  if (req.user !== id) {
    throw new CustomUnauthorizedError(
      "User not authorized to make changes to profile"
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      profilePicUrl: true,
      bio: true,
      createdAt: true,
      status: true,
    },
  });
  if (!user) {
    throw new CustomNotFoundError("User not found");
  }
  const { firstName, lastName, profilePicUrl, bio } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        profilePicUrl: true,
        bio: true,
        createdAt: true,
        status: true,
      },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(profilePicUrl !== undefined && { profilePicUrl }),
        ...(bio !== undefined && { bio }),
      },
    });
    res.json({
      success: true,
      message: "User successfully updated",
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err; // Let the error handler deal with it
    }
    if (err instanceof CustomUnauthorizedError) {
      throw err; // Let the error handler deal with it
    }
    throw new CustomServerError("Server error while updating user");
  }
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.userId);
  const userId = parseInt(req.user);
  if (userId !== id) {
    throw new CustomUnauthorizedError("User not authorized to delete account");
  }
  const user = await prisma.user.findUnique({ where: { id: id } });
  if (!user) {
    throw new CustomNotFoundError("User does not exist");
  }
  try {
    const deletedUser = await prisma.user.delete({
      where: { id: id },
    });
    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err; // Let the error handler deal with it
    }
    if (err instanceof CustomUnauthorizedError) {
      throw err; // Let the error handler deal with it
    }
    throw new CustomServerError("Server error when attempting to delete user");
  }
});

exports.searchUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, limit = 30, page = 1 } = req.query;
  const searchCriteria = {};
  if (firstName)
    searchCriteria.firstName = { contains: firstName, mode: "insensitive" };
  if (lastName)
    searchCriteria.lastName = { contains: lastName, mode: "insensitive" };
  if (username)
    searchCriteria.username = { contains: username, mode: "insensitive" };

  const skip = parseInt(page - 1) * parseInt(limit);
  const take = parseInt(limit);
  const currentUserId = parseInt(req.user);

  try {
    console.log("username", username);
    const users = await prisma.user.findMany({
      where: searchCriteria,
      take,
      skip,
      orderBy: { username: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        profilePicUrl: true,
      },
    });

    const total = await prisma.user.count({
      where: searchCriteria,
    });
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const usersWithRelationship = await Promise.all(
      users.map(async (user) => {
        let isFriend = false;
        let friendshipStatus = null;

        if (currentUserId) {
          const friendship = await prisma.friend.findFirst({
            where: {
              OR: [
                { userId: currentUserId, friendId: user.id },
                { userId: user.id, friendId: currentUserId },
              ],
            },
          });

          if (friendship) {
            friendshipStatus = friendship.status;
            isFriend = friendship.status === "ACCEPTED";
          }
        }

        return {
          ...user,
          relationship: {
            isFriend,
            friendshipStatus,
          },
        };
      })
    );

    res.json({
      success: true,
      data: usersWithRelationship,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  } catch (err) {
    console.error(err);
    throw new CustomServerError("Error searching for users");
  }
});
