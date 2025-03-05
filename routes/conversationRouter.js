const { Router } = require("express");
const conversationRouter = Router();
const conversationController = require("../controllers/conversationController");
const participantRouter = require("./participantRouter");

conversationRouter.get("/", conversationController.getConversations);
conversationRouter.post("/", conversationController.createConversation);
conversationRouter.use("/:conversationId/participants", participantRouter);
conversationRouter.get(
  "/:conversationId",
  conversationController.getSpecificConversation
);
conversationRouter.put("/:conversationId", conversationController.updateTitle);
module.exports = conversationRouter;
