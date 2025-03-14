const { Router } = require("express");
const userRouter = Router();
const userController = require("../controllers/userController");
const postController = require("../controllers/postController");
const commentController = require("../controllers/commentController");
const likeController = require("../controllers/likeController");
const friendController = require("../controllers/friendController");

userRouter.get("/", userController.getUsers);
userRouter.get("/search", userController.searchUser);
userRouter.get("/:userId/posts", postController.postsFromUser);
userRouter.get("/:userId/comments", commentController.getCommentsFromUser);
userRouter.get("/:userId/likes", likeController.getLikesFromUser);
userRouter.get("/:userId/friends", friendController.getFriendsFromUser);
userRouter.get("/:userId", userController.getUserById);
userRouter.put("/:userId", userController.updateUser);
userRouter.delete("/:userId", userController.deleteUser);

module.exports = userRouter;
