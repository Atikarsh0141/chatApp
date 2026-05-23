import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import User from "../models/user.model.js";

const router = express.Router();

/**
 * Search developers by skills, techStack, name, or title
 * GET /api/developers/search?q=React&skills=Node,Python&experience=advanced
 */
router.get("/search", protectRoute, async (req, res) => {
  try {
    const { q, skills, experience, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const filter = { _id: { $ne: userId } }; // Exclude self

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { fullName: regex },
        { title: regex },
        { bio: regex },
        { skills: regex },
        { techStack: regex },
      ];
    }

    if (skills) {
      const skillsArr = skills.split(",").map((s) => s.trim());
      filter.skills = { $in: skillsArr.map((s) => new RegExp(s, "i")) };
    }

    if (experience) {
      filter.experience = experience;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const developers = await User.find(filter)
      .select("fullName profilePic title bio skills techStack github portfolio experience uniqueId")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      developers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.log("Error in developer search:", error.message);
    res.status(500).json({ message: "Search failed" });
  }
});

/**
 * Get a developer's public profile
 * GET /api/developers/:userId
 */
router.get("/:userId", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "fullName profilePic title bio skills techStack github portfolio experience uniqueId createdAt"
    );

    if (!user) return res.status(404).json({ message: "Developer not found" });

    res.status(200).json(user);
  } catch (error) {
    console.log("Error getting developer profile:", error.message);
    res.status(500).json({ message: "Failed to get profile" });
  }
});

/**
 * Get popular skills (for suggestions/autocomplete)
 * GET /api/developers/meta/popular-skills
 */
router.get("/meta/popular-skills", protectRoute, async (req, res) => {
  try {
    const result = await User.aggregate([
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]);

    res.status(200).json(result.map((r) => ({ skill: r._id, count: r.count })));
  } catch (error) {
    console.log("Error getting popular skills:", error.message);
    res.status(500).json({ message: "Failed" });
  }
});

export default router;
