import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Clock, Paperclip, Code2, FileText } from "lucide-react";
import toast from "react-hot-toast";
import ScheduleMessageModal from "./ScheduleMessageModal";

const TYPING_STOP_DELAY = 1500; // ms

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  
  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Code snippet state
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("javascript");

  const [showSchedule, setShowSchedule] = useState(false);
  const fileInputRef = useRef(null);
  const genericFileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const { sendMessage, emitTyping, emitStopTyping } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setSelectedFile(null); // Clear generic file if image selected
    };
    reader.readAsDataURL(file);
  };

  const handleGenericFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: add size limit check here (e.g., 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile({
        data: reader.result,
        name: file.name,
        type: file.type || "application/octet-stream",
      });
      setImagePreview(null); // Clear image if generic file selected
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (genericFileInputRef.current) genericFileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !selectedFile) return;

    // Stop typing indicator before sending
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      emitStopTyping();
      isTypingRef.current = false;
    }

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        file: selectedFile?.data,
        fileName: selectedFile?.name,
        fileType: selectedFile?.type,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (genericFileInputRef.current) genericFileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);

    // Emit typing start (only once per typing session)
    if (!isTypingRef.current) {
      emitTyping();
      isTypingRef.current = true;
    }

    // Reset the stop-typing debounce
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping();
      isTypingRef.current = false;
    }, TYPING_STOP_DELAY);
  };

  const handleSendCodeSnippet = async () => {
    if (!codeSnippet.trim()) return;
    try {
      await sendMessage({
        text: codeSnippet,
        isCodeSnippet: true,
        language: codeLanguage,
      });
      setShowCodeModal(false);
      setCodeSnippet("");
    } catch (error) {
      console.error("Failed to send code:", error);
    }
  };

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {selectedFile && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative bg-base-200 p-3 rounded-lg border border-base-300 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <div className="text-sm">
              <p className="font-medium truncate max-w-[150px]">{selectedFile.name}</p>
            </div>
            <button
              onClick={removeFile}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center border border-base-300"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={handleTextChange}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <input
            type="file"
            className="hidden"
            ref={genericFileInputRef}
            onChange={handleGenericFileChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
          >
            <Image size={20} />
          </button>
          
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${selectedFile ? "text-primary" : "text-zinc-400"}`}
            onClick={() => genericFileInputRef.current?.click()}
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>

          <button
            type="button"
            className="hidden sm:flex btn btn-circle text-zinc-400 hover:text-primary"
            onClick={() => setShowCodeModal(true)}
            title="Send code snippet"
          >
            <Code2 size={20} />
          </button>

          {/* Schedule button */}
          <button
            type="button"
            className="hidden sm:flex btn btn-circle text-zinc-400 hover:text-primary"
            onClick={() => {
              if (!text.trim() && !imagePreview && !selectedFile) {
                toast.error("Attach something first to schedule");
                return;
              }
              setShowSchedule(true);
            }}
            title="Schedule message"
          >
            <Clock size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview && !selectedFile}
        >
          <Send size={22} />
        </button>
      </form>

      {/* Code Snippet Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 w-full max-w-2xl rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/50">
              <h3 className="font-bold flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" /> Send Code Snippet
              </h3>
              <button onClick={() => setShowCodeModal(false)} className="btn btn-ghost btn-sm btn-circle">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-4">
              <select 
                className="select select-bordered w-full max-w-xs"
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
                <option value="bash">Bash</option>
              </select>
              
              <textarea
                className="textarea textarea-bordered w-full h-64 font-mono text-sm leading-relaxed"
                placeholder="Paste your code here..."
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
              />
            </div>
            
            <div className="p-4 border-t border-base-200 flex justify-end gap-2 bg-base-200/50">
              <button onClick={() => setShowCodeModal(false)} className="btn btn-ghost">Cancel</button>
              <button 
                onClick={handleSendCodeSnippet} 
                className="btn btn-primary gap-2"
                disabled={!codeSnippet.trim()}
              >
                <Send className="w-4 h-4" /> Send Snippet
              </button>
            </div>
          </div>
        </div>
      )}

      <ScheduleMessageModal
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        text={text}
        image={imagePreview}
        onScheduled={() => {
          setText("");
          setImagePreview(null);
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (genericFileInputRef.current) genericFileInputRef.current.value = "";
        }}
      />
    </div>
  );
};
export default MessageInput;
