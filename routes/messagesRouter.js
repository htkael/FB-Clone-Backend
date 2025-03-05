const { Router } = require("express");
const messagesRouter = Router();
const messagesController = require("../controllers/messagesController");

messagesRouter.post("/", messagesController.sendMessage);

module.exports = messagesRouter;
