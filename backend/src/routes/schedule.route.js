import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  scheduleMessage,
  getScheduledMessages,
  cancelScheduledMessage,
} from "../controllers/schedule.controller.js";

const router = express.Router();

router.post("/send/:id", protectRoute, scheduleMessage);
router.get("/", protectRoute, getScheduledMessages);
router.delete("/:messageId", protectRoute, cancelScheduledMessage);

export default router;
