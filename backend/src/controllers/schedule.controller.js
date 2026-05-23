import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

/**
 * Schedule a message for later delivery
 */
export const scheduleMessage = async (req, res) => {
  try {
    const { text, image, scheduledAt } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!scheduledAt) {
      return res.status(400).json({ message: "scheduledAt is required" });
    }

    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate <= new Date()) {
      return res.status(400).json({ message: "Scheduled time must be in the future" });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image,
      scheduledAt: scheduleDate,
      isDelivered: false,
    });

    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in scheduleMessage:", error.message);
    res.status(500).json({ message: "Failed to schedule message" });
  }
};

/**
 * Get scheduled (pending) messages for the logged-in user
 */
export const getScheduledMessages = async (req, res) => {
  try {
    const userId = req.user._id;

    const scheduled = await Message.find({
      senderId: userId,
      isDelivered: false,
      scheduledAt: { $ne: null },
    })
      .populate("receiverId", "fullName profilePic")
      .sort({ scheduledAt: 1 });

    res.status(200).json(scheduled);
  } catch (error) {
    console.log("Error in getScheduledMessages:", error.message);
    res.status(500).json({ message: "Failed to get scheduled messages" });
  }
};

/**
 * Cancel a scheduled message
 */
export const cancelScheduledMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOne({
      _id: messageId,
      senderId: userId,
      isDelivered: false,
    });

    if (!message) {
      return res.status(404).json({ message: "Scheduled message not found" });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({ message: "Scheduled message cancelled" });
  } catch (error) {
    console.log("Error in cancelScheduledMessage:", error.message);
    res.status(500).json({ message: "Failed to cancel scheduled message" });
  }
};
