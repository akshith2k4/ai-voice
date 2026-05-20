import { MESSAGE_TYPES, STATUS_EVENTS, TIMING } from "./protocol";

let ws = null;
let messageQueue = [];
const statusListeners = new Set();

export function onStatusChange(cb) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

function emitStatus(status) {
  statusListeners.forEach(cb => cb(status));
}

export function connectWs(url, { onOpen, onMessage, onClose, onError }) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return ws;
  }

  messageQueue = []; // Clear queue on connection attempt to ensure fresh slate
  emitStatus("connecting");
  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      emitStatus("connected");
      onOpen?.();
      // Flush queued messages
      while (messageQueue.length > 0) {
        const queued = messageQueue.shift();
        try {
          ws.send(queued);
        } catch (e) {
          console.error("[wsConnection] Failed to send queued message:", e);
        }
      }
    };

    ws.onmessage = (event) => {
      onMessage?.(event.data);
    };

    ws.onclose = (event) => {
      console.log(`[wsConnection] WebSocket closed (code: ${event.code})`);
      ws = null;
      messageQueue = []; // Clear queue to prevent flooding backend with stale events on reconnect
      emitStatus("disconnected");
      onClose?.(event);
    };

    ws.onerror = (error) => {
      console.error("[wsConnection] WebSocket error:", error);
      onError?.(error);
    };
  } catch (error) {
    console.error("[wsConnection] Failed to create WebSocket:", error);
    messageQueue = [];
    emitStatus("disconnected");
    onClose?.({ code: 1006 });
  }

  return ws;
}

export function disconnectWs() {
  if (ws) {
    ws.close(1000, "Intentional disconnect");
    ws = null;
  }
}

export function sendMessage(message) {
  const payload = JSON.stringify(message);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(payload);
  } else {
    if (messageQueue.length >= TIMING.MSG_QUEUE_MAX) {
      messageQueue.shift(); // drop oldest
    }
    messageQueue.push(payload);
  }
}

export function sendStatus(event, payload = {}) {
  sendMessage({
    type: MESSAGE_TYPES.STATUS,
    event,
    ...payload,
  });
}

export function sendError(tool, reason, extra = {}) {
  sendStatus(STATUS_EVENTS.ERROR, { tool, reason, ...extra });
}
