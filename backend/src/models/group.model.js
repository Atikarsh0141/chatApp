import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    groupPic: {
      type: String,
      default: "",
    },
    // Creator of the group
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // All members including admins
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Admins (subset of members) — creator is always admin
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Project Tasks
    tasks: [
      {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        status: {
          type: String,
          enum: ["todo", "in-progress", "done"],
          default: "todo",
        },
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);

export default Group;
