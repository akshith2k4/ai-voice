import { useRef, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useAgent } from "./AgentBridge";

export default function AgentChat({ sx, themeMode }) {
  const { agentMessages, isProcessing } = useAgent();
  const [showDebug, setShowDebug] = useState(() => {
    try {
      return localStorage.getItem("agent_debug") === "true";
    } catch (e) {
      return false;
    }
  });
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages]);

  const handleDoubleClick = () => {
    const newVal = !showDebug;
    setShowDebug(newVal);
    try {
      localStorage.setItem("agent_debug", String(newVal));
    } catch (e) {}
  };

  const isDark = themeMode === "dark";

  return (
    <Box
      onDoubleClick={handleDoubleClick}
      sx={{
        overflowY: "auto",
        px: 2,
        py: 1.5,
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", borderRadius: 2 },
        cursor: "pointer",
        ...sx,
      }}
    >
      {agentMessages.length === 0 && (
        <Typography variant="body2" sx={{ color: isDark ? "#475569" : "#94a3b8", textAlign: "center", mt: 4, fontSize: 13 }}>
          Hold the mic button and speak to get started
        </Typography>
      )}

      {agentMessages.map((msg) => (
        <Box key={msg.id} sx={{ mb: 1.5, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
          <Typography variant="caption" sx={{ color: isDark ? "#475569" : "#64748b", fontSize: 10, mb: 0.3, px: 1 }}>
            {msg.role === "user" ? "You" : "Krish"}
          </Typography>
          <Box
            sx={{
              px: 1.5, py: 1, borderRadius: 2, maxWidth: "85%",
              backgroundColor: msg.role === "user"
                ? (isDark ? "rgba(59,130,246,0.15)" : "rgba(37,99,235,0.08)")
                : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"),
              border: msg.role === "user"
                ? (isDark ? "1px solid rgba(59,130,246,0.2)" : "1px solid rgba(37,99,235,0.15)")
                : (isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)"),
            }}
          >
            <Typography variant="body2" sx={{ color: msg.role === "user" ? (isDark ? "#93c5fd" : "#1d4ed8") : (isDark ? "#cbd5e1" : "#1e293b"), fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
              {msg.text}
            </Typography>
          </Box>
          {showDebug && msg.latency && (
            <Box sx={{ mt: 0.5, px: 1, display: "flex", flexWrap: "wrap", gap: 0.8, opacity: 0.85 }}>
              {[
                { key: "total", label: "Total", value: msg.latency.total, color: "#34d399", bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.25)" },
                { key: "stt",   label: "STT",   value: msg.latency.stt },
                { key: "llm",   label: "LLM",   value: msg.latency.llm },
                { key: "tts",   label: "TTS",   value: msg.latency.tts },
              ].filter(b => b.value > 0).map(b => (
                <Box key={b.key} sx={{ px: 0.8, py: 0.2, borderRadius: 1, backgroundColor: b.bg || (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)"), border: `1px solid ${b.border || (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)")}`, display: "inline-flex", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: b.color || (isDark ? "#94a3b8" : "#475569"), fontSize: 9, fontWeight: b.key === "total" ? "bold" : "normal" }}>
                    {b.label}: {b.value}ms
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}

      {isProcessing && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
          <Box sx={{ display: "flex", gap: 0.5, "& span": { width: 6, height: 6, borderRadius: "50%", backgroundColor: isDark ? "#64748b" : "#94a3b8", animation: "bounce 1.4s infinite ease-in-out" }, "& span:nth-of-type(1)": { animationDelay: "0s" }, "& span:nth-of-type(2)": { animationDelay: "0.2s" }, "& span:nth-of-type(3)": { animationDelay: "0.4s" }, "@keyframes bounce": { "0%, 80%, 100%": { transform: "scale(0.6)", opacity: 0.4 }, "40%": { transform: "scale(1)", opacity: 1 } } }}>
            <span /><span /><span />
          </Box>
          <Typography variant="caption" sx={{ color: isDark ? "#64748b" : "#94a3b8", fontSize: 12 }}>Processing...</Typography>
        </Box>
      )}

      <div ref={endRef} />
    </Box>
  );
}
