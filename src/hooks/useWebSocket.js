import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = 'ws://localhost:3001';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * WebSocket hook for agent backend communication
 * Handles connection, reconnection, and message routing
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const messageListenersRef = useRef(new Set());

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[useWebSocket] Already connected');
      return;
    }

    console.log('[useWebSocket] Connecting to', WS_URL);
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[useWebSocket] Connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[useWebSocket] Received:', message.type);

        // Extract session ID from welcome message
        if (message.type === 'tool' && message.tool === 'respond' && !sessionId) {
          // Backend sends welcome message on connect
          console.log('[useWebSocket] Received welcome message');
        }

        // Notify all listeners
        messageListenersRef.current.forEach((listener) => {
          try {
            listener(message);
          } catch (error) {
            console.error('[useWebSocket] Listener error:', error);
          }
        });
      } catch (error) {
        console.error('[useWebSocket] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[useWebSocket] Error:', error);
    };

    ws.onclose = (event) => {
      console.log('[useWebSocket] Disconnected:', event.code, event.reason);
      setIsConnected(false);
      setSessionId(null);
      wsRef.current = null;

      // Attempt reconnection
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        console.log(
          `[useWebSocket] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
        );
        reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
      } else {
        console.error('[useWebSocket] Max reconnection attempts reached');
      }
    };

    wsRef.current = ws;
  }, [sessionId]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      console.log('[useWebSocket] Disconnecting');
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setSessionId(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Send a message to the backend
  const sendMessage = useCallback((message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[useWebSocket] Cannot send message: not connected');
      return false;
    }

    try {
      const payload = JSON.stringify(message);
      wsRef.current.send(payload);
      console.log('[useWebSocket] Sent:', message.type);
      return true;
    } catch (error) {
      console.error('[useWebSocket] Failed to send message:', error);
      return false;
    }
  }, []);

  // Add a message listener
  const addMessageListener = useCallback((listener) => {
    messageListenersRef.current.add(listener);
  }, []);

  // Remove a message listener
  const removeMessageListener = useCallback((listener) => {
    messageListenersRef.current.delete(listener);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    sessionId,
    sendMessage,
    addMessageListener,
    removeMessageListener,
    connect,
    disconnect,
  };
}
