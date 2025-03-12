const express = require("express");
const app = express();
require("dotenv").config();
const indexRouter = require("./routes/indexRouter");
const errorHandler = require("./errors/errorHandler");
const cors = require("cors");
const http = require("http");
const setupSocketIO = require("./middleware/socketSetup");
const server = http.createServer(app);
const { io, socketMiddleware } = setupSocketIO(server);
const { scheduleGuestCleanup } = require("./utils/scheduledTasks");

console.log("Server Start");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(socketMiddleware);

scheduleGuestCleanup();

app.use("/api", indexRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("FB Clone listening on Port", PORT);
});
