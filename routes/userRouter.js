const { Router } = require("express");
const userRouter = Router();
const userController = require("../controllers/userController");

userRouter.get("/", userController.getUsers);
userRouter.get("/search", userController.searchUser);
userRouter.get("/:userId", userController.getUserById);
userRouter.put("/:userId", userController.updateUser);
userRouter.delete("/:userId", userController.deleteUser);

module.exports = userRouter;
