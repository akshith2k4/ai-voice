import { STATUS_EVENTS, TIMING } from "./protocol";

let ws = null;
let messageQueue = [];
let savedUrl = null;
let intentionalClose = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let disconnectTimer = null;

const statusListeners = new Set();
const messageListeners = new Set();

// ── Subscriptions ─────────────────────────────────────────────────────────────

export function onStatusChange(cb) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

export function onMessage(cb) {
  messageListeners.add(cb);
  return () => messageListeners.delete(cb);
}

function emitStatus(status) {
  statusListeners.forEach(cb => cb(status));
}

function emitMessage(data) {
  messageListeners.forEach(cb => cb(data));
}

// ── Connection lifecycle ──────────────────────────────────────────────────────

export function connect(url) {
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
  savedUrl = url;
  intentionalClose = false;
  _connect();
}

export function disconnect() {
  intentionalClose = true;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (disconnectTimer) clearTimeout(disconnectTimer);
  disconnectTimer = setTimeout(() => {
    ws?.close(1000, "Intentional disconnect");
    ws = null;
    disconnectTimer = null;
  }, 100);
}

function _connect() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

  messageQueue = [];
  emitStatus(reconnectAttempts > 0 ? "reconnecting" : "connecting");

  try {
    ws = new WebSocket(savedUrl);
  } catch (err) {
    console.error("[wsConnection] Failed to create WebSocket:", err);
    messageQueue = [];
    if (!intentionalClose) {
      emitStatus("reconnecting");
      _scheduleReconnect();
    } else {
      emitStatus("disconnected");
    }
    return;
  }

  ws.onopen = () => {
    reconnectAttempts = 0;
    emitStatus("connected");
    flushQueue();
  };

  // Inbound: raw string delivered to messageRouter — no interpretation here
  ws.onmessage = (event) => {
    emitMessage(event.data);
  };

  ws.onclose = (event) => {
    console.log(`[wsConnection] WebSocket closed (code: ${event.code})`);
    ws = null;
    messageQueue = [];
    if (!intentionalClose) {
      emitStatus("reconnecting");
      _scheduleReconnect();
    } else {
      emitStatus("disconnected");
    }
  };

  ws.onerror = (err) => {
    console.error("[wsConnection] WebSocket error:", err);
  };
}

function _scheduleReconnect() {
  const delay = Math.min(
    TIMING.RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts),
    TIMING.RECONNECT_MAX_DELAY_MS
  );
  console.log(`[wsConnection] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`);
  reconnectTimer = setTimeout(() => {
    reconnectAttempts += 1;
    _connect();
  }, delay);
}

// ── Outbound messages ─────────────────────────────────────────────────────────

function flushQueue() {
  while (messageQueue.length > 0) {
    const payload = messageQueue.shift();
    try {
      ws.send(payload);
    } catch (err) {
      console.error("[wsConnection] Failed to send queued message:", err);
    }
  }
}

export function sendMessage(message) {
  const payload = JSON.stringify(message);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(payload);
    return;
  }
  if (message.type !== "audio_chunk") {
    if (messageQueue.length >= TIMING.MSG_QUEUE_MAX) {
      messageQueue.shift(); // drop oldest to make room
    }
    messageQueue.push(payload);
  } else {
    console.warn("[wsConnection] Dropped audio chunk due to disconnect");
  }
}

export function sendStatus(event, payload = {}) {
  sendMessage({ type: "event", name: event, ...payload });
}

export function sendError(tool, reason, extra = {}) {
  sendStatus(STATUS_EVENTS.ERROR, { tool, reason, ...extra });
}
