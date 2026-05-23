import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { CheckCircle2, Circle, Clock, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const ProjectTasks = () => {
  const { selectedGroup, addTask, updateTaskStatus, deleteTask } = useChatStore();
  const { authUser } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addTask({
      title,
      description,
      assignedTo: assignedTo || null,
    });

    setTitle("");
    setDescription("");
    setAssignedTo("");
    setShowForm(false);
  };

  if (!selectedGroup) return null;

  const tasks = selectedGroup.tasks || [];
  const todo = tasks.filter((t) => t.status === "todo");
  const inProgress = tasks.filter((t) => t.status === "in-progress");
  const done = tasks.filter((t) => t.status === "done");

  const TaskCard = ({ task }) => {
    const isCreator = task.createdBy?._id === authUser._id || task.createdBy === authUser._id;
    const isAdmin = selectedGroup.admins.some(
      (a) => (a._id || a) === authUser._id
    );
    const canDelete = isCreator || isAdmin;

    return (
      <div className="bg-base-200 p-3 rounded-xl border border-base-300 relative group">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
            {task.description && (
              <p className="text-xs text-base-content/60 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          {canDelete && (
            <button
              onClick={() => deleteTask(task._id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-base-content/40 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <select
            className="select select-xs select-ghost px-1 h-6 min-h-6 bg-base-100"
            value={task.status}
            onChange={(e) => updateTaskStatus(task._id, e.target.value)}
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>

          {task.assignedTo && (
            <div className="tooltip tooltip-left" data-tip={`Assigned to ${task.assignedTo.fullName}`}>
              <img
                src={task.assignedTo.profilePic || "/avatar.png"}
                className="w-5 h-5 rounded-full object-cover"
                alt=""
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-base-100/50">
      <div className="p-4 border-b border-base-300 flex justify-between items-center">
        <div>
          <h2 className="font-semibold">Project Tasks</h2>
          <p className="text-xs text-base-content/60">{tasks.length} total tasks</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary btn-sm gap-1"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {showForm && (
        <div className="p-4 border-b border-base-300 bg-base-200/50">
          <form onSubmit={handleAddTask} className="space-y-3">
            <input
              type="text"
              className="input input-sm input-bordered w-full"
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              className="input input-sm input-bordered w-full"
              placeholder="Description (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="select select-sm select-bordered flex-1"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {selectedGroup.members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-sm btn-primary w-20" disabled={!title.trim()}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-4 min-w-max h-full">
          {/* To Do Column */}
          <div className="w-72 bg-base-100 rounded-2xl flex flex-col h-full border border-base-300 shadow-sm">
            <div className="p-3 border-b border-base-300 flex items-center gap-2">
              <Circle className="w-4 h-4 text-base-content/40" />
              <h3 className="font-semibold text-sm">To Do ({todo.length})</h3>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {todo.map((task) => (
                <TaskCard key={task._id} task={task} />
              ))}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="w-72 bg-base-100 rounded-2xl flex flex-col h-full border border-base-300 shadow-sm">
            <div className="p-3 border-b border-base-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <h3 className="font-semibold text-sm">In Progress ({inProgress.length})</h3>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {inProgress.map((task) => (
                <TaskCard key={task._id} task={task} />
              ))}
            </div>
          </div>

          {/* Done Column */}
          <div className="w-72 bg-base-100 rounded-2xl flex flex-col h-full border border-base-300 shadow-sm">
            <div className="p-3 border-b border-base-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <h3 className="font-semibold text-sm">Done ({done.length})</h3>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {done.map((task) => (
                <TaskCard key={task._id} task={task} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTasks;
