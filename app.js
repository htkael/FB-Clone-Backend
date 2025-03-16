require("dotenv").config();
const express = require("express");
const app = express();
const indexRouter = require("./routes/indexRouter");
const errorHandler = require("./errors/errorHandler");
const cors = require("cors");
const http = require("http");
const setupSocketIO = require("./middleware/socketSetup");
const server = http.createServer(app);
const { io, socketMiddleware } = setupSocketIO(server);
const { scheduleGuestCleanup } = require("./utils/scheduledTasks");
const fileUpload = require("express-fileupload");

console.log("Server Start");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
  })
);
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
