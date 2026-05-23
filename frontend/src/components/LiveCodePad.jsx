import { useState, useEffect, useCallback, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { Play, Share2, Users, Download } from "lucide-react";
import toast from "react-hot-toast";

const LiveCodePad = () => {
  const { selectedGroup } = useChatStore();
  const { socket } = useAuthStore();
  
  const [code, setCode] = useState("// Write your code here...\n// Changes are synced in real-time with your team!\n\nfunction helloTeam() {\n  console.log('Hello from Chatty Code Pad!');\n}\n");
  const [language, setLanguage] = useState("javascript");
  const [activeUsers, setActiveUsers] = useState(1);
  const editorRef = useRef(null);
  
  // Ref to track if the current change is local or from socket
  // to prevent infinite echo loops
  const isLocalChange = useRef(false);

  useEffect(() => {
    if (!socket || !selectedGroup) return;

    const groupId = selectedGroup._id;

    // Join the specific room for this code pad
    socket.emit("joinCodePad", { groupId });
    
    // Ask others for current code state
    socket.emit("requestSync", { groupId });

    // Listeners
    const handleCodeChange = ({ code: newCode }) => {
      isLocalChange.current = false;
      setCode(newCode);
    };

    const handleSyncRequested = ({ socketId }) => {
      // Provide current code to the requester
      // Only the "host" or someone who already has the code needs to reply, 
      // but simplistic approach: everyone replies, requester takes the first one.
      socket.emit("provideSync", { targetSocketId: socketId, code });
    };

    socket.on("codeChange", handleCodeChange);
    socket.on("syncRequested", handleSyncRequested);

    return () => {
      socket.off("codeChange", handleCodeChange);
      socket.off("syncRequested", handleSyncRequested);
    };
  }, [socket, selectedGroup]);

  const onChange = useCallback((value) => {
    isLocalChange.current = true;
    setCode(value);
    
    if (socket && selectedGroup) {
      socket.emit("codeChange", {
        groupId: selectedGroup._id,
        code: value,
      });
    }
  }, [socket, selectedGroup]);

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code-snippet-${Date.now()}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRun = () => {
    // Basic unsafe eval for demonstration purposes only
    // In production, this should run in a safe sandbox or backend worker
    try {
      const originalLog = console.log;
      let logs = [];
      console.log = (...args) => {
        logs.push(args.join(" "));
        originalLog(...args);
      };
      
      // eslint-disable-next-line no-eval
      eval(code);
      
      console.log = originalLog;
      if (logs.length > 0) {
        toast.success(`Output:\n${logs.join("\n")}`, { duration: 4000 });
      } else {
        toast.success("Executed successfully with no output");
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-base-300 border-b border-base-100">
        <div className="flex items-center gap-2">
          <select 
            className="select select-sm select-ghost bg-base-100 rounded-md"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="html">HTML/CSS</option>
          </select>
          <div className="badge badge-primary badge-sm gap-1 ml-2">
            <Users className="w-3 h-3" /> Live
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="btn btn-sm btn-ghost btn-circle tooltip tooltip-bottom" data-tip="Download Code">
            <Download className="w-4 h-4 text-base-content/70" />
          </button>
          <button onClick={handleRun} className="btn btn-sm btn-success gap-1">
            <Play className="w-4 h-4" /> Run Local
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={code}
          height="100%"
          theme="dark"
          extensions={[javascript({ jsx: true })]}
          onChange={onChange}
          className="h-full text-base"
          ref={editorRef}
        />
      </div>
    </div>
  );
};

export default LiveCodePad;
