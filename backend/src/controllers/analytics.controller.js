import Message from "../models/message.model.js";
import User from "../models/user.model.js";

/**
 * Get chat analytics for the logged-in user
 */
export const getChatAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Total messages sent
    const totalSent = await Message.countDocuments({ senderId: userId, isDelivered: true });

    // Total messages received
    const totalReceived = await Message.countDocuments({ receiverId: userId, isDelivered: true });

    // Messages per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messagesPerDay = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
          isDelivered: true,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days with 0
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const found = messagesPerDay.find((d) => d._id === dateStr);
      dailyData.push({
        date: dateStr,
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        count: found ? found.count : 0,
      });
    }

    // Most active contacts (top 5)
    const activeContacts = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
          isDelivered: true,
        },
      },
      {
        $project: {
          contactId: {
            $cond: {
              if: { $eq: ["$senderId", userId] },
              then: "$receiverId",
              else: "$senderId",
            },
          },
        },
      },
      {
        $group: {
          _id: "$contactId",
          messageCount: { $sum: 1 },
        },
      },
      { $sort: { messageCount: -1 } },
      { $limit: 5 },
    ]);

    // Populate contact names
    const contactIds = activeContacts.map((c) => c._id);
    const contactUsers = await User.find({ _id: { $in: contactIds } }).select(
      "fullName profilePic"
    );

    const topContacts = activeContacts.map((c) => {
      const user = contactUsers.find((u) => u._id.toString() === c._id.toString());
      return {
        _id: c._id,
        fullName: user?.fullName || "Unknown",
        profilePic: user?.profilePic || "",
        messageCount: c.messageCount,
      };
    });

    // Spam messages count
    const spamCount = await Message.countDocuments({
      receiverId: userId,
      isSpam: true,
    });

    // Auto-replies sent count
    const autoReplyCount = await Message.countDocuments({
      senderId: userId,
      isAutoReply: true,
    });

    // Average response time (simple: average time between receive and next send)
    const avgResponsePipeline = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
          isDelivered: true,
        },
      },
      { $sort: { createdAt: 1 } },
      { $limit: 200 },
    ]);

    let totalResponseTime = 0;
    let responseCount = 0;
    for (let i = 1; i < avgResponsePipeline.length; i++) {
      const prev = avgResponsePipeline[i - 1];
      const curr = avgResponsePipeline[i];
      if (
        prev.receiverId.toString() === userId.toString() &&
        curr.senderId.toString() === userId.toString()
      ) {
        const diff = new Date(curr.createdAt) - new Date(prev.createdAt);
        if (diff < 3600000) {
          // Only count if < 1 hour
          totalResponseTime += diff;
          responseCount++;
        }
      }
    }

    const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000) : 0;

    res.status(200).json({
      totalSent,
      totalReceived,
      totalMessages: totalSent + totalReceived,
      dailyData,
      topContacts,
      spamCount,
      autoReplyCount,
      avgResponseTime, // in seconds
    });
  } catch (error) {
    console.log("Error in getChatAnalytics:", error.message);
    res.status(500).json({ message: "Failed to get analytics" });
  }
};
