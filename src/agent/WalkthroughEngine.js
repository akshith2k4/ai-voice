import { executeTool } from "./toolRegistry";
import { TOOL_TYPES, STATUS_EVENTS } from "./protocol";
import { SpotlightManager } from "./SpotlightManager";
import { sendStatus } from "./wsConnection";
import { audioQueue } from "./AudioQueue";
import "./toolHandlers/index";

class WalkthroughEngine {
  constructor() {
    this.queue = [];
    this.executing = false;
    this.isPaused = false;
    this.isDetourActive = false;
    this.activeFormId = null;

    this._setIsPaused = null;
    this._setIsWalkthroughActive = null;
    this._addMessage = null;
    this._clearMessages = null;
    this._stopAudio = null;

    // messageId → callback fired when that audio finishes
    this._audioCompletionHandlers = new Map();
  }

  init({ setIsPaused, setIsWalkthroughActive, addMessage, clearMessages, stopAudio }) {
    this._setIsPaused = setIsPaused;
    this._setIsWalkthroughActive = setIsWalkthroughActive;
    this._addMessage = addMessage;
    this._clearMessages = clearMessages;
    this._stopAudio = stopAudio;
  }

  wireAudio() {
    audioQueue.onPlaybackChange((playing) => {
      if (!playing && this.isDetourActive) {
        console.log("[WalkthroughEngine] Detour audio done — auto-resuming.");
        sendStatus("resume_walkthrough");
      }
    });

    audioQueue.onMessageEnded = (messageId) => {
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      const handler = this._audioCompletionHandlers.get(messageId);
      if (handler) {
        this._audioCompletionHandlers.delete(messageId);
        handler();
      }
    };

    // User interrupted — drop all pending completion handlers so field_done / speak_done are not sent
    audioQueue.onCleared = () => {
      this._audioCompletionHandlers.clear();
    };
  }

  // Single entry point for all TTS audio from the backend
  receiveAudio({ url, base64, messageId, done }) {
    if (url) audioQueue.enqueueUrl(url, messageId);
    else if (base64 != null) audioQueue.enqueue(base64, messageId, done);
  }

  // Register a one-shot callback to fire when a specific audio message finishes
  onAudioComplete(messageId, callback) {
    this._audioCompletionHandlers.set(messageId, callback);
  }

  dispatch(tool, args) {
    if (tool === TOOL_TYPES.PAUSE_WALKTHROUGH) {
      this.isPaused = true; this._setIsPaused?.(true); return;
    }
    if (tool === TOOL_TYPES.RESUME_WALKTHROUGH) {
      this.isPaused = false; this._setIsPaused?.(false); this._drain(); return;
    }
    if (tool === TOOL_TYPES.CANCEL_WALKTHROUGH) {
      this.queue = [];
      this.executing = false;
      this.isPaused = false;
      this.isDetourActive = false;
      this.activeFormId = null;
      this._audioCompletionHandlers.clear();
      this._setIsPaused?.(false);
      this._setIsWalkthroughActive?.(false);
      this._stopAudio?.();
      this._clearMessages?.();
      SpotlightManager.clearSpotlight();
      executeTool(TOOL_TYPES.CLOSE_DIALOG, {}, this._context()).catch(() => {});
      return;
    }
    if (tool === "detour_start") { this.isDetourActive = true; return; }
    if (tool === "detour_end")   { this.isDetourActive = false; this._drain(); return; }

    if (tool === TOOL_TYPES.BEGIN_WALKTHROUGH || tool === TOOL_TYPES.START_WALKTHROUGH) {
      this._setIsWalkthroughActive?.(true);
      if (args?.formId) this.activeFormId = args.formId;
    }
    if (tool === "walkthrough_finished") this._setIsWalkthroughActive?.(false);

    this.queue.push({ tool, args });
    this._drain();
  }

  _context() {
    return {
      add: this._addMessage,
      formId: this.activeFormId,
      setActiveFormId: (id) => { this.activeFormId = id; },
    };
  }

  _drain() {
    if (this.executing || this.queue.length === 0 || this.isPaused) return;
    this.executing = true;
    const { tool, args } = this.queue.shift();
    executeTool(tool, args, this._context())
      .catch(err => {
        if (err.message?.startsWith("Unknown tool")) console.log(`[WalkthroughEngine] ${err.message}`);
        else console.error(`[WalkthroughEngine] ${tool}:`, err);
      })
      .finally(() => {
        this.executing = false;
        if (this.queue.length > 0) this._drain();
      });
  }
}

export const walkthroughEngine = new WalkthroughEngine();
