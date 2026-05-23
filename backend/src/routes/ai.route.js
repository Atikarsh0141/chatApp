import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { summarizeChat, translateMessage, toggleAutoReply } from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/summarize/:userId", protectRoute, summarizeChat);
router.post("/translate/:messageId", protectRoute, translateMessage);
router.put("/auto-reply", protectRoute, toggleAutoReply);

export default router;
