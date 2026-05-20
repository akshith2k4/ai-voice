import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AudioQueue } from "./AudioQueue";
import { routeIncomingMessage } from "./messageRouter";
import { connectWs, disconnectWs, sendMessage as wsSendMessage, onStatusChange } from "./wsConnection";
import { STATUS, TIMING } from "./protocol";

export { AgentErrorBoundary } from "./AgentErrorBoundary";

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
  isPaused: false,
  setIsPaused: () => {},
  stopAudio: () => {},
});

export const useAgent = () => useContext(AgentContext);

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
  const [isPaused, setIsPaused] = useState(false);

  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const intentionalCloseRef = useRef(false);
  const audioQueueRef = useRef(null);

  const statusRef = useRef(STATUS.DISCONNECTED);
  useEffect(() => {
    statusRef.current = connectionStatus;
  }, [connectionStatus]);

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

  const stopAudio = useCallback(() => {
    audioQueueRef.current?.clear();
    setIsAgentSpeaking(false);
    setIsProcessing(false);
  }, []);

  const clearPendingNavigation = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  const clearPendingTool = useCallback(() => {
    setPendingTool(null);
  }, []);

  // ---- Send message (stable ref — used by AudioQueue) ----
  const sendMessage = useCallback((message) => {
    wsSendMessage(message);
  }, []);

  // ---- Incoming message handler ----
  const handleIncomingMessage = useCallback(
    (data) => {
      routeIncomingMessage(data, {
        addMessage,
        setIsProcessing,
        setPendingNavigation,
        setPendingTool,
        audioQueue: audioQueueRef.current,
      });
    },
    [addMessage]
  );

  // Stable refs for connection event listeners to avoid infinite loops and stale state
  const onMessageRef = useRef(null);
  onMessageRef.current = handleIncomingMessage;

  const onCloseRef = useRef(null);
  onCloseRef.current = () => {
    if (!intentionalCloseRef.current) {
      scheduleReconnect();
    }
  };

  // ---- WebSocket connection ----
  const connect = useCallback(() => {
    const wsUrl = import.meta.env.VITE_AGENT_WS_URL || "ws://localhost:3001";

    if (statusRef.current === STATUS.CONNECTED) return;
    intentionalCloseRef.current = false;

    connectWs(wsUrl, {
      onOpen: () => {
        // Initialize audio queue (once)
        if (!audioQueueRef.current) {
          audioQueueRef.current = new AudioQueue();
          audioQueueRef.current.onPlaybackStateChange = (speaking) => {
            setIsAgentSpeaking(speaking);
            if (!speaking) {
              setIsProcessing(false);
            }
          };
        }
        reconnectAttemptsRef.current = 0;
      },
      onMessage: (data) => onMessageRef.current?.(data),
      onClose: () => onCloseRef.current?.()
    });
  }, []);

  // ---- Reconnection with exponential backoff ----
  const scheduleReconnect = useCallback(() => {
    if (intentionalCloseRef.current) return;
    const attempts = reconnectAttemptsRef.current;
    const delay = Math.min(
      TIMING.RECONNECT_BASE_DELAY_MS * Math.pow(2, attempts),
      TIMING.RECONNECT_MAX_DELAY_MS
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
    const unsubscribe = onStatusChange(setConnectionStatus);
    connect();
    return () => {
      intentionalCloseRef.current = true;
      unsubscribe();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      audioQueueRef.current?.clear();
      disconnectWs();
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
    isPaused,
    setIsPaused,
    stopAudio,
  };

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
}
