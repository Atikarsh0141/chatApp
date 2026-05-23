import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";

const router = express.Router();

// ===================== FOLLOW SYSTEM =====================

/**
 * Follow a developer
 * POST /api/feed/follow/:userId
 */
router.post("/follow/:userId", protectRoute, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const isFollowing = targetUser.followers.includes(currentUserId);

    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });
      res.json({ followed: false, message: "Unfollowed" });
    } else {
      // Follow
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } });
      res.json({ followed: true, message: "Followed" });
    }
  } catch (error) {
    console.error("Follow error:", error.message);
    res.status(500).json({ message: "Failed to follow/unfollow" });
  }
});

/**
 * Get followers/following lists
 * GET /api/feed/connections/:userId
 */
router.get("/connections/:userId", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("following", "fullName profilePic title skills uniqueId")
      .populate("followers", "fullName profilePic title skills uniqueId");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      following: user.following,
      followers: user.followers,
      followingCount: user.following.length,
      followersCount: user.followers.length,
    });
  } catch (error) {
    console.error("Connections error:", error.message);
    res.status(500).json({ message: "Failed to get connections" });
  }
});

// ===================== SUGGESTED DEVELOPERS =====================

/**
 * Get suggested developers based on skills
 * GET /api/feed/suggested
 */
router.get("/suggested", protectRoute, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const alreadyFollowing = currentUser.following.map((id) => id.toString());
    const myFriends = currentUser.friends.map((id) => id.toString());
    const excludeIds = [req.user._id.toString(), ...alreadyFollowing, ...myFriends];

    let suggestions = [];

    // Strategy 1: Match by skills
    if (currentUser.skills && currentUser.skills.length > 0) {
      const skillMatch = await User.find({
        _id: { $nin: excludeIds },
        skills: { $in: currentUser.skills },
      })
        .select("fullName profilePic title bio skills experience uniqueId followers")
        .limit(10);
      suggestions.push(...skillMatch);
    }

    // Strategy 2: Match by techStack
    if (suggestions.length < 10 && currentUser.techStack && currentUser.techStack.length > 0) {
      const existingIds = suggestions.map((s) => s._id.toString());
      const techMatch = await User.find({
        _id: { $nin: [...excludeIds, ...existingIds] },
        techStack: { $in: currentUser.techStack },
      })
        .select("fullName profilePic title bio skills experience uniqueId followers")
        .limit(10 - suggestions.length);
      suggestions.push(...techMatch);
    }

    // Strategy 3: Fill with recently active users
    if (suggestions.length < 6) {
      const existingIds = suggestions.map((s) => s._id.toString());
      const recentUsers = await User.find({
        _id: { $nin: [...excludeIds, ...existingIds] },
      })
        .select("fullName profilePic title bio skills experience uniqueId followers")
        .sort({ updatedAt: -1 })
        .limit(6 - suggestions.length);
      suggestions.push(...recentUsers);
    }

    // Calculate match score
    const enriched = suggestions.map((user) => {
      const userObj = user.toObject();
      let matchScore = 0;
      if (currentUser.skills && user.skills) {
        matchScore = currentUser.skills.filter((s) =>
          user.skills.map((sk) => sk.toLowerCase()).includes(s.toLowerCase())
        ).length;
      }
      return { ...userObj, matchScore, followersCount: user.followers?.length || 0 };
    });

    // Sort by match score then followers
    enriched.sort((a, b) => b.matchScore - a.matchScore || b.followersCount - a.followersCount);

    res.json(enriched.slice(0, 8));
  } catch (error) {
    console.error("Suggested error:", error.message);
    res.status(500).json({ message: "Failed to get suggestions" });
  }
});

// ===================== POSTS / FEED =====================

/**
 * Create a post
 * POST /api/feed/posts
 */
router.post("/posts", protectRoute, async (req, res) => {
  try {
    const { content, image, tags, postType } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Post content is required" });
    }

    let imageUrl = "";
    if (image) {
      const uploadRes = await cloudinary.uploader.upload(image);
      imageUrl = uploadRes.secure_url;
    }

    const post = new Post({
      author: req.user._id,
      content: content.trim(),
      image: imageUrl,
      tags: tags || [],
      postType: postType || "update",
    });

    await post.save();

    const populated = await Post.findById(post._id).populate(
      "author",
      "fullName profilePic title"
    );

    res.status(201).json(populated);
  } catch (error) {
    console.error("Create post error:", error.message);
    res.status(500).json({ message: "Failed to create post" });
  }
});

/**
 * Get feed (posts from people you follow + your own)
 * GET /api/feed/posts?page=1&limit=10
 */
router.get("/posts", protectRoute, async (req, res) => {
  try {
    const { page = 1, limit = 15, tag } = req.query;
    const currentUser = await User.findById(req.user._id);

    // Feed includes: own posts + posts from people you follow + posts from friends
    const feedAuthors = [
      req.user._id,
      ...currentUser.following,
      ...currentUser.friends,
    ];

    const filter = { author: { $in: feedAuthors } };
    if (tag) filter.tags = tag.toLowerCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find(filter)
      .populate("author", "fullName profilePic title")
      .populate("comments.user", "fullName profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(filter);

    res.json({
      posts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Feed error:", error.message);
    res.status(500).json({ message: "Failed to load feed" });
  }
});

/**
 * Get explore feed (all posts, for discovery)
 * GET /api/feed/explore?page=1
 */
router.get("/explore", protectRoute, async (req, res) => {
  try {
    const { page = 1, limit = 15, tag } = req.query;
    const filter = {};
    if (tag) filter.tags = tag.toLowerCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find(filter)
      .populate("author", "fullName profilePic title")
      .populate("comments.user", "fullName profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(filter);

    res.json({
      posts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Explore feed error:", error.message);
    res.status(500).json({ message: "Failed to load explore feed" });
  }
});

/**
 * Get a user's posts
 * GET /api/feed/posts/user/:userId
 */
router.get("/posts/user/:userId", protectRoute, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate("author", "fullName profilePic title")
      .populate("comments.user", "fullName profilePic")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(posts);
  } catch (error) {
    console.error("User posts error:", error.message);
    res.status(500).json({ message: "Failed to load posts" });
  }
});

/**
 * Like / Unlike a post
 * POST /api/feed/posts/:postId/like
 */
router.post("/posts/:postId/like", protectRoute, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user._id;
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.addToSet(userId);
    }

    await post.save();
    res.json({ likes: post.likes, isLiked: !isLiked });
  } catch (error) {
    console.error("Like error:", error.message);
    res.status(500).json({ message: "Failed to like post" });
  }
});

/**
 * Add a comment
 * POST /api/feed/posts/:postId/comment
 */
router.post("/posts/:postId/comment", protectRoute, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ user: req.user._id, text: text.trim() });
    await post.save();

    const updated = await Post.findById(post._id)
      .populate("author", "fullName profilePic title")
      .populate("comments.user", "fullName profilePic");

    res.json(updated);
  } catch (error) {
    console.error("Comment error:", error.message);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

/**
 * Delete a post (author only)
 * DELETE /api/feed/posts/:postId
 */
router.delete("/posts/:postId", protectRoute, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Post.findByIdAndDelete(req.params.postId);
    res.json({ message: "Post deleted" });
  } catch (error) {
    console.error("Delete post error:", error.message);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

export default router;
