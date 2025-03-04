const {
  CustomNotFoundError,
  CustomServerError,
} = require("../errors/CustomErrors");
const prisma = require("../prisma/client");
const asyncHandler = require("express-async-handler");

exports.likePost = asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = parseInt(req.user);
  try {
    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
    });
    if (!post) {
      throw new CustomNotFoundError(`Post with id (${postId}) not found`);
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: userId,
          postId: postId,
        },
      },
    });
    if (existingLike) {
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: userId,
            postId: postId,
          },
        },
      });

      return res.json({
        success: true,
        message: "Post unliked successfully",
        liked: false,
      });
    }

    const like = await prisma.like.create({
      data: {
        userId: userId,
        postId: postId,
      },
    });

    res.json({
      success: true,
      message: "Post liked successfully",
      liked: true,
      data: like,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err; // Let the error handler deal with it
    }
    throw new CustomServerError("Server error when attempting to toggle like");
  }
});

exports.getLikesFromPost = asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.postId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    const total = await prisma.like.count({
      where: {
        postId: postId,
      },
    });
    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
    });
    if (!post) {
      throw new CustomNotFoundError(`Post with id (${postId}) not found`);
    }
    const likes = await prisma.like.findMany({
      skip,
      take: limit,
      orderBy: { id: "desc" },
      where: {
        postId: postId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      message: `Likes from post with id ${postId} retrieved successfully`,
      data: likes,
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
    if (err instanceof CustomNotFoundError) {
      throw err; // Let the error handler deal with it
    }
    throw new CustomServerError(
      `Server error when retrieving likes from post with id (${postId})`
    );
  }
});

exports.getLikesFromUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    const total = await prisma.like.count({
      where: {
        userId: userId,
      },
    });

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new CustomNotFoundError(`User with id (${userId}) not found`);
    }
    const likes = await prisma.like.findMany({
      skip,
      take: limit,
      orderBy: { id: "desc" },
      where: {
        userId: userId,
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
            author: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      message: `Likes from user with id (${userId}) retrieved successfully`,
      data: likes,
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
    if (err instanceof CustomNotFoundError) {
      throw err; // Let the error handler deal with it
    }
    throw new CustomServerError(
      `Server error when retrieving likes from user with id (${userId})`
    );
  }
});
