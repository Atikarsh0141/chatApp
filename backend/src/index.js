import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";

import path from "path";

import { connectDB } from "./lib/db.js";
import { startScheduler } from "./lib/scheduler.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import aiRoutes from "./routes/ai.route.js";
import analyticsRoutes from "./routes/analytics.route.js";
import scheduleRoutes from "./routes/schedule.route.js";
import friendRoutes from "./routes/friend.route.js";
import groupRoutes from "./routes/group.route.js";
import developerRoutes from "./routes/developer.route.js";
import feedRoutes from "./routes/feed.route.js";
import { app, server } from "./lib/socket.js";
import User from "./models/user.model.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/developers", developerRoutes);
app.use("/api/feed", feedRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Migrate existing users without uniqueId
async function migrateUniqueIds() {
  try {
    const usersWithoutId = await User.find({
      $or: [{ uniqueId: null }, { uniqueId: { $exists: false } }],
    });
    for (const user of usersWithoutId) {
      user.uniqueId = "CHATTY-" + crypto.randomBytes(3).toString("hex").toUpperCase();
      await user.save();
      console.log(`Assigned uniqueId ${user.uniqueId} to ${user.fullName}`);
    }
    if (usersWithoutId.length > 0) {
      console.log(`Migrated ${usersWithoutId.length} users with uniqueId`);
    }
  } catch (error) {
    console.error("Migration error:", error.message);
  }
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB().then(() => {
    migrateUniqueIds();
  });
  startScheduler();
});
