import { useState, useRef, useCallback, useEffect } from "react";
import { useAgent } from "./AgentBridge";
import {
  Paper,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
import "./spotlight.css";

// ============================================
// Agent Overlay — Floating widget
// Bottom-right push-to-talk mic + text display
// ============================================

// Status display config
const STATUS_CONFIG = {
  connecting:    { color: "#f59e0b", label: "Connecting..." },
  connected:     { color: "#10b981", label: "Connected" },
  disconnected:  { color: "#ef4444", label: "Disconnected" },
  reconnecting:  { color: "#f59e0b", label: "Reconnecting..." },
};

export default function AgentOverlay() {
  const {
    sendAudio,
    connectionStatus,
    agentMessages,
    isProcessing,
    isAgentSpeaking,
    clearMessages,
    sendMessage,
    addMessage,
    isPaused,
  } = useAgent();

  const [expanded, setExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState("prompt"); // "prompt" | "granted" | "denied"

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const recordingActiveRef = useRef(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages]);

  // ---- Push-to-talk ----
  const startRecording = useCallback(async () => {
    if (recordingActiveRef.current) return;
    if (connectionStatus !== "connected") return;
    if (isProcessing) return;

    try {
      if (micPermission !== "granted") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setMicPermission("granted");
      } else if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }

      const stream = streamRef.current;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });
        chunksRef.current = [];
        recordingActiveRef.current = false;
        setIsRecording(false);

        // Don't send if blob is too small (< 1KB = likely just noise)
        if (blob.size < 3072) return;

        sendAudio(blob);
      };

      mediaRecorder.onerror = (error) => {
        console.error("[AgentOverlay] MediaRecorder error:", error);
        recordingActiveRef.current = false;
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      recordingActiveRef.current = true;
      setIsRecording(true);
    } catch (error) {
      console.error("[AgentOverlay] Failed to start recording:", error);
      if (error.name === "NotAllowedError") {
        setMicPermission("denied");
      }
    }
  }, [connectionStatus, isProcessing, micPermission, sendAudio]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ---- Mouse/touch handlers for push-to-talk ----
  const handleMicDown = useCallback(
    (e) => {
      e.preventDefault();
      startRecording();
    },
    [startRecording]
  );

  const handleMicUp = useCallback(
    (e) => {
      e.preventDefault();
      stopRecording();
    },
    [stopRecording]
  );

  const handleMouseLeave = useCallback(() => {
    if (recordingActiveRef.current) {
      stopRecording();
    }
  }, [stopRecording]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);
  
  const handleTextSubmit = useCallback(
    (text) => {
      if (!text.trim()) return;
      sendMessage({ type: "voice", text: text.trim() });
      addMessage("user", text.trim());
    },
    [sendMessage, addMessage]
  );

  // ---- Render helpers ----
  const statusConfig = STATUS_CONFIG[connectionStatus] || STATUS_CONFIG.disconnected;
  const isConnected = connectionStatus === "connected";
  const canRecord = isConnected && !isProcessing;

  // ---- Collapsed state: floating orb ----
  if (!expanded) {
    return (
      <Box
        onClick={() => setExpanded(true)}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {/* Status dot */}
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: statusConfig.color,
            boxShadow:
              connectionStatus === "reconnecting"
                ? `0 0 8px ${statusConfig.color}`
                : "none",
            animation:
              connectionStatus === "reconnecting"
                ? "pulse-dot 2s ease-in-out infinite"
                : "none",
            "@keyframes pulse-dot": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.4 },
            },
          }}
        />

        {/* Mic orb */}
        <Paper
          elevation={4}
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isConnected ? "#0f172a" : "#374151",
            color: "#fff",
            transition: "all 0.2s ease",
            "&:hover": {
              transform: "scale(1.05)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            },
          }}
        >
          <MicIcon sx={{ fontSize: 28 }} />
        </Paper>
      </Box>
    );
  }

  // ---- Expanded state: full widget ----
  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 320,
        maxHeight: 440,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        overflow: "hidden",
        backgroundColor: "#0f172a",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isPaused ? "#f59e0b" : statusConfig.color,
              animation:
                connectionStatus === "reconnecting"
                  ? "pulse-dot 2s ease-in-out infinite"
                  : "none",
              "@keyframes pulse-dot": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.4 },
              },
            }}
          />
          <Typography variant="caption" sx={{ color: isPaused ? "#f59e0b" : isAgentSpeaking ? "#10b981" : "#94a3b8", fontSize: 12 }}>
            {isPaused ? "Paused" : isAgentSpeaking ? "Speaking..." : statusConfig.label}
          </Typography>
          {isPaused && (
            <Box
              sx={{
                px: 1,
                py: 0.2,
                borderRadius: 1,
                backgroundColor: "rgba(245, 158, 11, 0.2)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Typography variant="caption" sx={{ color: "#f59e0b", fontSize: 9, fontWeight: "bold" }}>
                PAUSED
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={clearMessages}
            sx={{ color: "#64748b" }}
            title="Clear messages"
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setExpanded(false)}
            sx={{ color: "#64748b" }}
            title="Minimize"
          >
            <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 2,
          py: 1.5,
          maxHeight: 260,
          minHeight: 120,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 2,
          },
        }}
      >
        {agentMessages.length === 0 && (
          <Typography
            variant="body2"
            sx={{
              color: "#475569",
              textAlign: "center",
              mt: 4,
              fontSize: 13,
            }}
          >
            Hold the mic button and speak to get started
          </Typography>
        )}

        {agentMessages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              mb: 1.5,
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#475569", fontSize: 10, mb: 0.3, px: 1 }}
            >
              {msg.role === "user" ? "You" : "Agent"}
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: 2,
                maxWidth: "85%",
                backgroundColor:
                  msg.role === "user"
                    ? "rgba(59,130,246,0.15)"
                    : "rgba(255,255,255,0.05)",
                border:
                  msg.role === "user"
                    ? "1px solid rgba(59,130,246,0.2)"
                    : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: msg.role === "user" ? "#93c5fd" : "#cbd5e1",
                  fontSize: 13,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {msg.text}
              </Typography>
            </Box>
          </Box>
        ))}

        {isProcessing && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                "& span": {
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#64748b",
                  animation: "bounce 1.4s infinite ease-in-out",
                },
                "& span:nth-of-type(1)": { animationDelay: "0s" },
                "& span:nth-of-type(2)": { animationDelay: "0.2s" },
                "& span:nth-of-type(3)": { animationDelay: "0.4s" },
                "@keyframes bounce": {
                  "0%, 80%, 100%": { transform: "scale(0.6)", opacity: 0.4 },
                  "40%": { transform: "scale(1)", opacity: 1 },
                },
              }}
            >
              <span />
              <span />
              <span />
            </Box>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: 12 }}>
              Processing...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Permanent text input for commands */}
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          const text = e.target.elements.message?.value;
          if (text?.trim()) {
            handleTextSubmit(text);
            e.target.reset();
          }
        }}
        sx={{
          display: "flex",
          gap: 1,
          p: 1.5,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
      >
        <input
          name="message"
          type="text"
          placeholder={isConnected ? "Type a command..." : "Disconnected"}
          disabled={!isConnected}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            fontSize: 14,
            outline: "none",
            fontFamily: "inherit",
            backgroundColor: "rgba(255,255,255,0.05)",
            color: "white",
          }}
        />
        <button
          type="submit"
          disabled={!isConnected}
          style={{
            padding: "4px 12px",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: 20,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "inherit",
            opacity: isConnected ? 1 : 0.5,
          }}
        >
          Send
        </button>
      </Box>

      {/* Mic button area */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 2,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(0,0,0,0.2)",
        }}
      >
        {micPermission === "denied" && (
          <Typography
            variant="caption"
            sx={{
              color: "#f87171",
              fontSize: 11,
              mb: 1,
              textAlign: "center",
              px: 2,
            }}
          >
            Microphone access denied. Enable it in browser settings.
          </Typography>
        )}

        <IconButton
          onMouseDown={handleMicDown}
          onMouseUp={handleMicUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMicDown}
          onTouchEnd={handleMicUp}
          disabled={!canRecord}
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: isRecording
              ? "#ef4444"
              : canRecord
              ? "#1e40af"
              : "#374151",
            color: "#fff",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: isRecording
                ? "#dc2626"
                : canRecord
                ? "#1d4ed8"
                : "#374151",
            },
            "&:active": { transform: "scale(0.95)" },
            ...(isRecording && {
              animation: "pulse-mic 1.5s ease-in-out infinite",
              "@keyframes pulse-mic": {
                "0%, 100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0.4)" },
                "50%": { boxShadow: "0 0 0 12px rgba(239,68,68,0)" },
              },
            }),
          }}
        >
          {isRecording ? (
            <MicIcon sx={{ fontSize: 28 }} />
          ) : canRecord ? (
            <MicIcon sx={{ fontSize: 28 }} />
          ) : (
            <MicOffIcon sx={{ fontSize: 28 }} />
          )}
        </IconButton>

        <Typography
          variant="caption"
          sx={{
            color: isRecording ? "#ef4444" : "#64748b",
            fontSize: 11,
            mt: 1,
          }}
        >
          {isRecording
            ? "Listening... release to send"
            : canRecord
            ? "Hold to speak"
            : connectionStatus === "disconnected"
            ? "Not connected"
            : "Processing..."}
        </Typography>
      </Box>
    </Paper>
  );
}
