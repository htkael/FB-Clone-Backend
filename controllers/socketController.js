const asyncHandler = require("express-async-handler");
const prisma = require("../prisma/client");
const SocketService = require("../services/socketService");

exports.setupSocketEvents = (io) => {
  io.on(`connection`, (socket) => {
    const userId = socket.userId;

    socket.on("user:typing:start", async (data) => {
      try {
        const { conversationId } = data;

        const isParticipant = await prisma.conversationParticipant.findUnique({
          where: {
            userId_conversationId: {
              userId,
              conversationId: parseInt(conversationId),
            },
          },
        });
        if (!isParticipant) return;

        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            username: true,
          },
        });

        if (socket.typingTimeout) {
          clearTimeout(socket.typingTimeout);
        }

        socket.typingTimeout = setTimeout(() => {
          // Notify that typing stopped
          const socketService = new SocketService(io, socket.activeUsers);
          socketService.notifyUserStoppedTyping(conversationId, userId);
        }, 3000);

        const socketService = new SocketService(io, socket.activeUsers);
        socketService.notifyUserTyping(conversationId, userId, user.username);
      } catch (err) {
        console.error("Typing notification error", err);
      }
    });

    socket.on("message:read", async (data) => {
      try {
        const { conversationId, messageId } = data;
        await prisma.conversationParticipant.update({
          where: {
            userId_conversationId: {
              userId,
              conversationId: parseInt(conversationId),
            },
          },
          data: {
            lastReadAt: new Date(),
          },
        });

        const socketService = new SocketService(io, socket.activeUsers);
        socketService.notifyMessageRead(conversationId, userId, messageId);
      } catch (error) {
        console.error("Message read notification error:", error);
      }
    });

    socket.on("notification:read", async (data) => {
      try {
        const { notificationIds } = data;
        await prisma.notification.updateMany({
          where: {
            id: {
              in: notificationIds,
            },
          },
          data: {
            isRead: true,
          },
        });
        const socketService = new SocketService(io, socket.activeUsers);
        socketService.notifyNotificationsRead(userId, notificationIds);
      } catch (err) {
        console.error("Notification read error:", err);
      }
    });

    socket.on("notification:read:all", async (data) => {
      try {
        await prisma.notification.updateMany({
          where: {
            userId,
          },
          data: {
            isRead: true,
          },
        });
        const socketService = new SocketService(io, socket.activeUsers);
        socketService.notifyNotificationsReadAll(userId);
      } catch (err) {
        console.error("Notification read error:", err);
      }
    });

    socket.on("notification:clear", async (data) => {
      try {
        await prisma.notification.deleteMany({
          where: {
            userId,
          },
        });
        const socketService = new SocketService(io, socket.activeUsers);
        socketService.notifyNotificationsCleared(userId);
      } catch (err) {
        console.error("Notification read error:", err);
      }
    });

    socket.on("test:notification", () => {
      console.log(`Testing notification for user: ${socket.userId}`);
      io.to(`user:${socket.userId}`).emit("notification:new", {
        id: Date.now(),
        type: "test",
        content: "This is a test notification",
        userId: socket.userId,
        createdAt: new Date(),
        isRead: false,
        // Add any other fields needed for your notification
      });
    });
  });
};
