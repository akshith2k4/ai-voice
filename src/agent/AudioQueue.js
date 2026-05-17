import { sendStatus } from "./wsConnection";
import { STATUS_EVENTS } from "./protocol";

export class AudioQueue {
  constructor() {
    this.queue = [];
    this.isPlaying = false;
    this.currentMessageId = null;
    this.onPlaybackStateChange = null; // callback for isAgentSpeaking
  }

  enqueue(base64Audio, messageId) {
    this.queue.push({ base64Audio, messageId });
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.currentMessageId = null;
      this.onPlaybackStateChange?.(false);
      return;
    }

    this.isPlaying = true;
    this.onPlaybackStateChange?.(true);

    const { base64Audio, messageId } = this.queue.shift();
    this.currentMessageId = messageId;

    const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);

    audio.onended = () => {
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      this.playNext();
    };

    audio.onerror = (error) => {
      console.error("[AudioQueue] Playback error:", error);
      // Still report completion so the pipeline doesn't stall
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      this.playNext();
    };

    audio.play().catch((error) => {
      console.error("[AudioQueue] Play failed:", error);
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      this.playNext();
    });
  }

  clear() {
    this.queue = [];
    this.isPlaying = false;
    this.currentMessageId = null;
    this.onPlaybackStateChange?.(false);
  }
}
