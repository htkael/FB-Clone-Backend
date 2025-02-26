const express = require("express");
const app = express();
require("dotenv").config();
const indexRouter = require("./routes/indexRouter");
const errorHandler = require("./errors/errorHandler");

console.log("Server Start");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api", indexRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("FB Clone listening on Port", PORT);
});
