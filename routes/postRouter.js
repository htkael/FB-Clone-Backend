const { Router } = require("express");
const postRouter = Router();
const postController = require("../controllers/postController");
const commentController = require("../controllers/commentController");
const likeController = require("../controllers/likeController");

postRouter.get("/", postController.getPosts);
postRouter.post("/", postController.createPost);
postRouter.get("/:postId/comments", commentController.getCommentsFromPost);
postRouter.post("/:postId/comments", commentController.postComment);
postRouter.post("/:postId/likes", likeController.likePost);
postRouter.get("/:postId/likes", likeController.getLikesFromPost);
postRouter.get("/:postId", postController.getSinglePost);
postRouter.put("/:postId", postController.updatePost);
postRouter.delete("/:postId", postController.deletePost);

module.exports = postRouter;
