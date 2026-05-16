import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// ============================================
// Agent Bridge — WebSocket client + context provider
// Connects frontend to agent backend, manages
// connection lifecycle, sends/receives messages
// ============================================

const AgentContext = createContext({
  sendMessage: () => {},
  sendAudio: () => {},
  connectionStatus: "disconnected",
  agentMessages: [],
  isProcessing: false,
  isAgentSpeaking: false,
  clearMessages: () => {},
  pendingNavigation: null,
  pendingTool: null,
  clearPendingNavigation: () => {},
  addMessage: () => {},
  clearPendingTool: () => {},
});

export const useAgent = () => useContext(AgentContext);

const STATUS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
};

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

// ============================================
// Audio Playback Queue
// Plays TTS audio clips in order,
// reports playback completion to backend
// ============================================

class AudioQueue {
  constructor(sendMessage) {
    this.queue = [];
    this.isPlaying = false;
    this.currentMessageId = null;
    this.sendMessage = sendMessage;
    this.onPlaybackStateChange = null; // callback for isAgentSpeaking
  }

  enqueue(base64Audio, messageId) {
    this.queue.push({ base64Audio, messageId });
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.currentMessageId = null;
      this.onPlaybackStateChange?.(false);
      return;
    }

    this.isPlaying = true;
    this.onPlaybackStateChange?.(true);

    const { base64Audio, messageId } = this.queue.shift();
    this.currentMessageId = messageId;

    const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);

    audio.onended = () => {
      this.sendMessage({ type: "status", event: "tts_playback_complete", messageId });
      this.playNext();
    };

    audio.onerror = (error) => {
      console.error("[AudioQueue] Playback error:", error);
      // Still report completion so the pipeline doesn't stall
      this.sendMessage({ type: "status", event: "tts_playback_complete", messageId });
      this.playNext();
    };

    audio.play().catch((error) => {
      console.error("[AudioQueue] Play failed:", error);
      this.sendMessage({ type: "status", event: "tts_playback_complete", messageId });
      this.playNext();
    });
  }

  clear() {
    this.queue = [];
    this.isPlaying = false;
    this.currentMessageId = null;
    this.onPlaybackStateChange?.(false);
  }
}

// ============================================
// AgentBridge Provider
// ============================================

export function AgentBridgeProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState(STATUS.DISCONNECTED);
  const [agentMessages, setAgentMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [pendingTool, setPendingTool] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const intentionalCloseRef = useRef(false);
  const messageQueueRef = useRef([]);
  const audioQueueRef = useRef(null);

  // ---- Message handling ----
  const addMessage = useCallback((role, text) => {
    setAgentMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role,
        text,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const clearMessages = useCallback(() => {
    setAgentMessages([]);
    audioQueueRef.current?.clear();
  }, []);

  const clearPendingNavigation = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  const clearPendingTool = useCallback(() => {
    setPendingTool(null);
  }, []);

  // ---- Send message (stable ref — used by AudioQueue) ----
  const sendMessage = useCallback((message) => {
    const payload = JSON.stringify(message);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(payload);
      } catch (error) {
        console.error("[AgentBridge] Failed to send message:", error);
        messageQueueRef.current.push(payload);
      }
    } else {
      messageQueueRef.current.push(payload);
      console.warn("[AgentBridge] WebSocket not open, message queued");
    }
  }, []);

  // ---- Incoming message handler ----
  const handleIncomingMessage = useCallback(
    (data) => {
      try {
        const message = JSON.parse(data);

        switch (message.type) {
          case "tool": {
            if (message.tool === "respond") {
              const text = message.args?.message || "";
              const tts = message.args?.tts !== false;

              // "You said: ..." echoes go to the user bubble, not agent
              if (text.startsWith("You said:")) {
                const spoken = text.replace(/^You said:\s*"?/, "").replace(/"$/, "");
                addMessage("user", spoken);
              } else {
                addMessage("agent", text);
              }

              // If no TTS follows, clear processing state now
              if (!tts) {
                setIsProcessing(false);
              }
              // If tts=true, processing clears when audio playback ends
            } else if (message.tool === "navigate") {
              const route = message.args?.route;
              if (route) {
                setPendingNavigation(route);
              }
            } else if (message.tool === "start_walkthrough") {
              const formId = message.args?.formId;
              if (formId) {
                setPendingTool({ type: "start_walkthrough", formId });
              }
            } else if (message.tool === "resume_walkthrough") {
              setPendingTool({ type: "resume_walkthrough" });
            } else if (message.tool === "pause_walkthrough") {
              setPendingTool({ type: "pause_walkthrough" });
            } else if (message.tool === "cancel_walkthrough") {
              setPendingTool({ type: "cancel_walkthrough" });
            } else if (
              [
                "open_dialog",
                "close_dialog",
                "go_to_field",
                "fill_field",
                "add_item",
                "click_checkbox",
                "clear_all_fields",
                "explain_field",
              ].includes(message.tool)
            ) {
              setPendingTool({ type: message.tool, args: message.args });
            } else {
              console.log(`[AgentBridge] Unhandled tool: ${message.tool}`, message.args);
            }
            break;
          }

          case "tts_audio": {
            const { audio, messageId } = message;
            if (audio && messageId) {
              audioQueueRef.current?.enqueue(audio, messageId);
            }
            break;
          }

          case "status_ack":
            console.log(`[AgentBridge] Status ack: ${message.event}`);
            break;

          case "error":
            console.error(`[AgentBridge] Error: ${message.message}`);
            addMessage("agent", `Error: ${message.message}`);
            setIsProcessing(false);
            break;

          default:
            console.warn(`[AgentBridge] Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error("[AgentBridge] Parse error:", error);
      }
    },
    [addMessage]
  );

  // ---- WebSocket connection ----
  const connect = useCallback(() => {
    const wsUrl = import.meta.env.VITE_AGENT_WS_URL || "ws://localhost:3001";

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus(STATUS.CONNECTING);
    intentionalCloseRef.current = false;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[AgentBridge] WebSocket connected");
        setConnectionStatus(STATUS.CONNECTED);
        reconnectAttemptsRef.current = 0;

        // Initialize audio queue (once, with stable sendMessage ref)
        if (!audioQueueRef.current) {
          audioQueueRef.current = new AudioQueue(sendMessage);
          audioQueueRef.current.onPlaybackStateChange = (speaking) => {
            setIsAgentSpeaking(speaking);
            if (!speaking) {
              setIsProcessing(false);
            }
          };
        }

        // Flush queued messages
        while (messageQueueRef.current.length > 0) {
          const queued = messageQueueRef.current.shift();
          try {
            ws.send(queued);
          } catch (e) {
            console.error("[AgentBridge] Failed to send queued message:", e);
          }
        }
      };

      ws.onmessage = (event) => {
        handleIncomingMessage(event.data);
      };

      ws.onclose = (event) => {
        console.log(`[AgentBridge] WebSocket closed (code: ${event.code})`);
        setConnectionStatus(STATUS.DISCONNECTED);
        wsRef.current = null;
        if (!intentionalCloseRef.current) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error("[AgentBridge] WebSocket error:", error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[AgentBridge] Failed to create WebSocket:", error);
      setConnectionStatus(STATUS.DISCONNECTED);
      scheduleReconnect();
    }
  }, [handleIncomingMessage, sendMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Reconnection with exponential backoff ----
  const scheduleReconnect = useCallback(() => {
    if (intentionalCloseRef.current) return;
    const attempts = reconnectAttemptsRef.current;
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, attempts),
      RECONNECT_MAX_DELAY
    );
    console.log(`[AgentBridge] Reconnecting in ${delay}ms (attempt ${attempts + 1})`);
    setConnectionStatus(STATUS.RECONNECTING);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      connect();
    }, delay);
  }, [connect]);

  // ---- Send audio ----
  const sendAudio = useCallback(
    (audioBlob) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        if (!base64 || base64.length === 0) {
          console.warn("[AgentBridge] Empty audio blob");
          addMessage("agent", "Audio was empty. Please hold the button longer.");
          return;
        }
        addMessage("user", "[Audio sent]");
        setIsProcessing(true);
        sendMessage({ type: "voice", audio: base64 });
      };
      reader.onerror = (error) => {
        console.error("[AgentBridge] Failed to read audio blob:", error);
        addMessage("agent", "Failed to process audio. Please try again.");
      };
      reader.readAsDataURL(audioBlob);
    },
    [sendMessage, addMessage]
  );

  // ---- Lifecycle ----
  useEffect(() => {
    connect();
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      audioQueueRef.current?.clear();
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [connect]);

  const contextValue = {
    sendMessage,
    sendAudio,
    connectionStatus,
    agentMessages,
    isProcessing,
    isAgentSpeaking,
    clearMessages,
    pendingNavigation,
    pendingTool,
    clearPendingNavigation,
    addMessage,
    clearPendingTool,
  };

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
}
