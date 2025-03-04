const { Router } = require("express");
const friendRouter = Router();
const friendController = require("../controllers/friendController");

friendRouter.post("/request/:userId", friendController.sendRequest);
friendRouter.delete("/request/:userId", friendController.deleteRequest);
friendRouter.get("/requests/pending", friendController.getPending);
friendRouter.put("/request/:requestId/accept", friendController.acceptRequest);
friendRouter.put("/request/:requestId/reject", friendController.rejectRequest);
friendRouter.delete("/friends/:friendId", friendController.removeFriend);

module.exports = friendRouter;
