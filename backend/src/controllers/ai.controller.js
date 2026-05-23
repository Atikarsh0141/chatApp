import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { summarizeChat as summarizeChatAI, translateText, detectSpam } from "../lib/gemini.js";

/**
 * Summarize a chat conversation with a specific user
 */
export const summarizeChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ],
      isDelivered: true,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("senderId", "fullName")
      .populate("receiverId", "fullName");

    if (messages.length === 0) {
      return res.status(400).json({ message: "No messages to summarize" });
    }

    const formattedMessages = messages.reverse().map((m) => ({
      senderName: m.senderId.fullName,
      text: m.text || "[image]",
    }));

    const summary = await summarizeChatAI(formattedMessages);

    res.status(200).json({ summary });
  } catch (error) {
    console.log("Error in summarizeChat:", error.message);
    res.status(500).json({ message: "Failed to summarize chat" });
  }
};

/**
 * Translate a specific message
 */
export const translateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { targetLanguage } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({ message: "Target language is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!message.text) {
      return res.status(400).json({ message: "No text to translate" });
    }

    // Check cache first
    if (message.translatedText && message.translatedText.get(targetLanguage)) {
      return res.status(200).json({
        translatedText: message.translatedText.get(targetLanguage),
        cached: true,
      });
    }

    const translated = await translateText(message.text, targetLanguage);

    // Cache the translation
    if (!message.translatedText) {
      message.translatedText = new Map();
    }
    message.translatedText.set(targetLanguage, translated);
    await message.save();

    res.status(200).json({ translatedText: translated, cached: false });
  } catch (error) {
    console.log("Error in translateMessage:", error.message);
    res.status(500).json({ message: "Translation failed" });
  }
};

/**
 * Toggle auto-reply settings
 */
export const toggleAutoReply = async (req, res) => {
  try {
    const { autoReplyEnabled, autoReplyMessage } = req.body;
    const userId = req.user._id;

    const update = {};
    if (typeof autoReplyEnabled === "boolean") update.autoReplyEnabled = autoReplyEnabled;
    if (typeof autoReplyMessage === "string") update.autoReplyMessage = autoReplyMessage;

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password");

    res.status(200).json(user);
  } catch (error) {
    console.log("Error in toggleAutoReply:", error.message);
    res.status(500).json({ message: "Failed to update auto-reply settings" });
  }
};
