import { useEffect, useState } from "react";
import {
  BarChart3,
  MessageSquare,
  Send,
  Inbox,
  Clock,
  ShieldAlert,
  Bot,
  Users,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await axiosInstance.get("/analytics");
      setAnalytics(res.data);
    } catch (error) {
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  const formatResponseTime = (seconds) => {
    if (seconds === 0) return "N/A";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) return null;

  const maxDailyCount = Math.max(...analytics.dailyData.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-base-200 pt-20 pb-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Chat Analytics</h1>
          </div>
          <p className="text-base-content/60">Track your messaging activity and patterns</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-base-100 rounded-xl p-5 shadow-sm border border-base-300 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-sm text-base-content/60">Total Messages</span>
            </div>
            <p className="text-3xl font-bold">{analytics.totalMessages}</p>
          </div>

          <div className="bg-base-100 rounded-xl p-5 shadow-sm border border-base-300 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Send className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-base-content/60">Sent</span>
            </div>
            <p className="text-3xl font-bold">{analytics.totalSent}</p>
          </div>

          <div className="bg-base-100 rounded-xl p-5 shadow-sm border border-base-300 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Inbox className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-sm text-base-content/60">Received</span>
            </div>
            <p className="text-3xl font-bold">{analytics.totalReceived}</p>
          </div>

          <div className="bg-base-100 rounded-xl p-5 shadow-sm border border-base-300 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-sm text-base-content/60">Avg Response</span>
            </div>
            <p className="text-3xl font-bold">{formatResponseTime(analytics.avgResponseTime)}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Messages Per Day Chart */}
          <div className="md:col-span-2 bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Messages (Last 7 Days)</h2>
            </div>
            <div className="flex items-end gap-3 h-48">
              {analytics.dailyData.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-base-content/60 font-medium">{day.count}</span>
                  <div className="w-full relative group">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary/60 transition-all duration-500 hover:from-primary hover:to-secondary min-h-[4px]"
                      style={{ height: `${(day.count / maxDailyCount) * 160}px` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-8 hidden group-hover:block bg-base-300 text-sm rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap z-10">
                      {day.date}: {day.count} messages
                    </div>
                  </div>
                  <span className="text-xs text-base-content/50">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Contacts */}
          <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Top Contacts</h2>
            </div>
            <div className="space-y-4">
              {analytics.topContacts.length > 0 ? (
                analytics.topContacts.map((contact, i) => (
                  <div key={contact._id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-base-content/40 w-5">
                      #{i + 1}
                    </span>
                    <img
                      src={contact.profilePic || "/avatar.png"}
                      alt={contact.fullName}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.fullName}</p>
                      <p className="text-xs text-base-content/50">
                        {contact.messageCount} messages
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-base-content/50 text-center py-4">
                  No conversations yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-base-100 rounded-xl p-5 shadow-sm border border-base-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.spamCount}</p>
              <p className="text-sm text-base-content/60">Spam Detected</p>
            </div>
          </div>
          <div className="bg-base-100 rounded-xl p-5 shadow-sm border border-base-300 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.autoReplyCount}</p>
              <p className="text-sm text-base-content/60">Auto-Replies Sent</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
