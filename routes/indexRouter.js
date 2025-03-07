const { Router } = require("express");
const indexRouter = Router();
const indexController = require("../controllers/indexController");
const authRouter = require("./authRouter");
const { validateJWT, guestValidator } = require("../middleware/validators");
const userRouter = require("./userRouter");
const postRouter = require("./postRouter");
const commentRouter = require("./commentRouter");
const postController = require("../controllers/postController");
const friendRouter = require("./friendRouter");
const conversationRouter = require("./conversationRouter");
const notificationRouter = require("./notificationRouter");

indexRouter.get("/", indexController.welcome);
indexRouter.use("/auth", authRouter);
indexRouter.use("/users", validateJWT, guestValidator, userRouter);
indexRouter.use("/posts", validateJWT, guestValidator, postRouter);
indexRouter.use("/comments", validateJWT, guestValidator, commentRouter);
indexRouter.get(
  "/feed",
  validateJWT,
  guestValidator,
  postController.getUserFeed
);
indexRouter.use("/friends", validateJWT, guestValidator, friendRouter);
indexRouter.use(
  "/conversations",
  validateJWT,
  guestValidator,
  conversationRouter
);
indexRouter.use(
  "/notifications",
  validateJWT,
  guestValidator,
  notificationRouter
);

module.exports = indexRouter;
