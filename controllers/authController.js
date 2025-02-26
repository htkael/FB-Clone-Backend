const asyncHandler = require("express-async-handler");
const { registerValidation } = require("../middleware/validators");
const { validationResult } = require("express-validator");
const { CustomValidationError } = require("../errors/CustomErrors");
const prisma = require("../prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
