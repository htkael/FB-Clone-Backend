const prisma = require("../prisma/client");
const {
  CustomServerError,
  CustomNotFoundError,
  CustomUnauthorizedError,
  CustomValidationError,
} = require("../errors/CustomErrors");
const { postValidation } = require("../middleware/validators");
const asyncHandler = require("express-async-handler");
const { validationResult } = require("express-validator");
const { cloudinary, handleUpload } = require("../services/cloudinary");

exports.getPosts = asyncHandler(async (req, res) => {
  console.log(req.user);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    const total = await prisma.post.count();
    const posts = await prisma.post.findMany({
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
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                profilePicUrl: true,
              },
            },
          },
        },
        likes: {
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

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      message: "Posts retrieved!",
      data: posts,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err;
    }
    throw new CustomServerError("Error retrieving posts");
  }
});

exports.createPost = [
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
    console.log("req", req);
    console.log("headers", req.header);
    console.log("req.body", req.body);
    const { content } = req.body;

    let imageUrl = null;

    if (req.files && req.files.file) {
      console.log("Found files", req.files.file);
      const file = req.files.file;

      const upload = await cloudinary.uploader.upload(file.tempFilePath, {
        resource_type: "auto",
      });

      console.log("Cloudinary upload result:", {
        public_id: upload.public_id,
        url: upload.secure_url,
      });

      imageUrl = upload.secure_url;
    }

    console.log("req.files:", req.files);
    console.log("req.files type:", typeof req.files);
    console.log("Content-Type header:", req.headers["content-type"]);

    const id = parseInt(req.user);
    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        authorId: id,
      },
      include: {
        author: {
          select: {
            username: true,
          },
        },
      },
    });
    res.json({
      success: true,
      message: "Post created successfully",
      post,
    });
  }),
];

exports.getSinglePost = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.postId);
  try {
    const post = await prisma.post.findUnique({
      where: {
        id,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                profilePicUrl: true,
              },
            },
          },
        },
        likes: {
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
    if (!post) {
      throw new CustomNotFoundError("Post not found");
    }
    res.json({
      success: true,
      message: "Post Found",
      post,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err;
    }
    throw new CustomServerError("Server error when retrieving post");
  }
});

exports.updatePost = [
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

    const id = parseInt(req.params.postId);
    const userId = parseInt(req.user);

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new CustomNotFoundError(`Post with id (${id}) not found`);
    }

    if (userId !== post.authorId) {
      throw new CustomUnauthorizedError("You can only update your own post");
    }

    const { content, removeImage } = req.body;
    let imageUrl = post.imageUrl;

    try {
      if (req.files && req.files.image) {
        console.log("Uploading new image for post update");
        const file = req.files.file;

        const upload = await cloudinary.uploader.upload(file.tempFilePath, {
          resource_type: "auto",
        });

        imageUrl = upload.secure_url;

        if (post.imageUrl) {
          try {
            const urlParts = post.imageUrl.split("/");

            const filenameWithExt = urlParts[urlParts.length - 1];

            const publicId = filenameWithExt.split(".")[0];

            const folder = urlParts[urlParts.length - 2];
            const fullPublicId = `${folder}/${publicId}`;

            await cloudinary.uploader.destroy(fullPublicId);
          } catch (deleteError) {
            console.error("Error deleting previous image:", deleteError);
          }
        }
      } else if (removeImage === "true") {
        console.log("Removing image from post");
        imageUrl = null;

        if (post.imageUrl) {
          try {
            const urlParts = post.imageUrl.split("/");

            const filenameWithExt = urlParts[urlParts.length - 1];

            const publicId = filenameWithExt.split(".")[0];

            const folder = urlParts[urlParts.length - 2];
            const fullPublicId = `${folder}/${publicId}`;

            await cloudinary.uploader.destroy(fullPublicId);
          } catch (deleteError) {
            console.error("Error deleting previous image:", deleteError);
          }
        }
      }

      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          content,
          imageUrl,
        },
        include: {
          author: {
            select: {
              username: true,
            },
          },
          comments: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          likes: {
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

      res.json({
        success: true,
        message: "Post updated successfully",
        post: updatedPost,
      });
    } catch (err) {
      console.error(err);
      if (err instanceof CustomNotFoundError) {
        throw err;
      }
      if (err instanceof CustomUnauthorizedError) {
        throw err;
      }
      if (err instanceof CustomValidationError) {
        throw err;
      }
      throw new CustomServerError("Error when updating post");
    }
  }),
];

exports.deletePost = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.postId);
  const userId = parseInt(req.user);
  const post = await prisma.post.findUnique({
    where: { id },
  });
  if (!post) {
    throw new CustomNotFoundError(`Post with id(${id}) not found`);
  }
  if (userId !== post.authorId) {
    throw new CustomUnauthorizedError(
      "You are only allowed to delete your own posts"
    );
  }
  await prisma.post.delete({
    where: { id },
  });
  res.json({
    success: true,
    message: "Post deleted successfully",
  });
});

exports.postsFromUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  console.log(userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
    const total = await prisma.post.count({
      where: { authorId: userId },
    });
    const posts = await prisma.post.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                profilePicUrl: true,
              },
            },
          },
        },
        likes: {
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
    if (posts.length === 0) {
      return res.json({
        success: true,
        message: "No posts found for this user",
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    }
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    res.json({
      success: true,
      message: "Posts retrieved",
      data: posts,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  } catch (err) {
    console.error(err);
    if (err instanceof CustomNotFoundError) {
      throw err;
    }
    if (err instanceof CustomUnauthorizedError) {
      throw err;
    }
    throw new CustomServerError(
      "Server error when retrieving posts from user with id:",
      userId
    );
  }
});

exports.getUserFeed = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const friendships = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: userId, status: "ACCEPTED" },
          { friendId: userId, status: "ACCEPTED" },
        ],
      },
    });
    const friendIds = friendships.map((friendship) => {
      return friendship.userId === userId
        ? friendship.friendId
        : friendship.userId;
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const friendPosts = await prisma.post.findMany({
      where: {
        authorId: { in: friendIds },
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                profilePicUrl: true,
              },
            },
          },
        },
        likes: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const trendingPosts = await prisma.post.findMany({
      where: {
        authorId: { notIn: [...friendIds, userId] },
        createdAt: { gte: oneWeekAgo },
      },
      orderBy: [
        { likes: { _count: "desc" } },
        { comments: { _count: "desc" } },
      ],
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                profilePicUrl: true,
              },
            },
          },
        },
        likes: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const userPosts = await prisma.post.findMany({
      where: {
        authorId: userId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                profilePicUrl: true,
              },
            },
          },
        },
        likes: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const allPosts = [...friendPosts, ...trendingPosts, ...userPosts].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const paginatedPosts = allPosts.slice(skip, skip + limit);

    const total = allPosts.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: "Feed retrieved successfully",
      data: paginatedPosts,
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
      throw err;
    }
    if (err instanceof CustomUnauthorizedError) {
      throw err;
    }
    throw new CustomServerError("Server error when retrieving user feed");
  }
});
