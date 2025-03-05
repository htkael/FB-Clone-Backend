const { Router } = require("express");
const conversationRouter = Router();
const conversationController = require("../controllers/conversationController");
const participantRouter = require("./participantRouter");
const messagesRouter = require("./messagesRouter");

conversationRouter.get("/", conversationController.getConversations);
conversationRouter.post("/", conversationController.createConversation);
conversationRouter.use("/:conversationId/participants", participantRouter);
conversationRouter.use("/:conversationId/messages", messagesRouter);
conversationRouter.get(
  "/:conversationId",
  conversationController.getSpecificConversation
);
conversationRouter.put("/:conversationId", conversationController.updateTitle);
module.exports = conversationRouter;
