const prisma = require("../prisma/client");
const {
  CustomServerError,
  CustomNotFoundError,
  CustomUnauthorizedError,
} = require("../errors/CustomErrors");
const { postValidation } = require("../middleware/validators");
const asyncHandler = require("express-async-handler");

exports.getPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || "createdAt";
  const order = req.query.order?.toLowerCase() === "asc" ? "asc" : "desc";
  const sort = { [sortBy]: order };
  try {
    const total = await prisma.post.count();
    const posts = await prisma.post.findMany({
      skip,
      take: limit,
      orderBy: sort,
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!posts) {
      throw new CustomNotFoundError("Posts not found");
    }

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
    throw new CustomServerError("Error retrieving posts");
  }
});

exports.createPost = [
  postValidation,
  asyncHandler(async (req, res) => {
    const { content, imageUrl } = req.body;
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
