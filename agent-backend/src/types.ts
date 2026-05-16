// ============================================
// WebSocket Message Types — Updated for Slice 2
// ============================================

// --- Incoming Messages (Frontend → Backend) ---

export interface VoiceMessage {
  type: "voice";
  audio?: string; // base64 encoded WebM/Opus
  text?: string;  // plain text command (MVP)
  sessionId?: string;
}

export interface StatusMessage {
  type: "status";
  event: string;
  fieldKey?: string;
  value?: string;
  reason?: string;
  tool?: string;
  newRoute?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export type IncomingMessage = VoiceMessage | StatusMessage;

// --- Outgoing Messages (Backend → Frontend) ---

export interface ToolMessage {
  type: "tool";
  tool: string;
  args: Record<string, unknown>;
}

export interface TtsAudioMessage {
  type: "tts_audio";
  audio: string; // base64 encoded MP3
  messageId: string;
}

export interface StatusAckMessage {
  type: "status_ack";
  event: string;
}

export interface ErrorMessage {
  type: "error";
  message: string;
  code?: string;
}

export type OutgoingMessage =
  | ToolMessage
  | TtsAudioMessage
  | StatusAckMessage
  | ErrorMessage;

// --- WebSocket Data ---

export interface ClientData {
  sessionId: string;
  connectedAt: number;
  lastActivityAt: number;
}

// --- Handler Context ---

export interface HandlerContext {
  sessionId: string;
  send: (message: OutgoingMessage) => void;
}
