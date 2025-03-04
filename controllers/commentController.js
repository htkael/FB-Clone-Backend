const prisma = require("../prisma/client");
const asyncHandler = require("express-async-handler");
const { commentValidation } = require("../middleware/validators");
const {
  CustomServerError,
  CustomNotFoundError,
  CustomUnauthorizedError,
} = require("../errors/CustomErrors");

exports.postComment = [
  commentValidation,
  asyncHandler(async (req, res) => {
    const authorId = parseInt(req.user);
    const postId = parseInt(req.params.postId);
    const content = req.body.content;
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
      });
      if (!post) {
        throw new CustomNotFoundError(`Post with id (${postId}) not found`);
      }

      const comment = await prisma.comment.create({
        data: {
          content,
          authorId,
          postId,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
      res.json({
        success: true,
        message: "Comment created successfully",
        data: comment,
      });
    } catch (err) {
      console.error(err);
      if (err instanceof CustomNotFoundError) {
        throw err; // Let the error handler deal with it
      }
      if (err instanceof CustomUnauthorizedError) {
        throw err; // Let the error handler deal with it
      }
      throw new CustomServerError("Server error when creating comment");
    }
  }),
];

exports.getCommentsFromPost = asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.postId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  try {
    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
    });
    if (!post) {
      throw new CustomNotFoundError(`Post with id (${postId}) not found`);
    }

    const total = await prisma.comment.count({
      where: { postId },
    });

    const comments = await prisma.comment.findMany({
      where: { postId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: "Comments retrieved successfully",
      data: comments,
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
    if (err instanceof CustomUnauthorizedError) {
      throw err; // Let the error handler deal with it
    }
    throw new CustomServerError("Server error when retrieving comments");
  }
});

exports.updateComment = [
  commentValidation,
  asyncHandler(async (req, res) => {
    const commentId = parseInt(req.params.commentId);
    const userId = parseInt(req.user);
    const content = req.body.content;
    try {
      const comment = await prisma.comment.findUnique({
        where: {
          id: commentId,
        },
      });
      if (!comment) {
        throw new CustomNotFoundError(
          `Comment with id (${commentId}) not found`
        );
      }
      if (userId !== comment.authorId) {
        throw new CustomUnauthorizedError(
          "You can only update comments that are yours"
        );
      }

      const updatedComment = await prisma.comment.update({
        where: {
          id: commentId,
        },
        data: {
          content,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Comment updated successfully",
        data: updatedComment,
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
        "Server error when attempting to update comment"
      );
    }
  }),
];

exports.deleteComment = asyncHandler(async (req, res) => {
  const commentId = parseInt(req.params.commentId);
  const userId = parseInt(req.user);

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new CustomNotFoundError(`Comment with id (${commentId}) not found`);
    }
    if (userId !== comment.authorId) {
      throw new CustomUnauthorizedError(
        "You are only allowed to delete comments that are yours"
      );
    }
    await prisma.comment.delete({
      where: {
        id: commentId,
      },
    });
    res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err; // Let the error handler deal with it
    }
    if (err instanceof CustomUnauthorizedError) {
      throw err; // Let the error handler deal with it
    }
    throw new CustomServerError("Server error when deleting comment");
  }
});

exports.getCommentsFromUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new CustomNotFoundError(`User with id (${userId}) not found`);
    }

    const total = await prisma.comment.count({
      where: {
        authorId: userId,
      },
    });

    const comments = await prisma.comment.findMany({
      where: {
        authorId: userId,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
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
      message: "Comments retrieved successfully",
      data: comments,
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
    if (err instanceof CustomUnauthorizedError) {
      throw err; // Let the error handler deal with it
    }
    throw new CustomServerError(
      `Server error when retrieving comments from user with id: ${userId}`
    );
  }
});
