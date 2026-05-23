import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getChatAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/", protectRoute, getChatAnalytics);

export default router;
