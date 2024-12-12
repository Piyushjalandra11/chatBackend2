const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const http = require("http");
const { Server } = require("socket.io");

// Express app setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://192.168.100.104:3000", "http://192.168.100.112:3000",], // Update with your frontend IP
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL setup
const pool = new Pool({
  user: "postgres",
  host: "localhost", 
  database: "chat_app",
  password: "Piyush@123",
  port: 5432,
});

// User Signup Endpoint
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists." });
    }

    await pool.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", [
      username,
      email,
      password,
    ]);
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// User Login Endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1 AND password = $2", [email, password]);
    if (user.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.status(200).json({ username: user.rows[0].username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Get Users Endpoint
app.get("/users", async (req, res) => {
  try {
    const users = await pool.query("SELECT id, email FROM users");
    res.status(200).json(users.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Socket.io setup
let connectedUsers = [];

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Register user
  socket.on("registerUser", (userId) => {
    const user = {
      userId:userId,
      socketId:socket.id
    }
    connectedUsers.push(user)
    console.log(`User registered: ${userId} -> Socket ID: ${socket.id}`);
  });

  // Send message
  socket.on("sendMessage", (msgData) => {
    const { receiverID, text, senderName } = msgData;
    console.log("connectedUsers",connectedUsers);
    

    const receivers = connectedUsers.filter(user=>user.userId=receiverID)
    console.log("---",receivers);
    

    receivers.forEach(user=>{
      io.to(user.socketId).emit("receiveMessage", msgData);
    })
  
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Remove disconnected user
    Object.keys(connectedUsers).forEach((userId) => {
      if (connectedUsers[userId] === socket.id) {
        delete connectedUsers[userId];
      }
    });
  });
});


// Start server
const PORT = 4000;
server.listen(PORT, "192.168.101.89", () => {
  console.log(`Server running on http://192.168.101.89:${PORT}`);
});