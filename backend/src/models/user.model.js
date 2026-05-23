import mongoose from "mongoose";
import crypto from "crypto";

// Generate a unique short ID like "CHATTY-A1B2C3"
function generateUniqueId() {
  return "CHATTY-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: false,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    // Unique ID for friend requests
    uniqueId: {
      type: String,
      unique: true,
      default: generateUniqueId,
    },
    // Friends list (accepted friend request user IDs)
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    googleId: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    // Last Seen privacy
    lastSeen: {
      type: Date,
      default: null,
    },
    showLastSeen: {
      type: Boolean,
      default: true,
    },
    // AI Auto-Reply
    autoReplyEnabled: {
      type: Boolean,
      default: false,
    },
    autoReplyMessage: {
      type: String,
      default: "",
    },
    // Translation
    preferredLanguage: {
      type: String,
      default: "English",
    },

    // === Developer Profile Fields ===
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    title: {
      type: String,
      default: "",
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    techStack: [
      {
        type: String,
        trim: true,
      },
    ],
    github: {
      type: String,
      default: "",
    },
    portfolio: {
      type: String,
      default: "",
    },
    experience: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert", ""],
      default: "",
    },

    // === Social Networking ===
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
