import { useRef, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useAgent } from "./AgentBridge";

export default function AgentChat({ sx }) {
  const { agentMessages, isProcessing } = useAgent();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages]);

  return (
    <Box
      sx={{
        overflowY: "auto",
        px: 2,
        py: 1.5,
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2 },
        ...sx,
      }}
    >
      {agentMessages.length === 0 && (
        <Typography variant="body2" sx={{ color: "#475569", textAlign: "center", mt: 4, fontSize: 13 }}>
          Hold the mic button and speak to get started
        </Typography>
      )}

      {agentMessages.map((msg) => (
        <Box key={msg.id} sx={{ mb: 1.5, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
          <Typography variant="caption" sx={{ color: "#475569", fontSize: 10, mb: 0.3, px: 1 }}>
            {msg.role === "user" ? "You" : "Agent"}
          </Typography>
          <Box
            sx={{
              px: 1.5, py: 1, borderRadius: 2, maxWidth: "85%",
              backgroundColor: msg.role === "user" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
              border: msg.role === "user" ? "1px solid rgba(59,130,246,0.2)" : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Typography variant="body2" sx={{ color: msg.role === "user" ? "#93c5fd" : "#cbd5e1", fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
              {msg.text}
            </Typography>
          </Box>
          {msg.latency && (
            <Box sx={{ mt: 0.5, px: 1, display: "flex", flexWrap: "wrap", gap: 0.8, opacity: 0.85 }}>
              {[
                { key: "total", label: "Total", value: msg.latency.total, color: "#34d399", bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.25)" },
                { key: "stt",   label: "STT",   value: msg.latency.stt },
                { key: "llm",   label: "LLM",   value: msg.latency.llm },
                { key: "tts",   label: "TTS",   value: msg.latency.tts },
              ].filter(b => b.value > 0).map(b => (
                <Box key={b.key} sx={{ px: 0.8, py: 0.2, borderRadius: 1, backgroundColor: b.bg || "rgba(255,255,255,0.05)", border: `1px solid ${b.border || "rgba(255,255,255,0.1)"}`, display: "inline-flex", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: b.color || "#94a3b8", fontSize: 9, fontWeight: b.key === "total" ? "bold" : "normal" }}>
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
          <Box sx={{ display: "flex", gap: 0.5, "& span": { width: 6, height: 6, borderRadius: "50%", backgroundColor: "#64748b", animation: "bounce 1.4s infinite ease-in-out" }, "& span:nth-of-type(1)": { animationDelay: "0s" }, "& span:nth-of-type(2)": { animationDelay: "0.2s" }, "& span:nth-of-type(3)": { animationDelay: "0.4s" }, "@keyframes bounce": { "0%, 80%, 100%": { transform: "scale(0.6)", opacity: 0.4 }, "40%": { transform: "scale(1)", opacity: 1 } } }}>
            <span /><span /><span />
          </Box>
          <Typography variant="caption" sx={{ color: "#64748b", fontSize: 12 }}>Processing...</Typography>
        </Box>
      )}

      <div ref={endRef} />
    </Box>
  );
}
