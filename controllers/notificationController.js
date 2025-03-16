const asyncHandler = require("express-async-handler");
const prisma = require("../prisma/client");
const {
  CustomNotFoundError,
  CustomBadRequestError,
  CustomServerError,
} = require("../errors/CustomErrors");

exports.getNotifications = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const total = await prisma.notification.count({
      where: {
        userId: userId,
      },
    });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            profilePicUrl: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: "Notifications retrieved successfully",
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        unreadCount: await prisma.notification.count({
          where: { userId, isRead: false },
        }),
      },
    });
  } catch (err) {
    console.error(err);
    throw new CustomServerError("Server error when retrieving notifications");
  }
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);
  const notificationId = parseInt(req.params.notificationId);

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new CustomNotFoundError(
        `Notification with id (${notificationId}) not found`
      );
    }

    if (notification.userId !== userId) {
      throw new CustomBadRequestError(
        "You can only mark your own notifications as read"
      );
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: "Notification marked as read",
      data: updatedNotification,
    });
  } catch (err) {
    console.error(err);
    if (
      err instanceof CustomNotFoundError ||
      err instanceof CustomBadRequestError
    ) {
      throw err;
    }
    throw new CustomServerError(
      "Server error when marking notification as read"
    );
  }
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);

  try {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    console.error(err);
    throw new CustomServerError(
      "Server error when marking all notifications as read"
    );
  }
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);

  try {
    await prisma.notification.deleteMany({
      where: { userId },
    });

    res.json({
      success: true,
      message: "Notifications deleted successfully",
    });
  } catch (err) {
    console.error(err);
    if (
      err instanceof CustomNotFoundError ||
      err instanceof CustomBadRequestError
    ) {
      throw err;
    }
    throw new CustomServerError("Server error when deleting notification");
  }
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const userId = parseInt(req.user);

  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({
      success: true,
      message: "Unread notification count retrieved",
      data: { count },
    });
  } catch (err) {
    console.error(err);
    throw new CustomServerError(
      "Server error when retrieving unread notification count"
    );
  }
});
