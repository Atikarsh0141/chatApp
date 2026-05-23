import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getPendingRequests,
  getSentRequests,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.post("/send", protectRoute, sendFriendRequest);
router.put("/accept/:requestId", protectRoute, acceptFriendRequest);
router.put("/reject/:requestId", protectRoute, rejectFriendRequest);
router.get("/pending", protectRoute, getPendingRequests);
router.get("/sent", protectRoute, getSentRequests);

export default router;
