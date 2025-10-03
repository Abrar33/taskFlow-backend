const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const deadlineCron = require("./utils/backendCron");
const connectDB = require("./Config/db");
require("dotenv").config();

const userRoutes = require("./Routes/user-route");
const boardRoutes = require("./Routes/board-routes");
const taskRoutes = require("./Routes/task-routes");
const notificationRoutes = require("./Routes/notifications-routes");

const port = process.env.PORT || 3000;
connectDB();

// ✅ Middleware
const allowedOrigin = process.env.CLIENT_URL || "*";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("API is running...");
});

// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);

// ✅ Create HTTP server
const server = http.createServer(app);

// ✅ Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
deadlineCron(io); // Start the cron job with io instance
// Make io accessible in controllers
app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
   socket.on("joinUser", (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined user room ${userId}`);
  });
  // Join a board room
  socket.on("joinBoard", (boardId) => { 
    socket.join(boardId);
    console.log(`User ${socket.id} joined board ${boardId}`);
  });

  


  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
