// ============================================
// WebSocket Message Types — Updated for Slice 2
// ============================================

// --- Incoming Messages (Frontend → Backend) ---

export interface VoiceMessage {
  type: "voice";
  audio?: string; // base64 encoded WebM/Opus
  text?: string;  // plain text command (MVP)
  sessionId?: string;
  audioDuration?: number;
}

export interface StatusMessage {
  type: "event";
  name: string;
  fieldKey?: string;
  value?: string;
  reason?: string;
  tool?: string;
  newRoute?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface AudioChunkMessage {
  type: "audio_chunk";
  audio: string; // base64 encoded raw pcm_s16le chunk
  sessionId?: string;
}

export interface AudioEndMessage {
  type: "audio_end";
  sessionId?: string;
}

export type IncomingMessage = VoiceMessage | StatusMessage | AudioChunkMessage | AudioEndMessage;

// --- Outgoing Messages (Backend → Frontend) ---

export interface ToolMessage {
  type: "tool";
  tool: string;
  args: Record<string, unknown>;
}

export interface TtsAudioMessage {
  type: "tts_audio";
  audio?: string; // base64 encoded MP3 (optional if url is provided)
  url?: string; // S3 presigned URL
  messageId: string;
  done?: boolean;
}

export interface EventAckMessage {
  type: "event_ack";
  name: string;
}

export interface ErrorMessage {
  type: "error";
  message: string;
  code?: string;
}

export type OutgoingMessage =
  | ToolMessage
  | TtsAudioMessage
  | EventAckMessage
  | ErrorMessage;

// --- WebSocket Data ---

export interface ClientData {
  sessionId: string;
  userName?: string;
  connectedAt: number;
  lastActivityAt: number;
  ttsEnabled?: boolean;
}

// --- Handler Context ---

export interface HandlerContext {
  sessionId: string;
  userName?: string;
  ttsEnabled?: boolean;
  send: (message: OutgoingMessage) => void;
}
