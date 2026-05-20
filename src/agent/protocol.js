export const STATUS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
};

export const TIMING = {
  DIALOG_ANIMATION_MS: 1000,
  FIELD_RENDER_MS: 500,
  POLL_INTERVAL_MS: 200,
  AUTOCOMPLETE_POLL_MS: 300,
  BUTTON_TIMEOUT_MS: 3000,
  SELECT_TIMEOUT_MS: 3000,
  AUTOCOMPLETE_TIMEOUT_MS: 6000,
  MIN_AUDIO_BYTES: 3072,
  MSG_QUEUE_MAX: 50,
  RECONNECT_BASE_DELAY_MS: 1000,
  RECONNECT_MAX_DELAY_MS: 30000,
};

export const MESSAGE_TYPES = {
  TOOL: "tool",
  TTS_AUDIO: "tts_audio",
  STATUS_ACK: "status_ack",
  ERROR: "error",
  STATUS: "status",
};

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
  GET_OPTIONS_COUNT: "get_options_count",
};
