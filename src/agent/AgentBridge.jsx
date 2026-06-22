import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { audioQueue } from "./AudioQueue";
import { routeIncomingMessage } from "./messageRouter";
import { connect, disconnect, onStatusChange, onMessage, sendMessage as wsSendMessage } from "./wsConnection";
import { STATUS } from "./protocol";
import { walkthroughEngine } from "./WalkthroughEngine";

const getUsernameFromStorage = () => {
  try {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.name || "";
    }
  } catch {}
  return "";
};


export { AgentErrorBoundary } from "./AgentErrorBoundary";

const AgentContext = createContext({
  sendMessage: () => {},
  sendAudio: () => {},
  sendAudioChunk: () => {},
  sendAudioEnd: () => {},
  connectionStatus: "disconnected",
  agentMessages: [],
  isProcessing: false,
  isAgentSpeaking: false,
  clearMessages: () => {},
  pendingNavigation: null,
  clearPendingNavigation: () => {},
  addMessage: () => {},
  isPaused: false,
  setIsPaused: () => {},
  isWalkthroughActive: false,
  setIsWalkthroughActive: () => {},
  stopAudio: () => {},
});

export const useAgent = () => useContext(AgentContext);

export function AgentProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState(STATUS.DISCONNECTED);
  const [agentMessages, setAgentMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);

  const audioStateRef = useRef({ setIsAgentSpeaking, setIsProcessing });
  audioStateRef.current = { setIsAgentSpeaking, setIsProcessing };

  // Reset walkthrough state on disconnect
  useEffect(() => {
    if (connectionStatus === STATUS.DISCONNECTED) {
      walkthroughEngine.reset();
      setIsWalkthroughActive(false);
      setIsPaused(false);
    }
  }, [connectionStatus]);

  // Wire audio playback → React state (ref pattern avoids stale closure)
  useEffect(() => {
    const unsub = audioQueue.onPlaybackChange((speaking) => {
      audioStateRef.current.setIsAgentSpeaking(speaking);
      if (!speaking) audioStateRef.current.setIsProcessing(false);
    });
    
    // Wire playback completion callback to notify the backend
    audioQueue.onPlaybackComplete = (messageId) => {
      if (connectionStatus === STATUS.CONNECTED) {
        wsSendMessage({
          type: "event",
          name: "tts_playback_complete",
          messageId: messageId
        });
      }
    };
    
    return () => { 
      unsub(); 
      audioQueue.clear(); 
      audioQueue.onPlaybackComplete = null;
    };
  }, [connectionStatus]);

  // ---- Message handling ----
  const addMessage = useCallback((role, text, latency) => {
    setAgentMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, text, timestamp: Date.now(), latency },
    ]);
  }, []);

  const clearMessages = useCallback(() => {
    setAgentMessages([]);
    audioQueue.clear();
  }, []);

  const stopAudio = useCallback(() => {
    audioQueue.clear();
    setIsAgentSpeaking(false);
    setIsProcessing(false);
  }, []);

  const clearPendingNavigation = useCallback(() => setPendingNavigation(null), []);

  const sendMessage = useCallback((message) => wsSendMessage(message), []);

  const sendAudioChunk = useCallback(
    (base64Chunk) => sendMessage({ type: "audio_chunk", audio: base64Chunk }),
    [sendMessage]
  );

  const sendAudioEnd = useCallback(() => {
    setIsProcessing(true);
    sendMessage({ type: "audio_end" });
  }, [sendMessage]);

  const location = useLocation();
  const [connectedUsername, setConnectedUsername] = useState(getUsernameFromStorage);

  useEffect(() => {
    const currentUsername = getUsernameFromStorage();
    if (currentUsername !== connectedUsername) {
      setConnectedUsername(currentUsername);
    }
  }, [location, connectedUsername]);

  // ---- WebSocket: subscribe and connect ----
  useEffect(() => {
    const wsBase = import.meta.env.VITE_AGENT_WS_URL || "ws://localhost:3001";

    // Use a stable sessionId for this browser tab — reconnects reuse the same session.
    // sessionStorage is cleared when the tab is closed, so a new tab = new session.
    let sessionId = sessionStorage.getItem("agentSessionId");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("agentSessionId", sessionId);
    }
    const wsUrl = `${wsBase}?sessionId=${sessionId}${connectedUsername ? `&username=${encodeURIComponent(connectedUsername)}` : ""}`;

    const unsubStatus = onStatusChange(setConnectionStatus);
    const unsubMsg = onMessage((data) =>
      routeIncomingMessage(data, { addMessage, setIsProcessing, setPendingNavigation })
    );
    connect(wsUrl);
    return () => { disconnect(); unsubStatus(); unsubMsg(); };
  }, [connectedUsername]);


  const contextValue = {
    sendMessage,
    sendAudioChunk,
    sendAudioEnd,
    connectionStatus,
    agentMessages,
    isProcessing,
    isAgentSpeaking,
    clearMessages,
    pendingNavigation,
    clearPendingNavigation,
    addMessage,
    isPaused,
    setIsPaused,
    isWalkthroughActive,
    setIsWalkthroughActive,
    stopAudio,
  };

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
}
