const { Router } = require("express");
const messagesRouter = Router({ mergeParams: true });
const messagesController = require("../controllers/messagesController");

messagesRouter.post("/", messagesController.sendMessage);
messagesRouter.get("/unread", messagesController.getConversationUnreadCount);
messagesRouter.put("/:messageId", messagesController.editMessage);
messagesRouter.delete("/:messageId", messagesController.deleteMessage);

module.exports = messagesRouter;
