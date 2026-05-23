import cron from "node-cron";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "./socket.js";

/**
 * Start the message scheduler — runs every minute to deliver scheduled messages
 */
export function startScheduler() {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const pendingMessages = await Message.find({
        scheduledAt: { $lte: now },
        isDelivered: false,
      });

      for (const message of pendingMessages) {
        // Mark as delivered
        message.isDelivered = true;
        message.scheduledAt = null;
        await message.save();

        // Send via socket if receiver is online
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newMessage", message);
        }

        // Also notify the sender that the message was delivered
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("scheduledMessageDelivered", message);
        }

        console.log(`Scheduled message ${message._id} delivered`);
      }
    } catch (error) {
      console.error("Scheduler error:", error.message);
    }
  });

  console.log("Message scheduler started (runs every minute)");
}
