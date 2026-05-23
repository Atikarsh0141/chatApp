import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  editMessage,
  toggleReaction,
  searchMessages,
  deleteMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/search/:id", protectRoute, searchMessages);   // must be before /:id
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);
router.put("/edit/:messageId", protectRoute, editMessage);
router.post("/react/:messageId", protectRoute, toggleReaction);
router.delete("/:messageId", protectRoute, deleteMessage);

export default router;

