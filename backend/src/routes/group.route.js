import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getMyGroups,
  getGroupDetails,
  addMember,
  removeMember,
  makeAdmin,
  removeAdmin,
  leaveGroup,
  updateGroup,
  deleteGroup,
  sendGroupMessage,
  getGroupMessages,
  addTask,
  updateTaskStatus,
  deleteTask,
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/my-groups", protectRoute, getMyGroups);
router.get("/:groupId", protectRoute, getGroupDetails);
router.put("/:groupId", protectRoute, updateGroup);
router.delete("/:groupId", protectRoute, deleteGroup);

// Member management
router.post("/:groupId/add-member", protectRoute, addMember);
router.post("/:groupId/remove-member", protectRoute, removeMember);
router.post("/:groupId/make-admin", protectRoute, makeAdmin);
router.post("/:groupId/remove-admin", protectRoute, removeAdmin);
router.post("/:groupId/leave", protectRoute, leaveGroup);

// Messages
router.post("/:groupId/messages", protectRoute, sendGroupMessage);
router.get("/:groupId/messages", protectRoute, getGroupMessages);

// Project Tasks
router.post("/:groupId/tasks", protectRoute, addTask);
router.put("/:groupId/tasks/:taskId", protectRoute, updateTaskStatus);
router.delete("/:groupId/tasks/:taskId", protectRoute, deleteTask);

export default router;
