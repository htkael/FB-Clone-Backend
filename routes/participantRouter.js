const { Router } = require("express");
const participantRouter = Router();
const participantController = require("../controllers/participantController");

participantRouter.post("/", participantController.addParticipant);
participantRouter.delete("/", participantController.removeSelf);
participantRouter.get("/", participantController.getParticipants);

module.exports = participantRouter;
