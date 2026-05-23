import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const LANGUAGES = [
  "Spanish", "French", "German", "Hindi", "Chinese",
  "Japanese", "Korean", "Arabic", "Portuguese", "Russian",
  "Italian", "Dutch", "Turkish", "Vietnamese", "Thai",
];

const TranslateButton = ({ messageId, originalText }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLang, setSelectedLang] = useState(null);
  const { translateMessage } = useChatStore();

  const handleTranslate = async (language) => {
    setSelectedLang(language);
    setIsTranslating(true);
    setIsOpen(false);

    try {
      const result = await translateMessage(messageId, language);
      setTranslatedText(result);
    } catch (error) {
      setTranslatedText("Translation failed");
    }
    setIsTranslating(false);
  };

  if (!originalText) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-ghost btn-xs gap-1 text-base-content/40 hover:text-primary"
        title="Translate"
      >
        <Languages className="w-3 h-3" />
      </button>

      {/* Language dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full right-0 mb-1 z-50 bg-base-100 border border-base-300 rounded-lg shadow-xl p-2 min-w-[140px] max-h-[200px] overflow-y-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => handleTranslate(lang)}
                className="block w-full text-left px-3 py-1.5 text-sm rounded hover:bg-base-200 transition-colors"
              >
                {lang}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Loading indicator */}
      {isTranslating && (
        <div className="mt-1 flex items-center gap-1 text-xs text-primary">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Translating to {selectedLang}...</span>
        </div>
      )}

      {/* Translated text */}
      {translatedText && !isTranslating && (
        <div className="mt-1 p-2 rounded-lg bg-base-200/50 border border-base-300">
          <div className="flex items-center gap-1 mb-1">
            <Languages className="w-3 h-3 text-primary" />
            <span className="text-xs text-primary font-medium">{selectedLang}</span>
            <button
              onClick={() => {
                setTranslatedText(null);
                setSelectedLang(null);
              }}
              className="ml-auto text-xs text-base-content/40 hover:text-base-content"
            >
              ✕
            </button>
          </div>
          <p className="text-sm">{translatedText}</p>
        </div>
      )}
    </div>
  );
};

export default TranslateButton;
