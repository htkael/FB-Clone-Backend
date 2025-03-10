const { Router } = require("express");
const authRouter = Router();
const authController = require("../controllers/authController");
const { validateJWT, guestValidator } = require("../middleware/validators");

authRouter.post("/signup", authController.signup);
authRouter.post("/login", authController.login);
authRouter.post("/logout", validateJWT, guestValidator, authController.logout);
authRouter.post("/guest-login", authController.guestLogin);

module.exports = authRouter;
