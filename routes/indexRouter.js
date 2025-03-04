const { Router } = require("express");
const indexRouter = Router();
const indexController = require("../controllers/indexController");
const authRouter = require("./authRouter");
const { validateJWT } = require("../middleware/validators");
const userRouter = require("./userRouter");
const postRouter = require("./postRouter");
const commentRouter = require("./commentRouter");
const postController = require("../controllers/postController");

indexRouter.get("/", indexController.welcome);
indexRouter.use("/auth", authRouter);
indexRouter.use("/users", validateJWT, userRouter);
indexRouter.use("/posts", validateJWT, postRouter);
indexRouter.use("/comments", validateJWT, commentRouter);
indexRouter.use("/feed", validateJWT, postController.getUserFeed);

module.exports = indexRouter;
