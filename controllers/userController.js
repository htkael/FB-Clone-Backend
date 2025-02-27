const prisma = require("../prisma/client");
const { CustomServerError } = require("../errors/CustomErrors");

const asyncHandler = require("express-async-handler");

exports.getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  try {
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
      },
    });
  } catch (err) {
    throw new CustomServerError("Internal Server Error when retrieving users");
  }

  const totalUsers = await prisma.user.count();

  res.json({
    success: true,
    message: "Users retrieved successfully",
    users,
    pagination: {
      total: totalUsers,
      page,
      limit,
      pages: Math.ceil(totalUsers / limit),
    },
  });
});
