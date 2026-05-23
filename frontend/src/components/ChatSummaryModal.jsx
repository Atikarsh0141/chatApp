import { useState } from "react";
import { X, Loader2, Sparkles } from "lucide-react";

const ChatSummaryModal = ({ isOpen, onClose, summary, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-base-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Chat Summary</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-base-content/60 text-sm">Generating summary with AI...</p>
            </div>
          ) : summary ? (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-base-content/80 leading-relaxed">
                {summary}
              </div>
            </div>
          ) : (
            <p className="text-base-content/60 text-center py-8">No summary available</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-base-300 bg-base-200/50">
          <p className="text-xs text-base-content/40 text-center">
            🤖 Powered by AI — summary may not be 100% accurate
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatSummaryModal;
