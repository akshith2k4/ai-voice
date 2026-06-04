import { sendStatus } from "./wsConnection";
import { STATUS_EVENTS } from "./protocol";

export class AudioQueue {
  constructor() {
    this.queue = [];
    this.isPlaying = false;
    this.onPlaybackStateChange = null; // callback for isAgentSpeaking

    // Initialize a single, persistent window.AudioContext on connection.
    if (!window.audioContext) {
      window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    this.audioContext = window.audioContext;

    // Timeline scheduling state
    this.nextPlaybackTime = 0;
    this.activeSources = [];
    this.isProcessingQueue = false;
    this.pendingBuffers = new Map();
    this.fetchControllers = new Map(); // messageId -> AbortController
    this.activeAudios = new Map(); // messageId -> HTML5 Audio
  }

  concatArrayBuffers(buffers) {
    let totalLength = 0;
    for (const b of buffers) {
      totalLength += b.byteLength;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
      result.set(new Uint8Array(b), offset);
      offset += b.byteLength;
    }
    return result.buffer;
  }

  async enqueue(base64Audio, messageId, done) {
    console.log(`[AudioQueue] Enqueue: messageId=${messageId}, done=${done}`);
    
    // Resume AudioContext if it's suspended (autoplay policy)
    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn("[AudioQueue] Failed to resume AudioContext:", e);
      }
    }

    // Decode base64 to ArrayBuffer
    let arrayBuffer;
    try {
      arrayBuffer = this.base64ToArrayBuffer(base64Audio);
    } catch (error) {
      console.error("[AudioQueue] Base64 decoding failed:", error);
      if (done !== false) {
        sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      }
      return;
    }

    if (!this.pendingBuffers.has(messageId)) {
      this.pendingBuffers.set(messageId, []);
    }

    if (arrayBuffer.byteLength > 0) {
      this.pendingBuffers.get(messageId).push(arrayBuffer);
    }

    if (done !== false) {
      const buffers = this.pendingBuffers.get(messageId) || [];
      this.pendingBuffers.delete(messageId);

      if (buffers.length === 0) {
        sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
        return;
      }

      const combinedBuffer = this.concatArrayBuffers(buffers);
      
      try {
        const audioBuffer = await this.audioContext.decodeAudioData(combinedBuffer);
        this.schedulePlayback(audioBuffer, messageId, true);
      } catch (decodeError) {
        console.error("[AudioQueue] MP3 decoding failed:", decodeError);
        sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      }
    }
  }

  async enqueueUrl(url, messageId) {
    console.log(`[AudioQueue] EnqueueUrl (HTML5 Audio): messageId=${messageId}, url=${url}`);

    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn("[AudioQueue] Failed to resume AudioContext:", e);
      }
    }

    const audio = new Audio(url);
    this.activeAudios.set(messageId, audio);

    this.isPlaying = true;
    this.onPlaybackStateChange?.(true);

    audio.onended = () => {
      console.log(`[AudioQueue] AudioUrl Ended: messageId=${messageId}`);
      this.activeAudios.delete(messageId);
      if (this.activeAudios.size === 0 && this.activeSources.length === 0) {
        this.isPlaying = false;
        this.onPlaybackStateChange?.(false);
      }
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
    };

    audio.onerror = (err) => {
      console.error(`[AudioQueue] AudioUrl Error for messageId=${messageId}:`, err);
      this.activeAudios.delete(messageId);
      if (this.activeAudios.size === 0 && this.activeSources.length === 0) {
        this.isPlaying = false;
        this.onPlaybackStateChange?.(false);
      }
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
    };

    try {
      await audio.play();
    } catch (playError) {
      console.error("[AudioQueue] AudioUrl play() failed:", playError);
      this.activeAudios.delete(messageId);
      if (this.activeAudios.size === 0 && this.activeSources.length === 0) {
        this.isPlaying = false;
        this.onPlaybackStateChange?.(false);
      }
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
    }
  }

  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  schedulePlayback(audioBuffer, messageId, done) {
    this.isPlaying = true;
    this.onPlaybackStateChange?.(true);

    let bufferToUse = audioBuffer;
    if (!bufferToUse) {
      // Create a tiny silent buffer for empty completion chunks
      bufferToUse = this.audioContext.createBuffer(1, 1, this.audioContext.sampleRate);
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = bufferToUse;
    source.connect(this.audioContext.destination);

    const sourceItem = { source, messageId, done, completed: false };
    this.activeSources.push(sourceItem);

    const now = this.audioContext.currentTime;
    // Schedule node on the timeline
    let startTime = Math.max(now, this.nextPlaybackTime);
    source.start(startTime);

    // Update next playback time based on duration
    this.nextPlaybackTime = startTime + bufferToUse.duration;

    const cleanUp = () => {
      source.onended = null;
      this.activeSources = this.activeSources.filter((s) => s !== sourceItem);
      if (this.activeSources.length === 0) {
        this.isPlaying = false;
        this.nextPlaybackTime = 0; // Reset timeline since queue has finished
        this.onPlaybackStateChange?.(false);
      }
    };

    source.onended = () => {
      const isLast = done !== false;
      console.log(`[AudioQueue] Ended: messageId=${messageId}, done=${done}, isLast=${isLast}`);
      if (isLast && !sourceItem.completed) {
        sourceItem.completed = true;
        sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      }
      cleanUp();
    };
  }

  clear(suppressCompletion = false) {
    this.queue = [];
    this.isProcessingQueue = false;
    this.pendingBuffers.clear();

    // Abort any active fetches
    this.fetchControllers.forEach((controller, msgId) => {
      controller.abort();
      if (!suppressCompletion) {
        sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId: msgId });
      }
    });
    this.fetchControllers.clear();

    // Pause and clean up any HTML5 Audio elements
    if (this.activeAudios) {
      this.activeAudios.forEach((audio, msgId) => {
        try {
          audio.pause();
        } catch (e) {
          console.warn("[AudioQueue] Failed to pause HTML5 audio:", e);
        }
        if (!suppressCompletion) {
          sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId: msgId });
        }
      });
      this.activeAudios.clear();
    }

    // Stop all active/scheduled source nodes
    this.activeSources.forEach((sourceItem) => {
      sourceItem.source.onended = null;
      try {
        sourceItem.source.stop();
      } catch (e) {
        // May already be stopped/not started
      }
      // Send completion so the backend doesn't stall
      if (!sourceItem.completed && !suppressCompletion) {
        sourceItem.completed = true;
        sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId: sourceItem.messageId });
      }
    });

    this.activeSources = [];
    this.isPlaying = false;
    this.nextPlaybackTime = 0;
    this.onPlaybackStateChange?.(false);
  }
}
