import User from "../models/user.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

/**
 * Send a friend request by unique ID
 */
export const sendFriendRequest = async (req, res) => {
  try {
    const { uniqueId } = req.body;
    const senderId = req.user._id;

    if (!uniqueId) {
      return res.status(400).json({ message: "Unique ID is required" });
    }

    // Find the target user by uniqueId
    const targetUser = await User.findOne({ uniqueId: uniqueId.toUpperCase() });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found with that ID" });
    }

    if (targetUser._id.toString() === senderId.toString()) {
      return res.status(400).json({ message: "You cannot send a request to yourself" });
    }

    // Check if already friends
    const sender = await User.findById(senderId);
    if (sender.friends.includes(targetUser._id)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    // Check if a request already exists (in either direction)
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId: targetUser._id },
        { senderId: targetUser._id, receiverId: senderId },
      ],
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "A friend request already exists" });
    }

    const friendRequest = new FriendRequest({
      senderId,
      receiverId: targetUser._id,
    });

    await friendRequest.save();

    // Populate sender info for the real-time notification
    const populatedRequest = await FriendRequest.findById(friendRequest._id)
      .populate("senderId", "fullName profilePic uniqueId")
      .populate("receiverId", "fullName profilePic uniqueId");

    // Notify the receiver via socket
    const receiverSocketId = getReceiverSocketId(targetUser._id.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequest", populatedRequest);
    }

    res.status(201).json({
      message: "Friend request sent!",
      request: populatedRequest,
    });
  } catch (error) {
    console.log("Error in sendFriendRequest:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Friend request already sent" });
    }
    res.status(500).json({ message: "Failed to send friend request" });
  }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only accept requests sent to you" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "This request has already been processed" });
    }

    // Update request status
    request.status = "accepted";
    await request.save();

    // Add each user to the other's friends list
    await User.findByIdAndUpdate(request.senderId, {
      $addToSet: { friends: request.receiverId },
    });
    await User.findByIdAndUpdate(request.receiverId, {
      $addToSet: { friends: request.senderId },
    });

    // Notify the sender via socket
    const senderSocketId = getReceiverSocketId(request.senderId.toString());
    if (senderSocketId) {
      const acceptedBy = await User.findById(userId).select("fullName profilePic uniqueId");
      io.to(senderSocketId).emit("friendRequestAccepted", {
        requestId,
        user: acceptedBy,
      });
    }

    res.status(200).json({ message: "Friend request accepted!" });
  } catch (error) {
    console.log("Error in acceptFriendRequest:", error.message);
    res.status(500).json({ message: "Failed to accept friend request" });
  }
};

/**
 * Reject a friend request
 */
export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only reject requests sent to you" });
    }

    request.status = "rejected";
    await request.save();

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.log("Error in rejectFriendRequest:", error.message);
    res.status(500).json({ message: "Failed to reject friend request" });
  }
};

/**
 * Get pending friend requests (received)
 */
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await FriendRequest.find({
      receiverId: userId,
      status: "pending",
    })
      .populate("senderId", "fullName profilePic uniqueId")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.log("Error in getPendingRequests:", error.message);
    res.status(500).json({ message: "Failed to get pending requests" });
  }
};

/**
 * Get sent friend requests (by me)
 */
export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await FriendRequest.find({
      senderId: userId,
      status: "pending",
    })
      .populate("receiverId", "fullName profilePic uniqueId")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.log("Error in getSentRequests:", error.message);
    res.status(500).json({ message: "Failed to get sent requests" });
  }
};
