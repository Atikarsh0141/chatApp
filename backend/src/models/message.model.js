import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    // Message delivery status
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    // E2E Encryption flag
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    // Emoji reactions: [{ userId, emoji }]
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
    // Edit tracking
    editedAt: {
      type: Date,
      default: null,
    },
    // Spam detection
    isSpam: {
      type: Boolean,
      default: false,
    },
    isAutoReply: {
      type: Boolean,
      default: false,
    },
    translatedText: {
      type: Map,
      of: String,
      default: {},
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    isDelivered: {
      type: Boolean,
      default: true,
    },
    // File Sharing
    fileUrl: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },
    fileType: {
      type: String,
      default: "",
    },
    // Code Sharing
    isCodeSnippet: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      default: "javascript",
    },
    // Soft delete — stores user IDs who deleted this message for themselves
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Index for fast conversation history queries
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;

