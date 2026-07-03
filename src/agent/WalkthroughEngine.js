import { executeTool } from "./toolRegistry";
import { TOOL_TYPES, STATUS_EVENTS } from "./protocol";
import { SpotlightManager } from "./SpotlightManager";
import { sendStatus, sendError } from "./wsConnection";
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

    // messageId → { resolve, reject } fired when that audio finishes/aborts
    this._audioCompletionHandlers = new Map();
    // Set of messageIds that finished playing before their handler was registered
    this._completedAudioMessages = new Set();
    this._generationId = 0;
  }

  init({ setIsPaused, setIsWalkthroughActive, addMessage, clearMessages, stopAudio }) {
    this._setIsPaused = setIsPaused;
    this._setIsWalkthroughActive = setIsWalkthroughActive;
    this._addMessage = addMessage;
    this._clearMessages = clearMessages;
    this._stopAudio = stopAudio;
  }

  wireAudio() {
    const onPlaybackChange = (playing) => {
      if (!playing && this.isDetourActive) {
        console.log("[WalkthroughEngine] Detour audio done — auto-resuming.");
        sendStatus("resume_walkthrough");
      }
    };

    const onMessageEnded = (messageId) => {
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      const handler = this._audioCompletionHandlers.get(messageId);
      if (handler) {
        this._audioCompletionHandlers.delete(messageId);
        handler.resolve();
      } else {
        // Audio finished before handler was registered! Mark as completed.
        this._completedAudioMessages.add(messageId);
      }
    };

    // User interrupted — drop all pending completion handlers so field_done / speak_done are not sent
    const onCleared = () => {
      this._audioCompletionHandlers.forEach(({ reject }) => {
        try {
          reject(new Error("Audio cleared"));
        } catch (e) {
          console.error("[WalkthroughEngine] Error rejecting completion handler:", e);
        }
      });
      this._audioCompletionHandlers.clear();
      this._completedAudioMessages.clear(); // Reset on barge-in
      // TELL THE BACKEND audio was interrupted
      sendStatus("tts_playback_interrupted");
    };

    const unsub = audioQueue.onPlaybackChange(onPlaybackChange);
    audioQueue.onMessageEnded = onMessageEnded;
    audioQueue.onCleared = onCleared;

    return () => {
      unsub();
      if (audioQueue.onMessageEnded === onMessageEnded) audioQueue.onMessageEnded = null;
      if (audioQueue.onCleared === onCleared) audioQueue.onCleared = null;
    };
  }

  // Single entry point for all TTS audio from the backend
  receiveAudio({ url, base64, messageId, done }) {
    if (url) audioQueue.enqueueUrl(url, messageId);
    else if (base64 != null) audioQueue.enqueue(base64, messageId, done);
  }

  // Register a one-shot callback to fire when a specific audio message finishes
  onAudioComplete(messageId, timeoutMs = 60000) {
    const expectedGen = this._generationId;
    return new Promise((resolve, reject) => {
      // Already completed? Resolve immediately
      if (this._completedAudioMessages.has(messageId)) {
        this._completedAudioMessages.delete(messageId);
        resolve(expectedGen === this._generationId);
        return;
      }

      const timer = setTimeout(() => {
        this._audioCompletionHandlers.delete(messageId);
        console.warn(`[WalkthroughEngine] Audio completion timeout for ${messageId}`);
        resolve(false); // false = timed out, audio never completed
      }, timeoutMs);

      this._audioCompletionHandlers.set(messageId, {
        resolve: () => {
          clearTimeout(timer);
          resolve(expectedGen === this._generationId);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  dispatch(tool, args) {
    if (tool === TOOL_TYPES.PAUSE_WALKTHROUGH) {
      this.isPaused = true; this._setIsPaused?.(true); return;
    }
    if (tool === TOOL_TYPES.RESUME_WALKTHROUGH) {
      this.isPaused = false; this._setIsPaused?.(false); this._drain(); return;
    }
    if (tool === TOOL_TYPES.CANCEL_WALKTHROUGH) {
      this.reset();
      this._setIsPaused?.(false);
      this._setIsWalkthroughActive?.(false);
      this._stopAudio?.();
      this._clearMessages?.();
      executeTool(TOOL_TYPES.CLOSE_DIALOG, {}, this._context()).catch(() => {});
      return;
    }
    if (tool === "walkthrough_cancelled" || tool === TOOL_TYPES.WALKTHROUGH_CANCELLED) {
      this.reset();
      this._setIsWalkthroughActive?.(false);
      this._setIsPaused?.(false);
      this._stopAudio?.();
      return;
    }
    if (tool === "detour_start") { this.isDetourActive = true; return; }
    if (tool === "detour_end")   { this.isDetourActive = false; this._drain(); return; }

    if (tool === TOOL_TYPES.CLOSE_DIALOG || tool === "close_dialog") {
      this.activeFormId = null;
    }

    if (tool === TOOL_TYPES.BEGIN_WALKTHROUGH || tool === TOOL_TYPES.START_WALKTHROUGH) {
      this._setIsWalkthroughActive?.(true);
      if (args?.formId) this.activeFormId = args.formId;
    }
    if (tool === "walkthrough_finished") {
      this._setIsWalkthroughActive?.(false);
      this.activeFormId = null;
    }

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
        if (err.message?.startsWith("Unknown tool")) {
          console.log(`[WalkthroughEngine] ${err.message}`);
        } else {
          console.error(`[WalkthroughEngine] ${tool}:`, err);
        }
        sendError(tool, err.message || String(err));
      })
      .finally(() => {
        this.executing = false;
        if (this.queue.length > 0) this._drain();
      });
  }

  reset() {
    this.queue = [];
    this.executing = false;
    this._generationId++;
    this.isPaused = false;
    this.activeFormId = null;
    this.isDetourActive = false;
    for (const [id, handler] of this._audioCompletionHandlers) {
      handler.resolve(false);
    }
    this._audioCompletionHandlers.clear();
    this._completedAudioMessages.clear();
    SpotlightManager.clearSpotlight();
  }
}

export const walkthroughEngine = new WalkthroughEngine();
export default WalkthroughEngine;
