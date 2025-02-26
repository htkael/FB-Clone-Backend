const { Router } = require("express");
const authRouter = Router();
const authController = require("../controllers/authController");

authRouter.post("/signup", authController.signup);
authRouter.post("/login", authController.login);

module.exports = authRouter;
