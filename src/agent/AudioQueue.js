import { sendStatus } from "./wsConnection";
import { STATUS_EVENTS } from "./protocol";

export class AudioQueue {
  constructor() {
    this.queue = [];
    this.isPlaying = false;
    this.currentMessageId = null;
    this.currentAudio = null;
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
      this.currentAudio = null;
      this.onPlaybackStateChange?.(false);
      return;
    }

    this.isPlaying = true;
    this.onPlaybackStateChange?.(true);

    const { base64Audio, messageId } = this.queue.shift();
    this.currentMessageId = messageId;

    let audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
    this.currentAudio = audio;

    const cleanUp = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.src = "";
        audio.load();
      } catch (e) {}
      audio = null;
    };

    audio.onended = () => {
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      cleanUp();
      this.playNext();
    };

    audio.onerror = (error) => {
      console.error("[AudioQueue] Playback error:", error);
      // Still report completion so the pipeline doesn't stall
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      cleanUp();
      this.playNext();
    };

    audio.play().catch((error) => {
      console.error("[AudioQueue] Play failed:", error);
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      cleanUp();
      this.playNext();
    });
  }

  clear() {
    this.queue = [];
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = "";
        this.currentAudio.load();
      } catch (e) {
        console.error("[AudioQueue] Error pausing active audio:", e);
      }
      this.currentAudio = null;
    }
    this.isPlaying = false;
    this.currentMessageId = null;
    this.onPlaybackStateChange?.(false);
  }
}
