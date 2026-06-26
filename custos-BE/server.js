const path = require("node:path");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const escalateRoutes = require("./routes/escalateRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const { errorHandler } = require("./middlewares/errorHandler");
const mailRoutes = require("./routes/mailRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set([
  process.env.CLIENT_URL || "http://localhost:3000",
  "https://app.getzoikovertex.com",
  "https://getzoikovertex.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5175",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ success: true, service: "zt-chatbot-server", status: "running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/escalate", escalateRoutes);
app.use("/api", chatbotRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/upload", uploadRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(errorHandler);

// Supabase is cloud-hosted — connectDB just verifies the connection
connectDB().finally(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
      return;
    }
    console.error("Server failed to start.", error);
  });
});