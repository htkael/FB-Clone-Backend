const { Router } = require("express");
const participantRouter = Router();
const participantController = require("../controllers/participantController");

participantRouter.post("/", participantController.addParticipant);

module.exports = participantRouter;
