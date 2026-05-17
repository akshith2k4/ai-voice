// ============================================
// WebSocket Message Types — Updated for Slice 2
// ============================================

export const STATUS_EVENTS = {
  DIALOG_OPENED: "dialog_opened",
  FIELD_REACHED: "field_reached",
  FIELD_FILLED: "field_filled",
  ITEM_ADDED: "item_added",
  CHECKBOX_CLICKED: "checkbox_clicked",
  FIELDS_CLEARED: "fields_cleared",
  DIALOG_CLOSED: "dialog_closed",
  NAVIGATION_COMPLETE: "navigation_complete",
  TTS_PLAYBACK_COMPLETE: "tts_playback_complete",
  EXPLAIN_COMPLETE: "explain_complete",
  WALKTHROUGH_BEGUN: "walkthrough_begun",
  ITEM_SELECTED: "item_selected",
  ELEMENT_CLICKED: "element_clicked",
  FORM_REGISTERED: "form_registered",
  ERROR: "error",
};

export const TOOL_TYPES = {
  NAVIGATE: "navigate",
  RESPOND: "respond",
  OPEN_DIALOG: "open_dialog",
  CLOSE_DIALOG: "close_dialog",
  GO_TO_FIELD: "go_to_field",
  FILL_FIELD: "fill_field",
  EXPLAIN_FIELD: "explain_field",
  ADD_ITEM: "add_item",
  CLICK_CHECKBOX: "click_checkbox",
  CLEAR_ALL_FIELDS: "clear_all_fields",
  BEGIN_WALKTHROUGH: "begin_walkthrough",
  START_WALKTHROUGH: "start_walkthrough",
  RESUME_WALKTHROUGH: "resume_walkthrough",
  PAUSE_WALKTHROUGH: "pause_walkthrough",
  CANCEL_WALKTHROUGH: "cancel_walkthrough",
  SELECT_ITEM: "select_item",
  CLICK_ELEMENT: "click_element",
};

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
