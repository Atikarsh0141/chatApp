import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from "lucide-react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const CallModal = () => {
  const { socket, authUser } = useAuthStore();

  const [callState, setCallState] = useState("idle"); // idle, calling, incoming, connected
  const [callType, setCallType] = useState(null); // "voice" or "video"
  const [remoteUser, setRemoteUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const incomingOfferRef = useRef(null);

  // Start call timer
  const startTimer = useCallback(() => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Clean up media streams and peer connection
  const cleanup = useCallback(() => {
    stopTimer();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    pendingCandidatesRef.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState("idle");
    setCallType(null);
    setRemoteUser(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
  }, [stopTimer]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUser) {
        socket.emit("iceCandidate", {
          to: remoteUser._id || remoteUser,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        endCall();
      }
    };

    peerRef.current = pc;
    return pc;
  }, [socket, remoteUser]);

  // Initiate a call (called from ChatHeader)
  const startCall = useCallback(
    async (user, type) => {
      try {
        setRemoteUser(user);
        setCallType(type);
        setCallState("calling");

        const constraints = {
          audio: true,
          video: type === "video",
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("callUser", {
          to: user._id,
          offer,
          callType: type,
          callerInfo: {
            _id: authUser._id,
            fullName: authUser.fullName,
            profilePic: authUser.profilePic,
          },
        });
      } catch (error) {
        console.error("Failed to start call:", error);
        cleanup();
      }
    },
    [socket, authUser, createPeerConnection, cleanup]
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    try {
      setCallState("connected");
      startTimer();

      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));

      // Process any pending ICE candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("callAccepted", {
        to: remoteUser._id || remoteUser,
        answer,
      });
    } catch (error) {
      console.error("Failed to accept call:", error);
      cleanup();
    }
  }, [socket, callType, remoteUser, createPeerConnection, startTimer, cleanup]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (remoteUser) {
      socket.emit("callRejected", { to: remoteUser._id || remoteUser });
    }
    cleanup();
  }, [socket, remoteUser, cleanup]);

  // End call
  const endCall = useCallback(() => {
    if (remoteUser) {
      socket.emit("callEnded", { to: remoteUser._id || remoteUser });
    }
    cleanup();
  }, [socket, remoteUser, cleanup]);

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("incomingCall", ({ from, offer, callType: type, callerInfo }) => {
      setRemoteUser(callerInfo);
      setCallType(type);
      setCallState("incoming");
      incomingOfferRef.current = offer;
    });

    socket.on("callAccepted", async ({ answer }) => {
      try {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));

          // Process any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];

          setCallState("connected");
          startTimer();
        }
      } catch (error) {
        console.error("Error handling callAccepted:", error);
      }
    });

    socket.on("callRejected", () => {
      cleanup();
    });

    socket.on("callEnded", () => {
      cleanup();
    });

    socket.on("callFailed", ({ reason }) => {
      cleanup();
    });

    socket.on("iceCandidate", async ({ candidate }) => {
      try {
        if (peerRef.current && peerRef.current.remoteDescription) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callAccepted");
      socket.off("callRejected");
      socket.off("callEnded");
      socket.off("callFailed");
      socket.off("iceCandidate");
    };
  }, [socket, startTimer, cleanup]);

  // Expose startCall globally so ChatHeader can trigger it
  useEffect(() => {
    window.__startCall = startCall;
    return () => {
      delete window.__startCall;
    };
  }, [startCall]);

  if (callState === "idle") return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Call Header */}
        <div className="bg-gradient-to-r from-primary/30 to-secondary/30 p-6 text-center">
          <img
            src={remoteUser?.profilePic || "/avatar.png"}
            alt={remoteUser?.fullName}
            className="w-20 h-20 rounded-full mx-auto border-4 border-white/20 object-cover"
          />
          <h3 className="font-semibold text-lg mt-3">{remoteUser?.fullName || "Unknown"}</h3>
          <p className="text-sm text-base-content/60 mt-1">
            {callState === "calling" && "Calling..."}
            {callState === "incoming" && `Incoming ${callType} call...`}
            {callState === "connected" && formatDuration(callDuration)}
          </p>
        </div>

        {/* Video Area */}
        {callType === "video" && callState === "connected" && (
          <div className="relative bg-black aspect-video">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-3 right-3 w-32 h-24 rounded-lg object-cover border-2 border-white/30"
            />
          </div>
        )}

        {/* Hidden audio elements for voice calls */}
        {callType === "voice" && (
          <>
            <audio ref={remoteVideoRef} autoPlay />
            <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
          </>
        )}

        {/* Controls */}
        <div className="p-6 flex items-center justify-center gap-4">
          {callState === "incoming" ? (
            <>
              <button
                onClick={acceptCall}
                className="btn btn-circle btn-lg bg-green-600 hover:bg-green-700 text-white border-none"
              >
                <Phone className="w-6 h-6" />
              </button>
              <button
                onClick={rejectCall}
                className="btn btn-circle btn-lg bg-red-600 hover:bg-red-700 text-white border-none"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`btn btn-circle ${isMuted ? "btn-error" : "btn-ghost"}`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {callType === "video" && (
                <button
                  onClick={toggleVideo}
                  className={`btn btn-circle ${isVideoOff ? "btn-error" : "btn-ghost"}`}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}

              <button
                onClick={endCall}
                className="btn btn-circle btn-lg bg-red-600 hover:bg-red-700 text-white border-none"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;
