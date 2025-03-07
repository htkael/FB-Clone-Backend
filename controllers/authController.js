const asyncHandler = require("express-async-handler");
const {
  registerValidation,
  loginValidation,
} = require("../middleware/validators");
const { validationResult } = require("express-validator");
const {
  CustomValidationError,
  CustomNotFoundError,
} = require("../errors/CustomErrors");
const prisma = require("../prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const SocketService = require("../services/socketService");
const { generateGravatarUrl } = require("../utils/gravatar");

exports.signup = [
  registerValidation,
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
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const username = req.body.username;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const profilePicUrl = generateGravatarUrl(email);

    const existingEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingEmail) {
      throw new CustomValidationError(
        "Validation Failed",
        [{ param: "email", message: "Email already in use" }],
        req.body
      );
    }
    const existingUsername = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (existingUsername) {
      throw new CustomValidationError(
        "Validation Failed",
        [{ param: "username", message: "Username already in use" }],
        req.body
      );
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        username,
        password: hashedPassword,
        profilePicUrl,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      success: true,
      message: "User created successfully!",
      user: userWithoutPassword,
    });
  }),
];

exports.login = [
  loginValidation,
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
    const { email, username, password } = req.body;
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: email || "" }, { username: username || "" }],
      },
    });

    if (!user) {
      throw new CustomNotFoundError("Invalid credentials");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new CustomNotFoundError("Invalid credentials");
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "5h",
    });

    const { password: _, ...userWithoutPassword } = user;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastSeen: null,
      },
    });

    if (req.io) {
      const socketService = new SocketService(req.io, req.activeUsers);
      socketService.broadcastToAll("user:status", {
        userId: user.id,
        status: "online",
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  }),
];

exports.logout = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);

  try {
    // Update user's online status
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: false,
        lastSeen: new Date(),
      },
    });

    // Broadcast user offline status
    if (req.io) {
      const socketService = new SocketService(req.io, req.activeUsers);
      socketService.broadcastToAll("user:status", {
        userId,
        status: "offline",
        lastSeen: new Date(),
      });
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error(err);
    throw new CustomServerError("Server error during logout");
  }
});
