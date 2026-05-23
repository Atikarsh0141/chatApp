import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { detectSpam, generateAutoReply } from "../lib/gemini.js";
import { generateToken } from "../lib/utils.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // Only show accepted friends
    const currentUser = await User.findById(loggedInUserId);
    const friendIds = currentUser.friends || [];
    
    if (friendIds.length === 0) {
      return res.status(200).json([]);
    }
    
    const friends = await User.find({ _id: { $in: friendIds } }).select("-password");

    res.status(200).json(friends);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/messages/:id?limit=30&before=<ISO timestamp>
 * Cursor-based pagination: returns messages oldest-first.
 * Pass `before` (the createdAt of the oldest currently-loaded message)
 * to fetch the next page of older messages.
 */
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const before = req.query.before ? new Date(req.query.before) : null;

    const query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      isDelivered: true,
      // Exclude messages soft-deleted by this user
      deletedFor: { $ne: myId },
    };

    // Cursor: load messages older than `before`
    if (before) {
      query.createdAt = { $lt: before };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })  // newest first for the slice
      .limit(limit)
      .lean();

    // Return in chronological order (oldest first) for rendering
    messages.reverse();

    // Tell the client if there are more messages to load
    const totalCount = await Message.countDocuments({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      isDelivered: true,
      deletedFor: { $ne: myId },
      ...(before ? { createdAt: { $lt: before } } : {}),
    });

    res.status(200).json({
      messages,
      hasMore: totalCount > limit,
    });
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/messages/search/:id?q=<term>
 * Search message text in a conversation.
 */
export const searchMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      isDelivered: true,
      deletedFor: { $ne: myId },
      text: { $regex: q.trim(), $options: "i" },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in searchMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/messages/:messageId?deleteFor=me|everyone
 * Soft-delete: adds caller's userId to message.deletedFor.
 * deleteFor=everyone only works if the caller is the sender.
 */
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    const deleteForEveryone = req.query.deleteFor === "everyone";

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (deleteForEveryone) {
      // Only the sender can delete for everyone
      if (message.senderId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Only the sender can delete for everyone" });
      }
      // Add both users to deletedFor
      const participants = [message.senderId, message.receiverId].filter(Boolean);
      for (const uid of participants) {
        if (!message.deletedFor.map(String).includes(uid.toString())) {
          message.deletedFor.push(uid);
        }
      }
    } else {
      // Delete only for current user
      if (!message.deletedFor.map(String).includes(userId.toString())) {
        message.deletedFor.push(userId);
      }
    }

    await message.save();

    // Notify the other participant via socket
    const otherUserId =
      message.senderId.toString() === userId.toString()
        ? message.receiverId?.toString()
        : message.senderId.toString();

    if (otherUserId && deleteForEveryone) {
      const socketId = getReceiverSocketId(otherUserId);
      if (socketId) {
        io.to(socketId).emit("messageDeleted", {
          messageId,
          deletedFor: "everyone",
        });
      }
    }

    res.status(200).json({ success: true, messageId, deletedFor: deleteForEveryone ? "everyone" : "me" });
  } catch (error) {
    console.log("Error in deleteMessage:", error.message);
    res.status(500).json({ message: "Failed to delete message" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, file, fileName, fileType, isCodeSnippet, language } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let fileUrl;
    if (file) {
      const uploadResponse = await cloudinary.uploader.upload(file, { resource_type: "raw" });
      fileUrl = uploadResponse.secure_url;
    }

    // Spam detection on text messages
    let isSpam = false;
    if (text && !isCodeSnippet) {
      isSpam = await detectSpam(text);
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      fileUrl,
      fileName,
      fileType,
      isCodeSnippet,
      language,
      isSpam,
      status: "sent",
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      // Receiver is online — mark as delivered
      newMessage.status = "delivered";
      await newMessage.save();

      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);

    // AI Auto-Reply: check if receiver has auto-reply enabled and is offline
    if (!isSpam && text) {
      try {
        const receiver = await User.findById(receiverId);
        const isReceiverOnline = !!getReceiverSocketId(receiverId);

        if (receiver && receiver.autoReplyEnabled && !isReceiverOnline) {
          // Get recent messages for context
          const recentMessages = await Message.find({
            $or: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId },
            ],
            isDelivered: true,
          })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("senderId", "fullName");

          const conversationHistory = recentMessages
            .reverse()
            .map((m) => `${m.senderId.fullName}: ${m.text || "[image]"}`)
            .join("\n");

          const sender = await User.findById(senderId);
          const autoReplyText = await generateAutoReply(
            conversationHistory,
            sender.fullName,
            receiver.autoReplyMessage
          );

          const autoReplyMessage = new Message({
            senderId: receiverId,
            receiverId: senderId,
            text: autoReplyText,
            isAutoReply: true,
          });

          await autoReplyMessage.save();

          // Send auto-reply to the original sender via socket
          const senderSocketId = getReceiverSocketId(senderId.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit("newMessage", autoReplyMessage);
          }
        }
      } catch (autoReplyError) {
        console.error("Auto-reply error:", autoReplyError.message);
        // Don't fail the main request if auto-reply fails
      }
    }
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }

    message.text = text;
    message.editedAt = new Date();
    await message.save();

    // Notify the other user in real time
    const otherUserId = message.receiverId?.toString();
    if (otherUserId) {
      const socketId = getReceiverSocketId(otherUserId);
      if (socketId) {
        io.to(socketId).emit("messageEdited", { messageId, text, editedAt: message.editedAt });
      }
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in editMessage:", error.message);
    res.status(500).json({ message: "Failed to edit message" });
  }
};

export const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Check if user already reacted with this emoji
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      // Remove the reaction (toggle off)
      message.reactions.splice(existingIndex, 1);
    } else {
      // Remove any existing reaction from this user, then add new one
      message.reactions = message.reactions.filter(
        (r) => r.userId.toString() !== userId.toString()
      );
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Notify the other user
    const otherUserId =
      message.senderId.toString() === userId.toString()
        ? message.receiverId?.toString()
        : message.senderId.toString();

    if (otherUserId) {
      const socketId = getReceiverSocketId(otherUserId);
      if (socketId) {
        io.to(socketId).emit("reactionUpdated", {
          messageId,
          reactions: message.reactions,
        });
      }
    }

    res.status(200).json({ reactions: message.reactions });
  } catch (error) {
    console.log("Error in toggleReaction:", error.message);
    res.status(500).json({ message: "Failed to toggle reaction" });
  }
};


