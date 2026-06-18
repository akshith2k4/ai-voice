import { useState, useCallback, useEffect, useRef } from "react";
import { Paper, IconButton, Typography, Box } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
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

  const isConnected = connectionStatus === STATUS.CONNECTED;
  const canRecord = isConnected && !isProcessing;

  const { isRecording, micPermission, start, stop } = useAudioRecorder({
    enabled: canRecord,
    onChunk: sendAudioChunk,
    onEnd: sendAudioEnd,
  });

  const handleStart = () => {
    if (canRecord) {
      audioQueue.clear();
      start();
    }
  };

  // Collapse when walkthrough starts
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (isWalkthroughActive && !prevActiveRef.current) setExpanded(false);
    prevActiveRef.current = isWalkthroughActive;
  }, [isWalkthroughActive]);

  const handleTextSubmit = useCallback((e) => {
    e.preventDefault();
    const text = e.target.elements.message?.value?.trim();
    if (!text) return;
    sendMessage({ type: "voice", text });
    addMessage("user", text);
    e.target.reset();
  }, [sendMessage, addMessage]);

  const statusColor = STATUS_COLOR[connectionStatus] || STATUS_COLOR[STATUS.DISCONNECTED];
  const isSpeaking = isAgentSpeaking && !isRecording;
  const micState = isRecording ? "recording" : canRecord ? "ready" : "disabled";
  const micBg = { recording: "#ef4444", ready: "#1e40af", disabled: "#374151" }[micState];

  // ── Collapsed: orb only ──────────────────────────────────────────────────
  if (!expanded) {
    return (
      <Box onClick={() => setExpanded(true)} sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, cursor: "pointer", display: "flex", alignItems: "center", gap: 1 }}>
        <Box className={connectionStatus === STATUS.RECONNECTING ? "pulse-dot-animation" : ""} sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: statusColor }} />
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isSpeaking && isWalkthroughActive && (
            <Box className="siri-glow-aura" sx={{ position: "absolute", top: -3, left: -3, width: 62, height: 62, borderRadius: "50%", background: "linear-gradient(45deg, #a855f7, #3b82f6, #06b6d4, #ec4899)", backgroundSize: "400% 400%", zIndex: 1 }} />
          )}
          <Paper elevation={4} className={isSpeaking && isWalkthroughActive ? "siri-orb-glow" : ""} sx={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isConnected ? "#0f172a" : "#374151", color: "#fff", position: "relative", zIndex: 2, transition: "all 0.2s ease", "&:hover": { transform: "scale(1.05)" } }}>
            <MicIcon sx={{ fontSize: 28 }} />
          </Paper>
        </Box>
      </Box>
    );
  }

  // ── Expanded: input panel ────────────────────────────────────────────────
  return (
    <Paper elevation={8} sx={{ position: "fixed", bottom: 24, right: 24, width: 320, maxHeight: 440, zIndex: 9999, display: "flex", flexDirection: "column", borderRadius: 3, overflow: "hidden", backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)" }}>

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

      {/* Text input */}
      <Box component="form" onSubmit={handleTextSubmit} sx={{ display: "flex", gap: 1, p: 1.5, borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
        <input
          name="message"
          type="text"
          placeholder={isConnected ? "Type a command..." : "Disconnected"}
          disabled={!isConnected}
          style={{ flex: 1, padding: "8px 12px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, fontSize: 14, outline: "none", fontFamily: "inherit", backgroundColor: "rgba(255,255,255,0.05)", color: "white" }}
        />
        <button type="submit" disabled={!isConnected} style={{ padding: "4px 12px", backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "inherit", opacity: isConnected ? 1 : 0.5 }}>
          Send
        </button>
      </Box>

      {/* Mic */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2, borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.2)" }}>
        {micPermission === "denied" && (
          <Typography variant="caption" sx={{ color: "#f87171", fontSize: 11, mb: 1, textAlign: "center", px: 2 }}>
            Microphone access denied. Enable it in browser settings.
          </Typography>
        )}
        <IconButton
          onMouseDown={(e) => { e.preventDefault(); handleStart(); }}
          onMouseUp={(e) => { e.preventDefault(); stop(); }}
          onMouseLeave={() => { if (isRecording) stop(); }}
          onTouchStart={(e) => { e.preventDefault(); handleStart(); }}
          onTouchEnd={(e) => { e.preventDefault(); stop(); }}
          disabled={!canRecord}
          className={isRecording ? "pulse-mic-animation" : ""}
          sx={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: micBg, color: "#fff", transition: "all 0.2s ease", "&:hover": { backgroundColor: micBg }, "&:active": { transform: "scale(0.95)" } }}
        >
          {canRecord ? <MicIcon sx={{ fontSize: 28 }} /> : <MicOffIcon sx={{ fontSize: 28 }} />}
        </IconButton>
        <Typography variant="caption" sx={{ color: "#64748b", fontSize: 11, mt: 1 }}>
          {isRecording ? "Listening... release to send" : canRecord ? "Hold to speak" : isConnected ? "Processing..." : "Not connected"}
        </Typography>
      </Box>
    </Paper>
  );
}
