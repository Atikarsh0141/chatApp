import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isLoadingMore: false,
  hasMoreMessages: false,
  typingUser: null,
  searchResults: [],
  isSearching: false,

  // Group state
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true, hasMoreMessages: false });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      // New API returns { messages, hasMore }
      const data = res.data;
      if (data && Array.isArray(data.messages)) {
        set({ messages: data.messages, hasMoreMessages: data.hasMore });
      } else {
        // Fallback for old shape (plain array)
        set({ messages: Array.isArray(data) ? data : [] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Load the next page of older messages (cursor-based)
  loadMoreMessages: async () => {
    const { messages, selectedUser, isLoadingMore } = get();
    if (isLoadingMore || !selectedUser || messages.length === 0) return;
    set({ isLoadingMore: true });
    try {
      const oldest = messages[0]?.createdAt;
      const res = await axiosInstance.get(
        `/messages/${selectedUser._id}?before=${encodeURIComponent(oldest)}`
      );
      const data = res.data;
      const older = Array.isArray(data.messages) ? data.messages : [];
      set({
        messages: [...older, ...messages],
        hasMoreMessages: data.hasMore,
      });
    } catch (error) {
      toast.error("Failed to load older messages");
    } finally {
      set({ isLoadingMore: false });
    }
  },

  // Search messages in the current conversation
  searchMessages: async (query) => {
    const { selectedUser } = get();
    if (!selectedUser || !query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    set({ isSearching: true });
    try {
      const res = await axiosInstance.get(
        `/messages/search/${selectedUser._id}?q=${encodeURIComponent(query)}`
      );
      set({ searchResults: res.data });
    } catch (error) {
      toast.error("Search failed");
    } finally {
      set({ isSearching: false });
    }
  },

  clearSearch: () => set({ searchResults: [], isSearching: false }),

  // Delete a message (soft-delete)
  deleteMessage: async (messageId, deleteForEveryone = false) => {
    try {
      await axiosInstance.delete(
        `/messages/${messageId}?deleteFor=${deleteForEveryone ? "everyone" : "me"}`
      );
      set({ messages: get().messages.filter((m) => m._id !== messageId) });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // Mark messages from a sender as seen
  markMessagesSeen: (senderId) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    if (socket && senderId) {
      socket.emit("markAsSeen", { senderId, receiverId: authUser._id });
    }
  },

  // Emit typing events to the selected user
  emitTyping: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (socket && selectedUser) {
      socket.emit("typing", { to: selectedUser._id });
    }
  },

  emitStopTyping: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (socket && selectedUser) {
      socket.emit("stopTyping", { to: selectedUser._id });
    }
  },

  // ---- GROUP ACTIONS ----

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups/my-groups");
      set({ groups: res.data });
    } catch (error) {
      console.error("Failed to load groups:", error);
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (data) => {
    try {
      const res = await axiosInstance.post("/groups/create", data);
      set({ groups: [res.data, ...get().groups] });
      toast.success("Group created!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  sendGroupMessage: async (messageData) => {
    const { selectedGroup, groupMessages } = get();
    try {
      const res = await axiosInstance.post(`/groups/${selectedGroup._id}/messages`, messageData);
      set({ groupMessages: [...groupMessages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send");
    }
  },

  // ---- PROJECT TASKS ----
  addTask: async (taskData) => {
    const { selectedGroup, groups } = get();
    if (!selectedGroup) return;
    try {
      const res = await axiosInstance.post(`/groups/${selectedGroup._id}/tasks`, taskData);
      set({ selectedGroup: res.data });
      set({ groups: groups.map((g) => (g._id === res.data._id ? res.data : g)) });
      toast.success("Task added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add task");
    }
  },

  updateTaskStatus: async (taskId, status) => {
    const { selectedGroup, groups } = get();
    if (!selectedGroup) return;
    try {
      const res = await axiosInstance.put(`/groups/${selectedGroup._id}/tasks/${taskId}`, { status });
      set({ selectedGroup: res.data });
      set({ groups: groups.map((g) => (g._id === res.data._id ? res.data : g)) });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update task");
    }
  },

  deleteTask: async (taskId) => {
    const { selectedGroup, groups } = get();
    if (!selectedGroup) return;
    try {
      const res = await axiosInstance.delete(`/groups/${selectedGroup._id}/tasks/${taskId}`);
      set({ selectedGroup: res.data });
      set({ groups: groups.map((g) => (g._id === res.data._id ? res.data : g)) });
      toast.success("Task deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete task");
    }
  },

  setSelectedGroup: (group) => {
    set({ selectedGroup: group, selectedUser: null }); // Clear DM selection
  },

  subscribeToGroupMessages: () => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newGroupMessage", ({ groupId, message }) => {
      if (groupId === selectedGroup._id) {
        set({ groupMessages: [...get().groupMessages, message] });
      }
    });
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newGroupMessage");
  },

  // ---- AI FEATURES ----

  summarizeChat: async (userId) => {
    try {
      const res = await axiosInstance.post(`/ai/summarize/${userId}`);
      return res.data.summary;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to summarize");
      return null;
    }
  },

  translateMessage: async (messageId, targetLanguage) => {
    try {
      const res = await axiosInstance.post(`/ai/translate/${messageId}`, { targetLanguage });
      return res.data.translatedText;
    } catch (error) {
      toast.error(error.response?.data?.message || "Translation failed");
      return null;
    }
  },

  // ---- SCHEDULING ----

  scheduleMessage: async (messageData) => {
    const { selectedUser } = get();
    try {
      const res = await axiosInstance.post(`/schedule/send/${selectedUser._id}`, messageData);
      toast.success("Message scheduled!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to schedule");
      throw error;
    }
  },

  getScheduledMessages: async () => {
    try {
      const res = await axiosInstance.get("/schedule");
      return res.data;
    } catch (error) {
      console.error("Failed to get scheduled messages:", error);
      return [];
    }
  },

  cancelScheduledMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/schedule/${messageId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel");
      throw error;
    }
  },

  // ---- DM SUBSCRIPTIONS ----

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;
      // Clear typing indicator when a message arrives
      set({ messages: [...get().messages, newMessage], typingUser: null });
    });

    socket.on("messagesSeen", ({ by }) => {
      if (by === selectedUser._id) {
        const updatedMessages = get().messages.map((msg) => {
          if (
            msg.senderId === useAuthStore.getState().authUser._id &&
            msg.receiverId === selectedUser._id &&
            msg.status !== "seen"
          ) {
            return { ...msg, status: "seen" };
          }
          return msg;
        });
        set({ messages: updatedMessages });
      }
    });

    socket.on("scheduledMessageDelivered", (message) => {
      if (
        message.receiverId === selectedUser._id ||
        message.senderId === selectedUser._id
      ) {
        set({ messages: [...get().messages, message] });
      }
    });

    // Typing indicator listeners
    socket.on("typing", ({ from }) => {
      if (from === selectedUser._id) {
        set({ typingUser: from });
      }
    });

    socket.on("stopTyping", ({ from }) => {
      if (from === selectedUser._id) {
        set({ typingUser: null });
      }
    });

    // Real-time delete
    socket.on("messageDeleted", ({ messageId }) => {
      set({ messages: get().messages.filter((m) => m._id !== messageId) });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messagesSeen");
    socket.off("scheduledMessageDelivered");
    socket.off("typing");
    socket.off("stopTyping");
    socket.off("messageDeleted");
    set({ typingUser: null });
  },

  setSelectedUser: (selectedUser) => set({
    selectedUser,
    selectedGroup: null,
    messages: [],
    hasMoreMessages: false,
    searchResults: [],
  }),
}));
