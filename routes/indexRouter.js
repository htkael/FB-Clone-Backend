const { Router } = require("express");
const indexRouter = Router();
const indexController = require("../controllers/indexController");
const authRouter = require("./authRouter");
const { validateJWT } = require("../middleware/validators");
const userRouter = require("./userRouter");

indexRouter.get("/", indexController.welcome);
indexRouter.use("/auth", authRouter);
indexRouter.use("/users", validateJWT, userRouter);

module.exports = indexRouter;
