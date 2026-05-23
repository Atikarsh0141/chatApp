import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

/**
 * Create a new group
 */
export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds, groupPic } = req.body;
    const creatorId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (!memberIds || memberIds.length === 0) {
      return res.status(400).json({ message: "Add at least one member" });
    }

    let groupPicUrl = "";
    if (groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic);
      groupPicUrl = uploadResponse.secure_url;
    }

    // Include creator in members and admins
    const allMembers = [...new Set([creatorId.toString(), ...memberIds])];

    const group = new Group({
      name: name.trim(),
      description: description || "",
      groupPic: groupPicUrl,
      createdBy: creatorId,
      members: allMembers,
      admins: [creatorId],
    });

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "fullName profilePic uniqueId")
      .populate("admins", "fullName profilePic")
      .populate("createdBy", "fullName profilePic");

    // Notify all members via socket
    allMembers.forEach((memberId) => {
      if (memberId.toString() !== creatorId.toString()) {
        const socketId = getReceiverSocketId(memberId);
        if (socketId) {
          io.to(socketId).emit("addedToGroup", populatedGroup);
        }
      }
    });

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.log("Error in createGroup:", error.message);
    res.status(500).json({ message: "Failed to create group" });
  }
};

/**
 * Get all groups the user is a member of
 */
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ members: userId })
      .populate("members", "fullName profilePic uniqueId")
      .populate("admins", "fullName profilePic")
      .populate("createdBy", "fullName profilePic")
      .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.log("Error in getMyGroups:", error.message);
    res.status(500).json({ message: "Failed to get groups" });
  }
};

/**
 * Get group details
 */
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate("members", "fullName profilePic uniqueId email")
      .populate("admins", "fullName profilePic")
      .populate("createdBy", "fullName profilePic");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some((m) => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    res.status(200).json(group);
  } catch (error) {
    console.log("Error in getGroupDetails:", error.message);
    res.status(500).json({ message: "Failed to get group details" });
  }
};

/**
 * Add member to group (admin only)
 */
export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Check if requester is admin
    if (!group.admins.some((a) => a.toString() === adminId.toString())) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    // Check if user exists
    const userToAdd = await User.findById(userId);
    if (!userToAdd) return res.status(404).json({ message: "User not found" });

    // Check if already a member
    if (group.members.some((m) => m.toString() === userId)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    group.members.push(userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic uniqueId")
      .populate("admins", "fullName profilePic")
      .populate("createdBy", "fullName profilePic");

    // Notify the added user
    const socketId = getReceiverSocketId(userId);
    if (socketId) {
      io.to(socketId).emit("addedToGroup", updatedGroup);
    }

    // Notify existing members
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupUpdated", updatedGroup);
      }
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in addMember:", error.message);
    res.status(500).json({ message: "Failed to add member" });
  }
};

/**
 * Remove member from group (admin only)
 */
export const removeMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.some((a) => a.toString() === adminId.toString())) {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    // Cannot remove the creator
    if (group.createdBy.toString() === userId) {
      return res.status(400).json({ message: "Cannot remove the group creator" });
    }

    // Remove from members and admins
    group.members = group.members.filter((m) => m.toString() !== userId);
    group.admins = group.admins.filter((a) => a.toString() !== userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic uniqueId")
      .populate("admins", "fullName profilePic")
      .populate("createdBy", "fullName profilePic");

    // Notify removed user
    const socketId = getReceiverSocketId(userId);
    if (socketId) {
      io.to(socketId).emit("removedFromGroup", { groupId });
    }

    // Notify remaining members
    group.members.forEach((memberId) => {
      const memberSocketId = getReceiverSocketId(memberId.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupUpdated", updatedGroup);
      }
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in removeMember:", error.message);
    res.status(500).json({ message: "Failed to remove member" });
  }
};

/**
 * Make a member admin (admin only)
 */
export const makeAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.some((a) => a.toString() === adminId.toString())) {
      return res.status(403).json({ message: "Only admins can promote members" });
    }

    if (!group.members.some((m) => m.toString() === userId)) {
      return res.status(400).json({ message: "User is not a member" });
    }

    if (group.admins.some((a) => a.toString() === userId)) {
      return res.status(400).json({ message: "User is already an admin" });
    }

    group.admins.push(userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic uniqueId")
      .populate("admins", "fullName profilePic")
      .populate("createdBy", "fullName profilePic");

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in makeAdmin:", error.message);
    res.status(500).json({ message: "Failed to make admin" });
  }
};

/**
 * Remove admin (creator only)
 */
export const removeAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Only creator can remove admins
    if (group.createdBy.toString() !== requesterId.toString()) {
      return res.status(403).json({ message: "Only the group creator can remove admins" });
    }

    if (userId === group.createdBy.toString()) {
      return res.status(400).json({ message: "Creator cannot be removed as admin" });
    }

    group.admins = group.admins.filter((a) => a.toString() !== userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic uniqueId")
      .populate("admins", "fullName profilePic")
      .populate("createdBy", "fullName profilePic");

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in removeAdmin:", error.message);
    res.status(500).json({ message: "Failed to remove admin" });
  }
};

/**
 * Leave group
 */
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Creator cannot leave — must delete group instead
    if (group.createdBy.toString() === userId.toString()) {
      return res.status(400).json({ message: "Creator cannot leave. Delete the group instead." });
    }

    group.members = group.members.filter((m) => m.toString() !== userId.toString());
    group.admins = group.admins.filter((a) => a.toString() !== userId.toString());
    await group.save();

    res.status(200).json({ message: "Left the group" });
  } catch (error) {
    console.log("Error in leaveGroup:", error.message);
    res.status(500).json({ message: "Failed to leave group" });
  }
};

/**
 * Update group (admin only)
 */
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, groupPic } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.some((a) => a.toString() === adminId.toString())) {
      return res.status(403).json({ message: "Only admins can update the group" });
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description;
    if (groupPic) {
      const uploadResponse = await cloudinary.uploader.upload(groupPic);
      group.groupPic = uploadResponse.secure_url;
    }

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic uniqueId")
      .populate("admins", "fullName profilePic")
      .populate("createdBy", "fullName profilePic");

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in updateGroup:", error.message);
    res.status(500).json({ message: "Failed to update group" });
  }
};

/**
 * Delete group (creator only)
 */
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the creator can delete the group" });
    }

    // Notify all members
    group.members.forEach((memberId) => {
      const socketId = getReceiverSocketId(memberId.toString());
      if (socketId) {
        io.to(socketId).emit("removedFromGroup", { groupId });
      }
    });

    // Delete all group messages
    await Message.deleteMany({ groupId });
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({ message: "Group deleted" });
  } catch (error) {
    console.log("Error in deleteGroup:", error.message);
    res.status(500).json({ message: "Failed to delete group" });
  }
};

/**
 * Send a message to a group
 */
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, image, file, fileName, fileType, isCodeSnippet, language } = req.body;
    const senderId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.some((m) => m.toString() === senderId.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let fileUrl;
    if (file) {
      // For raw files (docs, pdfs, zips, code)
      const uploadResponse = await cloudinary.uploader.upload(file, { resource_type: "raw" });
      fileUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      groupId,
      text,
      image: imageUrl,
      fileUrl,
      fileName,
      fileType,
      isCodeSnippet,
      language,
      status: "delivered",
    });

    await newMessage.save();

    // Populate sender info for the message
    const populatedMessage = await Message.findById(newMessage._id).populate(
      "senderId",
      "fullName profilePic"
    );

    // Emit to all online group members except sender
    group.members.forEach((memberId) => {
      if (memberId.toString() !== senderId.toString()) {
        const socketId = getReceiverSocketId(memberId.toString());
        if (socketId) {
          io.to(socketId).emit("newGroupMessage", {
            groupId,
            message: populatedMessage,
          });
        }
      }
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("Error in sendGroupMessage:", error.message);
    res.status(500).json({ message: "Failed to send message" });
  }
};

/**
 * Get group messages
 */
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.some((m) => m.toString() === userId.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const messages = await Message.find({ groupId })
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getGroupMessages:", error.message);
    res.status(500).json({ message: "Failed to get messages" });
  }
};

// ===================== PROJECT TASKS =====================

/**
 * Add a task to a project room
 * POST /api/groups/:groupId/tasks
 */
export const addTask = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, description, assignedTo } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.some((m) => m.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not a member" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const newTask = {
      title: title.trim(),
      description: description || "",
      assignedTo: assignedTo || null,
      createdBy: userId,
    };

    group.tasks.push(newTask);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic uniqueId")
      .populate("admins", "fullName profilePic")
      .populate("createdBy", "fullName profilePic")
      .populate("tasks.assignedTo", "fullName profilePic")
      .populate("tasks.createdBy", "fullName profilePic");

    // Notify members via socket
    group.members.forEach((memberId) => {
      const socketId = getReceiverSocketId(memberId.toString());
      if (socketId) {
        io.to(socketId).emit("groupUpdated", updatedGroup);
      }
    });

    res.status(201).json(updatedGroup);
  } catch (error) {
    console.log("Error in addTask:", error.message);
    res.status(500).json({ message: "Failed to add task" });
  }
};

/**
 * Update task status
 * PUT /api/groups/:groupId/tasks/:taskId
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const { groupId, taskId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.some((m) => m.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not a member" });
    }

    const task = group.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (["todo", "in-progress", "done"].includes(status)) {
      task.status = status;
      await group.save();

      const updatedGroup = await Group.findById(groupId)
        .populate("members", "fullName profilePic uniqueId")
        .populate("admins", "fullName profilePic")
        .populate("createdBy", "fullName profilePic")
        .populate("tasks.assignedTo", "fullName profilePic")
        .populate("tasks.createdBy", "fullName profilePic");

      // Notify members via socket
      group.members.forEach((memberId) => {
        const socketId = getReceiverSocketId(memberId.toString());
        if (socketId) {
          io.to(socketId).emit("groupUpdated", updatedGroup);
        }
      });

      return res.status(200).json(updatedGroup);
    } else {
      return res.status(400).json({ message: "Invalid status" });
    }
  } catch (error) {
    console.log("Error in updateTaskStatus:", error.message);
    res.status(500).json({ message: "Failed to update task" });
  }
};

/**
 * Delete a task
 * DELETE /api/groups/:groupId/tasks/:taskId
 */
export const deleteTask = async (req, res) => {
  try {
    const { groupId, taskId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.some((m) => m.toString() === userId.toString())) {
      return res.status(403).json({ message: "Not a member" });
    }

    const task = group.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Only creator or group admin can delete
    const isAdmin = group.admins.some((a) => a.toString() === userId.toString());
    const isCreator = task.createdBy.toString() === userId.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }

    group.tasks.pull(taskId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic uniqueId")
      .populate("admins", "fullName profilePic")
      .populate("createdBy", "fullName profilePic")
      .populate("tasks.assignedTo", "fullName profilePic")
      .populate("tasks.createdBy", "fullName profilePic");

    // Notify members via socket
    group.members.forEach((memberId) => {
      const socketId = getReceiverSocketId(memberId.toString());
      if (socketId) {
        io.to(socketId).emit("groupUpdated", updatedGroup);
      }
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in deleteTask:", error.message);
    res.status(500).json({ message: "Failed to delete task" });
  }
};
