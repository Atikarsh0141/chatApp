import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    image: {
      type: String,
      default: "",
    },
    // Tags for categorization (e.g. "react", "career", "project")
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    // Post type: update, project, article, question
    postType: {
      type: String,
      enum: ["update", "project", "article", "question"],
      default: "update",
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: { type: String, required: true, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Index for feed queries
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tags: 1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
