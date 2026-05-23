import { useState } from "react";
import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { useAuthStore } from "../store/useAuthStore";
import { Send, Eye, EyeOff, Bot, Languages, Loader2 } from "lucide-react";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Hindi", "Chinese",
  "Japanese", "Korean", "Arabic", "Portuguese", "Russian",
  "Italian", "Dutch", "Turkish",
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { authUser, updatePrivacySettings, updateAutoReply } = useAuthStore();

  const [showLastSeen, setShowLastSeen] = useState(authUser?.showLastSeen ?? true);
  const [preferredLanguage, setPreferredLanguage] = useState(authUser?.preferredLanguage || "English");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(authUser?.autoReplyEnabled ?? false);
  const [autoReplyMessage, setAutoReplyMessage] = useState(authUser?.autoReplyMessage || "");
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [isSavingAutoReply, setIsSavingAutoReply] = useState(false);

  const handleSavePrivacy = async () => {
    setIsSavingPrivacy(true);
    await updatePrivacySettings({ showLastSeen, preferredLanguage });
    setIsSavingPrivacy(false);
  };

  const handleSaveAutoReply = async () => {
    setIsSavingAutoReply(true);
    await updateAutoReply({ autoReplyEnabled, autoReplyMessage });
    setIsSavingAutoReply(false);
  };

  return (
    <div className="min-h-screen container mx-auto px-4 pt-20 max-w-5xl pb-10">
      <div className="space-y-6">
        {/* Theme Section */}
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">Choose a theme for your chat interface</p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
              `}
              onClick={() => setTheme(t)}
            >
              <div className="relative h-8 w-full rounded-md overflow-hidden" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary"></div>
                  <div className="rounded bg-secondary"></div>
                  <div className="rounded bg-accent"></div>
                  <div className="rounded bg-neutral"></div>
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Privacy Section */}
        {authUser && (
          <div className="bg-base-100 rounded-xl border border-base-300 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Privacy</h2>
            </div>

            <div className="space-y-4">
              {/* Last Seen Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Show Last Seen</p>
                  <p className="text-xs text-base-content/60">
                    Others can see when you were last active
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={showLastSeen}
                  onChange={(e) => setShowLastSeen(e.target.checked)}
                />
              </div>

              {/* Preferred Language */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-1">
                    <Languages className="w-4 h-4" />
                    Preferred Language
                  </p>
                  <p className="text-xs text-base-content/60">For translation features</p>
                </div>
                <select
                  className="select select-bordered select-sm w-36"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSavePrivacy}
                className="btn btn-primary btn-sm"
                disabled={isSavingPrivacy}
              >
                {isSavingPrivacy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Privacy Settings"
                )}
              </button>
            </div>
          </div>
        )}

        {/* AI Auto-Reply Section */}
        {authUser && (
          <div className="bg-base-100 rounded-xl border border-base-300 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-5 h-5 text-cyan-500" />
              <h2 className="text-lg font-semibold">AI Auto-Reply</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Enable Auto-Reply</p>
                  <p className="text-xs text-base-content/60">
                    AI will respond to messages when you&apos;re offline
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={autoReplyEnabled}
                  onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                />
              </div>

              {autoReplyEnabled && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-sm">Custom Context (optional)</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered text-sm h-20"
                    placeholder="e.g. I'm on vacation until Monday. For urgent matters, call 555-1234."
                    value={autoReplyMessage}
                    onChange={(e) => setAutoReplyMessage(e.target.value)}
                  />
                  <label className="label">
                    <span className="label-text-alt text-xs text-base-content/50">
                      This context helps the AI generate more relevant replies
                    </span>
                  </label>
                </div>
              )}

              <button
                onClick={handleSaveAutoReply}
                className="btn btn-primary btn-sm"
                disabled={isSavingAutoReply}
              >
                {isSavingAutoReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Auto-Reply Settings"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Preview Section */}
        <h3 className="text-lg font-semibold mb-3">Preview</h3>
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
          <div className="p-4 bg-base-200">
            <div className="max-w-lg mx-auto">
              {/* Mock Chat UI */}
              <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                      J
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">John Doe</h3>
                      <p className="text-xs text-base-content/70">Online</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
                  {PREVIEW_MESSAGES.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`
                          max-w-[80%] rounded-xl p-3 shadow-sm
                          ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                        `}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`
                            text-[10px] mt-1.5
                            ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}
                          `}
                        >
                          12:00 PM
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-base-300 bg-base-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered flex-1 text-sm h-10"
                      placeholder="Type a message..."
                      value="This is a preview"
                      readOnly
                    />
                    <button className="btn btn-primary h-10 min-h-0">
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
