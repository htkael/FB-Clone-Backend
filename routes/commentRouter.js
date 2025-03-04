const { Router } = require("express");
const commentRouter = Router();
const commentController = require("../controllers/commentController");

commentRouter.put("/:commentId", commentController.updateComment);
commentRouter.delete("/:commentId", commentController.deleteComment);

module.exports = commentRouter;
