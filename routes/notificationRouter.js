const { Router } = require("express");
const notificationRouter = Router();
const notificationController = require("../controllers/notifcationController");

notificationRouter.get("/", notificationController.getNotifications);
notificationRouter.get("/unread", notificationController.getUnreadCount);
notificationRouter.put("/mark-all-read", notificationController.markAllAsRead);
notificationRouter.put(
  "/:notificationId/read",
  notificationController.markAsRead
);
notificationRouter.delete(
  "/:notificationId",
  notificationController.deleteNotification
);
