import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Mark messages as seen when user opens a chat
  socket.on("markAsSeen", async ({ senderId, receiverId }) => {
    try {
      const result = await Message.updateMany(
        {
          senderId,
          receiverId,
          status: { $in: ["sent", "delivered"] },
          isDelivered: true,
        },
        { status: "seen" }
      );

      if (result.modifiedCount > 0) {
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messagesSeen", { by: receiverId });
        }
      }
    } catch (error) {
      console.error("Error marking messages as seen:", error.message);
    }
  });

  // ---- WebRTC Signaling for Voice/Video Calls ----

  // Initiate a call
  socket.on("callUser", ({ to, offer, callType, callerInfo }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", {
        from: userId,
        offer,
        callType, // "voice" or "video"
        callerInfo,
      });
    } else {
      // User is offline
      socket.emit("callFailed", { reason: "User is offline" });
    }
  });

  // Answer a call
  socket.on("callAccepted", ({ to, answer }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", { answer });
    }
  });

  // Reject a call
  socket.on("callRejected", ({ to }) => {
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRejected");
    }
  });

  // End a call
  socket.on("callEnded", ({ to }) => {
    const otherSocketId = getReceiverSocketId(to);
    if (otherSocketId) {
      io.to(otherSocketId).emit("callEnded");
    }
  });

  // ---- Typing Indicators ----

  socket.on("typing", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { from: userId });
    }
  });

  socket.on("stopTyping", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { from: userId });
    }
  });

  // ICE candidate exchange
  socket.on("iceCandidate", ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("iceCandidate", { candidate });
    }
  });

  // ---- Live Code Collaboration ----

  socket.on("joinCodePad", ({ groupId }) => {
    // Join a socket room specific to the code pad of this group
    socket.join(`code-pad-${groupId}`);
  });

  socket.on("codeChange", ({ groupId, code }) => {
    // Broadcast code changes to others in the room
    socket.to(`code-pad-${groupId}`).emit("codeChange", { code });
  });

  socket.on("requestSync", ({ groupId }) => {
    // Ask others in the room for the current code state
    socket.to(`code-pad-${groupId}`).emit("syncRequested", { socketId: socket.id });
  });

  socket.on("provideSync", ({ targetSocketId, code }) => {
    // Provide the current code state to the requester
    io.to(targetSocketId).emit("codeChange", { code });
  });

  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Update lastSeen timestamp
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      } catch (error) {
        console.error("Error updating lastSeen:", error.message);
      }
    }
  });
});

export { io, app, server };
