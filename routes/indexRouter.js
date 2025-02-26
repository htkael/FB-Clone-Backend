const { Router } = require("express");
const indexRouter = Router();
const indexController = require("../controllers/indexController");
const authRouter = require("./authRouter");

indexRouter.get("/", indexController.welcome);
indexRouter.use("/auth", authRouter);

module.exports = indexRouter;
