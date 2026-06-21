import { useState, useCallback, useEffect, useRef } from "react";
import { Paper, IconButton, Typography, Box } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useAgent } from "./AgentBridge";
import { useAudioRecorder } from "./useAudioRecorder";
import { audioQueue } from "./AudioQueue";
import AgentChat from "./AgentChat";
import { STATUS } from "./protocol";
import "./spotlight.css";

const STATUS_COLOR = {
  [STATUS.CONNECTING]:   "#f59e0b",
  [STATUS.CONNECTED]:    "#10b981",
  [STATUS.DISCONNECTED]: "#ef4444",
  [STATUS.RECONNECTING]: "#f59e0b",
};

export default function AgentOverlay() {
  const { sendAudioChunk, sendAudioEnd, sendMessage, addMessage, clearMessages, connectionStatus, isAgentSpeaking, isProcessing, isPaused, isWalkthroughActive } = useAgent();

  const [expanded, setExpanded] = useState(false);
  const [welcomePlayed, setWelcomePlayed] = useState(false);

  const handleExpand = useCallback(() => {
    setExpanded(true);
    if (!welcomePlayed) {
      const msgId = crypto.randomUUID();
      addMessage("agent", "Hi, I am Narad, and I am here to help you. How can I help you?");
      audioQueue.enqueueUrl("/tara/narad_welcome.mp3", msgId);
      setWelcomePlayed(true);
    }
  }, [welcomePlayed, addMessage]);

  const isConnected = connectionStatus === STATUS.CONNECTED;
  const canRecord = isConnected && !isProcessing;

  const { isRecording, micPermission, start, stop } = useAudioRecorder({
    enabled: canRecord,
    onChunk: sendAudioChunk,
    onEnd: sendAudioEnd,
    isAgentSpeaking,
  });

  const isRecordingRef = useRef(isRecording);
  const canRecordRef = useRef(canRecord);
  const isSpacePressedRef = useRef(false);
  const isRecordingStartedBySpaceRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    canRecordRef.current = canRecord;
  }, [canRecord]);

  const handleStart = useCallback(() => {
    if (canRecordRef.current) {
      audioQueue.clear();
      start();
    }
  }, [start]);

  useEffect(() => {
    const isTextInput = (target) => {
      if (!target) return false;
      const tagName = target.tagName;
      if (tagName === "BUTTON" || tagName === "SELECT" ||
          target.getAttribute?.("role") === "button" ||
          target.getAttribute?.("role") === "checkbox" ||
          target.getAttribute?.("role") === "switch") {
        return true;
      }
      return (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest?.('[contenteditable="true"]')
      );
    };

    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        if (isTextInput(e.target)) return;
        e.preventDefault();
        if (e.repeat) return;

        isSpacePressedRef.current = true;
        if (canRecordRef.current && !isRecordingRef.current) {
          isRecordingStartedBySpaceRef.current = true;
          handleStart();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space") {
        if (isTextInput(e.target)) return;
        e.preventDefault();
        isSpacePressedRef.current = false;
        if (isRecordingRef.current && isRecordingStartedBySpaceRef.current) {
          stop();
          isRecordingStartedBySpaceRef.current = false;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [stop, handleStart]);

  useEffect(() => {
    if (isRecording && !isSpacePressedRef.current && isRecordingStartedBySpaceRef.current) {
      stop();
      isRecordingStartedBySpaceRef.current = false;
    }
  }, [isRecording, stop]);

  const handleMicClick = () => {
    if (isRecording) {
      stop();
    } else if (canRecord) {
      handleStart();
    }
  };

  // Collapse when walkthrough starts
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (isWalkthroughActive && !prevActiveRef.current) setExpanded(false);
    prevActiveRef.current = isWalkthroughActive;
  }, [isWalkthroughActive]);



  const statusColor = STATUS_COLOR[connectionStatus] || STATUS_COLOR[STATUS.DISCONNECTED];
  const isSpeaking = isAgentSpeaking && !isRecording;
  const micState = isRecording ? "recording" : canRecord ? "ready" : "disabled";
  const micBg = { recording: "#ef4444", ready: "#1e40af", disabled: "#374151" }[micState];

  const ConnectionBadge = ({ isCollapsed }) => {
    if (connectionStatus === STATUS.CONNECTED || connectionStatus === "connected") return null;

    const label = (connectionStatus === STATUS.RECONNECTING || connectionStatus === "reconnecting")
      ? "Reconnecting..."
      : "Connection lost";

    const bgColor = (connectionStatus === STATUS.RECONNECTING || connectionStatus === "reconnecting")
      ? "#FFA500" // Orange
      : "#FF4D4F"; // Red

    const topOffset = isCollapsed ? -36 : -30;

    return (
      <div style={{
        position: "absolute",
        top: topOffset,
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: bgColor,
        color: "white",
        padding: "4px 12px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "bold",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        zIndex: 10000,
        pointerEvents: "none",
        animation: connectionStatus === STATUS.RECONNECTING ? "pulse-dot 1.5s ease-in-out infinite" : "none"
      }}>
        {label}
      </div>
    );
  };

  // ── Collapsed: orb only ──────────────────────────────────────────────────
  if (!expanded) {
    return (
      <Box onClick={handleExpand} sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, cursor: "pointer", display: "flex", alignItems: "center", gap: 1 }}>
        <Box className={connectionStatus === STATUS.RECONNECTING ? "pulse-dot-animation" : ""} sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: statusColor }} />
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ConnectionBadge isCollapsed={true} />
          {isSpeaking && (
            <Box className="siri-glow-aura" sx={{ position: "absolute", top: -3, left: -3, width: 62, height: 62, borderRadius: "50%", background: "linear-gradient(45deg, #a855f7, #3b82f6, #06b6d4, #ec4899)", backgroundSize: "400% 400%", zIndex: 1 }} />
          )}
          <Paper elevation={4} className={isSpeaking ? "siri-orb-glow" : ""} sx={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isConnected ? "#0f172a" : "#374151", color: "#fff", position: "relative", zIndex: 2, transition: "all 0.2s ease", "&:hover": { transform: "scale(1.05)" } }}>
            <AutoAwesomeIcon sx={{ fontSize: 26, color: "#10b981" }} />
          </Paper>
        </Box>
      </Box>
    );
  }

  // ── Expanded: input panel ────────────────────────────────────────────────
  return (
    <Box sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
      <ConnectionBadge isCollapsed={false} />
      <Paper elevation={8} sx={{ width: 320, maxHeight: 440, display: "flex", flexDirection: "column", borderRadius: 3, overflow: "hidden", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)" }}>

        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box className={connectionStatus === STATUS.RECONNECTING ? "pulse-dot-animation" : ""} sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: isPaused ? "#f59e0b" : statusColor }} />
            <Typography variant="caption" sx={{ color: isPaused ? "#f59e0b" : isSpeaking ? "#10b981" : "#94a3b8", fontSize: 12 }}>
              {isPaused ? "Paused" : isSpeaking ? "Speaking..." : connectionStatus === STATUS.RECONNECTING ? "Reconnecting..." : connectionStatus}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton size="small" onClick={clearMessages} sx={{ color: "#64748b" }} title="Clear messages"><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
            <IconButton size="small" onClick={() => setExpanded(false)} sx={{ color: "#64748b" }} title="Minimize"><KeyboardArrowDownIcon sx={{ fontSize: 18 }} /></IconButton>
          </Box>
        </Box>

        {/* Chat history */}
        <AgentChat sx={{ flex: 1, maxHeight: 220, minHeight: 80 }} />



        {/* Mic */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2, borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.2)" }}>
          {micPermission === "denied" && (
            <Typography variant="caption" sx={{ color: "#f87171", fontSize: 11, mb: 1, textAlign: "center", px: 2 }}>
              Microphone access denied. Enable it in browser settings.
            </Typography>
          )}
          <IconButton
            onClick={handleMicClick}
            disabled={!canRecord && !isRecording}
            className={isRecording ? "pulse-mic-animation" : ""}
            sx={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: micBg, color: "#fff", transition: "all 0.2s ease", "&:hover": { backgroundColor: micBg }, "&:active": { transform: "scale(0.95)" } }}
          >
            {canRecord ? <MicIcon sx={{ fontSize: 28 }} /> : <MicOffIcon sx={{ fontSize: 28 }} />}
          </IconButton>
          <Typography variant="caption" sx={{ color: "#64748b", fontSize: 11, mt: 1 }}>
            {isRecording
              ? "Listening... click or release to send"
              : canRecord
              ? "Click to speak or hold Spacebar"
              : isConnected
              ? "Processing..."
              : "Not connected"}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
