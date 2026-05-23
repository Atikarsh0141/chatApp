import { useState, useEffect } from "react";
import { X, Clock, Loader2, Trash2, CalendarClock } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";

const ScheduleMessageModal = ({ isOpen, onClose, text, image, onScheduled }) => {
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const { scheduleMessage, getScheduledMessages, cancelScheduledMessage } = useChatStore();

  useEffect(() => {
    if (isOpen) {
      loadScheduledMessages();
      // Set default date/time to 1 hour from now
      const now = new Date();
      now.setHours(now.getHours() + 1);
      setScheduledDate(now.toISOString().split("T")[0]);
      setScheduledTime(now.toTimeString().slice(0, 5));
    }
  }, [isOpen]);

  const loadScheduledMessages = async () => {
    setIsLoadingScheduled(true);
    try {
      const messages = await getScheduledMessages();
      setScheduledMessages(messages || []);
    } catch (error) {
      console.error("Failed to load scheduled messages");
    }
    setIsLoadingScheduled(false);
  };

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      toast.error("Please select date and time");
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledAt <= new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    setIsScheduling(true);
    try {
      await scheduleMessage({ text, image, scheduledAt: scheduledAt.toISOString() });
      toast.success("Message scheduled!");
      onScheduled?.();
      onClose();
    } catch (error) {
      toast.error("Failed to schedule message");
    }
    setIsScheduling(false);
  };

  const handleCancel = async (messageId) => {
    try {
      await cancelScheduledMessage(messageId);
      toast.success("Scheduled message cancelled");
      loadScheduledMessages();
    } catch (error) {
      toast.error("Failed to cancel");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-base-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Schedule Message</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Schedule Form */}
        <div className="px-6 py-5 space-y-4">
          {text && (
            <div className="bg-base-200 rounded-lg p-3">
              <p className="text-sm text-base-content/70 mb-1">Message:</p>
              <p className="text-sm truncate">{text}</p>
            </div>
          )}

          <div className="flex gap-3">
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text text-sm">Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm w-full"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text text-sm">Time</span>
              </label>
              <input
                type="time"
                className="input input-bordered input-sm w-full"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={handleSchedule}
            disabled={isScheduling || (!text && !image)}
            className="btn btn-primary w-full btn-sm"
          >
            {isScheduling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Schedule Message
              </>
            )}
          </button>
        </div>

        {/* Pending Scheduled Messages */}
        {scheduledMessages.length > 0 && (
          <div className="border-t border-base-300">
            <div className="px-6 py-3">
              <p className="text-sm font-medium text-base-content/60">
                Pending ({scheduledMessages.length})
              </p>
            </div>
            <div className="max-h-[200px] overflow-y-auto px-6 pb-4 space-y-2">
              {scheduledMessages.map((msg) => (
                <div
                  key={msg._id}
                  className="flex items-center justify-between bg-base-200 rounded-lg p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{msg.text || "[Image]"}</p>
                    <p className="text-xs text-base-content/50">
                      To: {msg.receiverId?.fullName} •{" "}
                      {new Date(msg.scheduledAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancel(msg._id)}
                    className="btn btn-ghost btn-xs text-error ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleMessageModal;
