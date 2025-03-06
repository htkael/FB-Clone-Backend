const { Server } = require("socket.io");
const { CustomUnauthorizedError } = require("../errors/CustomErrors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const socketController = require("../controllers/socketController");

function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const activeUsers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(
        new CustomUnauthorizedError("Authentication token required (socket)")
      );
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      return next(
        new CustomUnauthorizedError("Invalid authentication token (socket)")
      );
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    socket.activeUsers = activeUsers;
    console.log(`User connected ${userId}`);

    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);

    socket.broadcast.emit("user:online", { userId });

    socket.join(`user:${userId}`);

    socket.on("conversation:join", (conversationId) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);

      if (activeUsers.has(userId)) {
        activeUsers.get(userId).delete(socket.id);
        if (activeUsers.get(userId).size === 0) {
          activeUsers.delete(userId);
          socket.broadcast.emit("user:offline", { userId });
        }
      }
    });
  });

  socketController.setupSocketEvents(io);

  const socketMiddleware = (req, res, next) => {
    req.io = io;
    req.activeUsers = activeUsers;
    next();
  };

  return { io, socketMiddleware };
}

module.exports = setupSocketIO;
