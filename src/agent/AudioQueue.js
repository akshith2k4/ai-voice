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
  }

  enqueue(base64Audio, messageId, done) {
    console.log(`[AudioQueue] Enqueue: messageId=${messageId}, done=${done}`);
    this.queue.push({ base64Audio, messageId, done });
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];

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
          arrayBuffer = this.base64ToArrayBuffer(item.base64Audio);
        } catch (error) {
          console.error("[AudioQueue] Base64 decoding failed:", error);
          sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId: item.messageId });
          this.queue.shift();
          continue;
        }

        // Check if it's an empty buffer (completion marker)
        if (arrayBuffer.byteLength === 0) {
          this.schedulePlayback(null, item.messageId, item.done);
          this.queue.shift();
          continue;
        }

        // Convert PCM 16-bit to AudioBuffer
        let audioBuffer;
        try {
          const byteLength = arrayBuffer.byteLength;
          const sampleCount = Math.floor(byteLength / 2);
          const int16Array = new Int16Array(arrayBuffer, 0, sampleCount);

          audioBuffer = this.audioContext.createBuffer(1, sampleCount, 22050);
          const channelData = audioBuffer.getChannelData(0);

          for (let i = 0; i < sampleCount; i++) {
            channelData[i] = int16Array[i] / 32768.0;
          }
        } catch (error) {
          console.error("[AudioQueue] Raw PCM conversion failed:", error);
          // Still report completion if it's the last chunk so the pipeline doesn't stall
          const isLast = item.done !== false;
          if (isLast) {
            sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId: item.messageId });
          }
          this.queue.shift();
          continue;
        }

        // Check if the queue was cleared during async resume operation
        if (this.queue[0] !== item) {
          sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId: item.messageId });
          continue;
        }

        // Schedule playback
        this.schedulePlayback(audioBuffer, item.messageId, item.done);

        // Remove from queue
        this.queue.shift();
      }
    } finally {
      this.isProcessingQueue = false;
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
