import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Paper, IconButton, Typography, Box, Switch, FormControlLabel } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SettingsIcon from "@mui/icons-material/Settings";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useAgent } from "./AgentBridge";
import { useAudioRecorder } from "./useAudioRecorder";
import { audioQueue } from "./AudioQueue";
import AgentChat from "./AgentChat";
import { STATUS } from "./protocol";
import "./spotlight.css";

const S3_BASE_URL = import.meta.env.VITE_S3_BASE_URL || "https://linengrass-voiceai-prod.s3.ap-southeast-2.amazonaws.com";

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
  const [showSettings, setShowSettings] = useState(false);
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const val = localStorage.getItem("agent_theme_mode");
      return val === "light" ? "light" : "dark";
    } catch { return "dark"; }
  });

  const toggleThemeMode = () => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextMode);
    try { localStorage.setItem("agent_theme_mode", nextMode); } catch {}
  };

  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem("agent_overlay_position");
      return saved ? JSON.parse(saved) : { x: 24, y: 24 };
    } catch {
      return { x: 24, y: 24 };
    }
  });

  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 24, y: 24 });

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = expanded ? 320 : 56;
      const height = expanded ? 440 : 56;

      setPosition((prev) => {
        const clampedRight = Math.max(12, Math.min(vw - width - 12, prev.x));
        const clampedBottom = Math.max(12, Math.min(vh - height - 12, prev.y));
        return { x: clampedRight, y: clampedBottom };
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [expanded]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("textarea") || e.target.closest(".MuiSwitch-root")) {
      return;
    }

    isDragging.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { ...positionRef.current };

    const handleMouseMove = (moveEvent) => {
      const dx = dragStart.current.x - moveEvent.clientX;
      const dy = dragStart.current.y - moveEvent.clientY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragging.current = true;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = expanded ? 320 : 56;
      const height = expanded ? 440 : 56;

      const newRight = Math.max(12, Math.min(vw - width - 12, dragStartPos.current.x + dx));
      const newBottom = Math.max(12, Math.min(vh - height - 12, dragStartPos.current.y + dy));

      setPosition({ x: newRight, y: newBottom });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (isDragging.current) {
        try {
          localStorage.setItem("agent_overlay_position", JSON.stringify(positionRef.current));
        } catch {}
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("textarea") || e.target.closest(".MuiSwitch-root")) {
      return;
    }

    isDragging.current = false;
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    dragStartPos.current = { ...positionRef.current };

    const handleTouchMove = (moveEvent) => {
      const touchMove = moveEvent.touches[0];
      const dx = dragStart.current.x - touchMove.clientX;
      const dy = dragStart.current.y - touchMove.clientY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragging.current = true;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = expanded ? 320 : 56;
      const height = expanded ? 440 : 56;

      const newRight = Math.max(12, Math.min(vw - width - 12, dragStartPos.current.x + dx));
      const newBottom = Math.max(12, Math.min(vh - height - 12, dragStartPos.current.y + dy));

      setPosition({ x: newRight, y: newBottom });
    };

    const handleTouchEnd = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);

      if (isDragging.current) {
        try {
          localStorage.setItem("agent_overlay_position", JSON.stringify(positionRef.current));
        } catch {}
      }
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  };

  const [autoGainControl, setAutoGainControl] = useState(() => {
    try {
      const val = localStorage.getItem("agent_mic_agc");
      return val === null ? true : val === "true";
    } catch { return true; }
  });
  const [noiseSuppression, setNoiseSuppression] = useState(() => {
    try {
      const val = localStorage.getItem("agent_mic_noise");
      return val === null ? true : val === "true";
    } catch { return true; }
  });
  const [echoCancellation, setEchoCancellation] = useState(() => {
    try {
      const val = localStorage.getItem("agent_mic_echo");
      return val === null ? true : val === "true";
    } catch { return true; }
  });

  const [micVolume, setMicVolume] = useState(0);

  const handleToggleAGC = (e) => {
    const val = e.target.checked;
    setAutoGainControl(val);
    try { localStorage.setItem("agent_mic_agc", String(val)); } catch {}
  };
  const handleToggleNoise = (e) => {
    const val = e.target.checked;
    setNoiseSuppression(val);
    try { localStorage.setItem("agent_mic_noise", String(val)); } catch {}
  };
  const handleToggleEcho = (e) => {
    const val = e.target.checked;
    setEchoCancellation(val);
    try { localStorage.setItem("agent_mic_echo", String(val)); } catch {}
  };

  const handleExpand = useCallback(() => {
    setExpanded(true);
    if (!welcomePlayed) {
      const msgId = crypto.randomUUID();
      addMessage("agent", "Hi, I am Krish, and I am here to help you. How can I help you?");
      audioQueue.enqueueUrl(`${S3_BASE_URL}/tara/krish_welcome.mp3`, msgId);
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
    autoGainControl,
    noiseSuppression,
    echoCancellation,
    onVolumeChange: (vol) => {
      setMicVolume(vol);
    },
  });

  useEffect(() => {
    if (!isRecording) {
      setMicVolume(0);
    }
  }, [isRecording]);

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
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (location.pathname === "/login" || !token) {
    return null;
  }

  const statusColor = STATUS_COLOR[connectionStatus] || STATUS_COLOR[STATUS.DISCONNECTED];
  const isSpeaking = isAgentSpeaking && !isRecording;
  const micState = isRecording ? "recording" : canRecord ? "ready" : "disabled";

  const isDark = themeMode === "dark";
  const collapsedBg = isConnected
    ? (isDark ? "#0f172a" : "#ffffff")
    : (isDark ? "#374151" : "#f3f4f6");
  const collapsedBorder = isDark ? "none" : "1px solid rgba(0,0,0,0.1)";

  const containerBg = isDark ? "#0f172a" : "#ffffff";
  const containerBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";
  const headerBorderBottom = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";

  const headerTextColor = isPaused
    ? "#f59e0b"
    : isSpeaking
      ? (isDark ? "#10b981" : "#059669")
      : (isDark ? "#94a3b8" : "#475569");

  const iconColor = isDark ? "#64748b" : "#475569";

  const settingsTitleColor = isDark ? "#f8fafc" : "#0f172a";
  const settingsLabelColor = isDark ? "#cbd5e1" : "#1e293b";
  const settingsCaptionColor = isDark ? "#64748b" : "#64748b";

  const micSectionBg = isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)";
  const micSectionBorderTop = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";
  const micInstructionColor = isDark ? "#64748b" : "#475569";
  const micDeniedColor = isDark ? "#f87171" : "#dc2626";

  const micBg = {
    recording: "#ef4444",
    ready: isDark ? "#1e40af" : "#2563eb",
    disabled: isDark ? "#374151" : "#cbd5e1"
  }[micState];

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
      <Box
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={(e) => {
          if (isDragging.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          handleExpand();
        }}
        sx={{
          position: "fixed",
          bottom: position.y,
          right: position.x,
          zIndex: 9999,
          cursor: "grab",
          "&:active": { cursor: "grabbing" },
          display: "flex",
          alignItems: "center",
          gap: 1,
          userSelect: "none"
        }}
      >
        <Box className={connectionStatus === STATUS.RECONNECTING ? "pulse-dot-animation" : ""} sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: statusColor }} />
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ConnectionBadge isCollapsed={true} />
          {isSpeaking && (
            <Box className="siri-glow-aura" sx={{ position: "absolute", top: -3, left: -3, width: 62, height: 62, borderRadius: "50%", background: "linear-gradient(45deg, #a855f7, #3b82f6, #06b6d4, #ec4899)", backgroundSize: "400% 400%", zIndex: 1 }} />
          )}
          <Paper elevation={4} className={isSpeaking ? "siri-orb-glow" : ""} sx={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: collapsedBg, border: collapsedBorder, color: isDark ? "#fff" : "#0f172a", position: "relative", zIndex: 2, transition: "all 0.2s ease", "&:hover": { transform: "scale(1.05)" } }}>
            <AutoAwesomeIcon sx={{ fontSize: 26, color: "#10b981" }} />
          </Paper>
        </Box>
      </Box>
    );
  }

  // ── Expanded: input panel ────────────────────────────────────────────────
  return (
    <Box sx={{ position: "fixed", bottom: position.y, right: position.x, zIndex: 9999 }}>
      <ConnectionBadge isCollapsed={false} />
      <Paper elevation={8} sx={{ width: 320, maxHeight: 440, display: "flex", flexDirection: "column", borderRadius: 3, overflow: "hidden", backgroundColor: containerBg, border: containerBorder }}>
        {/* Header */}
        <Box
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            borderBottom: headerBorderBottom,
            cursor: "grab",
            "&:active": { cursor: "grabbing" },
            userSelect: "none"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box className={connectionStatus === STATUS.RECONNECTING ? "pulse-dot-animation" : ""} sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: isPaused ? "#f59e0b" : statusColor }} />
            <Typography variant="caption" sx={{ color: headerTextColor, fontSize: 12 }}>
              {isPaused ? "Paused" : isSpeaking ? "Speaking..." : connectionStatus === STATUS.RECONNECTING ? "Reconnecting..." : connectionStatus}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={toggleThemeMode}
              sx={{ color: iconColor }}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <LightModeIcon sx={{ fontSize: 15 }} /> : <DarkModeIcon sx={{ fontSize: 15 }} />}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setShowSettings(!showSettings)}
              sx={{ color: showSettings ? (isDark ? "#10b981" : "#059669") : iconColor }}
              title={showSettings ? "Back to Chat" : "Mic Settings"}
            >
              {showSettings ? <ArrowBackIcon sx={{ fontSize: 16 }} /> : <SettingsIcon sx={{ fontSize: 14 }} />}
            </IconButton>
            {!showSettings && (
              <IconButton size="small" onClick={clearMessages} sx={{ color: iconColor }} title="Clear messages"><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
            )}
            <IconButton size="small" onClick={() => setExpanded(false)} sx={{ color: iconColor }} title="Minimize"><KeyboardArrowDownIcon sx={{ fontSize: 18 }} /></IconButton>
          </Box>
        </Box>

        {/* Chat history or settings panel */}
        {showSettings ? (
          <Box sx={{
            flex: 1,
            maxHeight: 220,
            minHeight: 80,
            overflowY: "auto",
            px: 2.5,
            py: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", borderRadius: 2 }
          }}>
            <Typography variant="subtitle2" sx={{ color: settingsTitleColor, fontWeight: "bold", fontSize: 13, display: "flex", alignItems: "center", gap: 1 }}>
              <SettingsIcon sx={{ fontSize: 16, color: isDark ? "#10b981" : "#059669" }} /> Microphone Settings
            </Typography>

            <FormControlLabel
              control={<Switch checked={autoGainControl} onChange={handleToggleAGC} color="primary" size="small" />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ color: settingsLabelColor, fontSize: 12, fontWeight: 500 }}>Volume Boost (AGC)</Typography>
                  <Typography variant="caption" sx={{ color: settingsCaptionColor, fontSize: 9.5, display: "block", lineHeight: 1.2 }}>
                    Automatically boosts your mic volume if you speak softly or are far away.
                  </Typography>
                </Box>
              }
              sx={{ margin: 0, alignItems: "flex-start", gap: 1 }}
            />

            <FormControlLabel
              control={<Switch checked={noiseSuppression} onChange={handleToggleNoise} color="primary" size="small" />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ color: settingsLabelColor, fontSize: 12, fontWeight: 500 }}>Noise Suppression</Typography>
                  <Typography variant="caption" sx={{ color: settingsCaptionColor, fontSize: 9.5, display: "block", lineHeight: 1.2 }}>
                    Aggressively filters background noise (may clip quiet speech or beginning of words).
                  </Typography>
                </Box>
              }
              sx={{ margin: 0, alignItems: "flex-start", gap: 1 }}
            />

            <FormControlLabel
              control={<Switch checked={echoCancellation} onChange={handleToggleEcho} color="primary" size="small" />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ color: settingsLabelColor, fontSize: 12, fontWeight: 500 }}>Echo Cancellation</Typography>
                  <Typography variant="caption" sx={{ color: settingsCaptionColor, fontSize: 9.5, display: "block", lineHeight: 1.2 }}>
                    Prevents speaker audio feedback. Turn off for cleaner raw audio if using headphones.
                  </Typography>
                </Box>
              }
              sx={{ margin: 0, alignItems: "flex-start", gap: 1 }}
            />
          </Box>
        ) : (
          <AgentChat sx={{ flex: 1, maxHeight: 220, minHeight: 80 }} themeMode={themeMode} />
        )}

        {/* Mic */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2, borderTop: micSectionBorderTop, backgroundColor: micSectionBg }}>
          {micPermission === "denied" && (
            <Typography variant="caption" sx={{ color: micDeniedColor, fontSize: 11, mb: 1, textAlign: "center", px: 2 }}>
              Microphone access denied. Enable it in browser settings.
            </Typography>
          )}
          <IconButton
            onClick={handleMicClick}
            disabled={!canRecord && !isRecording}
            className={isRecording ? "pulse-mic-animation" : ""}
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: micBg,
              color: canRecord || isRecording ? "#fff" : (isDark ? "#94a3b8" : "#cbd5e1"),
              transition: "all 0.1s ease",
              "&:hover": { backgroundColor: micBg },
              "&:active": { transform: "scale(0.95)" },
              boxShadow: isRecording
                ? `0 0 ${8 + (micVolume / 100) * 24}px ${2 + (micVolume / 100) * 8}px rgba(239, 68, 68, ${0.4 + (micVolume / 100) * 0.6})`
                : "none",
            }}
          >
            {canRecord ? <MicIcon sx={{ fontSize: 28 }} /> : <MicOffIcon sx={{ fontSize: 28 }} />}
          </IconButton>
          <Typography variant="caption" sx={{ color: micInstructionColor, fontSize: 11, mt: 1 }}>
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
