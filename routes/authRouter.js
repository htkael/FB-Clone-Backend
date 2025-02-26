const { Router } = require("express");
const authRouter = Router();
const authController = require("../controllers/authController");

authRouter.get("/signup", authController.signup);

module.exports = authRouter;
