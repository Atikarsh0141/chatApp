import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { X, Users, Loader2 } from "lucide-react";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { users, createGroup } = useChatStore();
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    if (selectedMembers.length === 0) return;

    setIsCreating(true);
    await createGroup({ name: name.trim(), memberIds: selectedMembers });
    setIsCreating(false);
    setName("");
    setSelectedMembers([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Create Group</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Group Name */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">Group Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Enter group name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Member Selection */}
          <div>
            <label className="label">
              <span className="label-text text-sm font-medium">
                Select Members ({selectedMembers.length} selected)
              </span>
            </label>
            <div className="max-h-[200px] overflow-y-auto space-y-1 border border-base-300 rounded-lg p-2">
              {users.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-4">
                  Add contacts first to create a group
                </p>
              ) : (
                users.map((user) => (
                  <label
                    key={user._id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedMembers.includes(user._id) ? "bg-primary/10" : "hover:bg-base-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={selectedMembers.includes(user._id)}
                      onChange={() => toggleMember(user._id)}
                    />
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium">{user.fullName}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-base-300 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="btn btn-primary btn-sm"
            disabled={!name.trim() || selectedMembers.length === 0 || isCreating}
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
