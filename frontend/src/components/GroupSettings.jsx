import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  X,
  Shield,
  ShieldOff,
  UserMinus,
  Crown,
  LogOut,
  Trash2,
  Loader2,
  UserPlus,
} from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const GroupSettings = ({ group, isOpen, onClose, onGroupUpdated }) => {
  const { authUser } = useAuthStore();
  const { users } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  if (!isOpen || !group) return null;

  const isAdmin = group.admins?.some((a) => a._id === authUser._id);
  const isCreator = group.createdBy?._id === authUser._id;

  const handleAddMember = async (userId) => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.post(`/groups/${group._id}/add-member`, { userId });
      onGroupUpdated(res.data);
      toast.success("Member added!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add");
    }
    setIsLoading(false);
  };

  const handleRemoveMember = async (userId) => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.post(`/groups/${group._id}/remove-member`, { userId });
      onGroupUpdated(res.data);
      toast.success("Member removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove");
    }
    setIsLoading(false);
  };

  const handleMakeAdmin = async (userId) => {
    try {
      const res = await axiosInstance.post(`/groups/${group._id}/make-admin`, { userId });
      onGroupUpdated(res.data);
      toast.success("Made admin!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const handleRemoveAdmin = async (userId) => {
    try {
      const res = await axiosInstance.post(`/groups/${group._id}/remove-admin`, { userId });
      onGroupUpdated(res.data);
      toast.success("Admin removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      await axiosInstance.post(`/groups/${group._id}/leave`);
      toast.success("Left the group");
      onClose();
      useChatStore.getState().setSelectedGroup(null);
      useChatStore.getState().getGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave");
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm("Delete this group? All messages will be lost.")) return;
    try {
      await axiosInstance.delete(`/groups/${group._id}`);
      toast.success("Group deleted");
      onClose();
      useChatStore.getState().setSelectedGroup(null);
      useChatStore.getState().getGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  // Friends who are not in the group yet
  const nonMembers = users.filter(
    (u) => !group.members?.some((m) => m._id === u._id)
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-lg">Group Settings</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Group Info */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto text-2xl font-bold text-primary">
              {group.name?.charAt(0).toUpperCase()}
            </div>
            <h4 className="font-semibold mt-2">{group.name}</h4>
            <p className="text-xs text-base-content/50">
              {group.members?.length} members · Created by {group.createdBy?.fullName}
            </p>
          </div>

          {/* Members List */}
          <div>
            <h5 className="text-sm font-medium mb-2">Members</h5>
            <div className="space-y-1">
              {group.members?.map((member) => {
                const isMemberAdmin = group.admins?.some((a) => a._id === member._id);
                const isMemberCreator = group.createdBy?._id === member._id;
                const isMe = member._id === authUser._id;

                return (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-base-200/50"
                  >
                    <img
                      src={member.profilePic || "/avatar.png"}
                      alt={member.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.fullName} {isMe && "(You)"}
                      </p>
                      <div className="flex items-center gap-1">
                        {isMemberCreator && (
                          <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                            <Crown className="w-3 h-3" /> Creator
                          </span>
                        )}
                        {isMemberAdmin && !isMemberCreator && (
                          <span className="text-[10px] text-primary flex items-center gap-0.5">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Admin controls */}
                    {isAdmin && !isMe && !isMemberCreator && (
                      <div className="flex gap-1">
                        {isMemberAdmin ? (
                          isCreator && (
                            <button
                              onClick={() => handleRemoveAdmin(member._id)}
                              className="btn btn-ghost btn-xs text-orange-500"
                              title="Remove admin"
                            >
                              <ShieldOff className="w-3.5 h-3.5" />
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handleMakeAdmin(member._id)}
                            className="btn btn-ghost btn-xs text-primary"
                            title="Make admin"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="btn btn-ghost btn-xs text-red-500"
                          title="Remove member"
                          disabled={isLoading}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Members (admin only) */}
          {isAdmin && nonMembers.length > 0 && (
            <div>
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="btn btn-outline btn-sm btn-primary w-full gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Members
              </button>

              {showAddMember && (
                <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto border border-base-300 rounded-lg p-2">
                  {nonMembers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer"
                      onClick={() => handleAddMember(user._id)}
                    >
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-sm">{user.fullName}</span>
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5 ml-auto text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-base-300 flex gap-2 shrink-0">
          {!isCreator && (
            <button
              onClick={handleLeaveGroup}
              className="btn btn-outline btn-sm btn-error flex-1 gap-1"
            >
              <LogOut className="w-4 h-4" /> Leave Group
            </button>
          )}
          {isCreator && (
            <button
              onClick={handleDeleteGroup}
              className="btn btn-outline btn-sm btn-error flex-1 gap-1"
            >
              <Trash2 className="w-4 h-4" /> Delete Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupSettings;
