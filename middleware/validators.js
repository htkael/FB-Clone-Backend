const { body } = require("express-validator");
const jwt = require("jsonwebtoken");
const { CustomUnauthorizedError } = require("../errors/CustomErrors");
require("dotenv").config();

const registerValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 1, max: 20 })
    .withMessage("First name must be between 1 and 20 characters")
    .isString()
    .withMessage("First name must be a string"),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 1, max: 20 })
    .withMessage("Last name must be between 1 and 20 characters")
    .isString()
    .withMessage("Last name must be a string"),
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isAlphanumeric()
    .withMessage("Username can only contain letters and numbers")
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3 and 20 characters"),
  body("email")
    .normalizeEmail()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must contain at least 8 characters")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage("Password must contain at least one special character"),
  body("password_conf").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
];

const loginValidation = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address"),
  body("username")
    .optional()
    .isString()
    .withMessage("Please provide a valid username"),
  body("password").notEmpty().withMessage("Password is required"),
  body().custom((body) => {
    if (!body.email && !body.username) {
      throw new Error("Either email or username is required");
    }
    return true;
  }),
];

const validateJWT = async (req, res, next) => {
  const bearerHeader = req.headers["authorization"];
  if (!bearerHeader) {
    return next(new CustomUnauthorizedError());
  } else {
    const bearerToken = bearerHeader.split(" ")[1];
    jwt.verify(bearerToken, process.env.JWT_SECRET, (err, authData) => {
      if (err) {
        return next(new CustomUnauthorizedError("Invalid or expired token"));
      } else {
        req.user = authData.userId;
        next();
      }
    });
  }
};

module.exports = { registerValidation, loginValidation, validateJWT };
