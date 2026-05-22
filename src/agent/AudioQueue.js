import { sendStatus } from "./wsConnection";
import { STATUS_EVENTS } from "./protocol";

let globalAudioContext = null;

function getAudioContext() {
  if (!globalAudioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioContext = new AudioContextClass();
    } else {
      console.error("[AudioQueue] Web Audio API is not supported in this browser.");
    }
  }
  return globalAudioContext;
}

function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function decodeAudioDataAsync(audioContext, arrayBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const promise = audioContext.decodeAudioData(
        arrayBuffer,
        (buffer) => resolve(buffer),
        (err) => reject(err)
      );
      if (promise && typeof promise.catch === "function") {
        promise.catch(reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}

export class AudioQueue {
  constructor() {
    this.queue = [];
    this.messageStates = new Map();
    this.isPlaying = false;
    this.currentMessageId = null;
    this.onPlaybackStateChange = null; // callback for isAgentSpeaking
    this.audioContext = getAudioContext();
    this.isProcessingPlayQueue = false;
  }

  enqueue(base64Audio, messageId, isFinal = false) {
    if (!this.audioContext) {
      console.error("[AudioQueue] Cannot enqueue: AudioContext is not initialized.");
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId });
      return;
    }

    let msgState = this.messageStates.get(messageId);
    if (!msgState) {
      msgState = {
        messageId,
        chunks: [],
        totalByteLength: 0,
        isFinal: false,
        decodePromiseChain: Promise.resolve(),
        scheduledDuration: 0,
        startTimelineTime: 0,
        activeSources: [],
        startedPlaying: false,
        error: null,
      };
      msgState.finishedPromise = new Promise((resolve) => {
        msgState.resolveFinished = resolve;
      });
      this.messageStates.set(messageId, msgState);
      this.queue.push(msgState);
    }

    // Default legacy non-streamed chunks to isFinal = true
    const finalFlag = isFinal !== false;
    if (finalFlag) {
      msgState.isFinal = true;
    }

    if (base64Audio) {
      try {
        const chunk = new Uint8Array(base64ToArrayBuffer(base64Audio));
        msgState.chunks.push(chunk);
        msgState.totalByteLength += chunk.byteLength;
      } catch (err) {
        console.error("[AudioQueue] Error converting base64 to buffer:", err);
      }
    }

    const currentChunks = [...msgState.chunks];
    const currentByteLength = msgState.totalByteLength;

    msgState.decodePromiseChain = msgState.decodePromiseChain.then(async () => {
      // If we've already been cleared
      if (this.queue.indexOf(msgState) === -1) {
        return;
      }

      if (currentByteLength > 0) {
        const concatenated = new Uint8Array(currentByteLength);
        let offset = 0;
        for (const chunk of currentChunks) {
          concatenated.set(chunk, offset);
          offset += chunk.byteLength;
        }

        try {
          const buffer = await decodeAudioDataAsync(this.audioContext, concatenated.buffer);
          this._scheduleSegment(msgState, buffer);
        } catch (err) {
          console.error("[AudioQueue] Error decoding accumulated buffer:", err);
          msgState.error = err;
          if (msgState.isFinal && msgState.activeSources.length === 0) {
            msgState.resolveFinished();
          }
        }
      } else {
        if (msgState.isFinal && msgState.activeSources.length === 0) {
          msgState.resolveFinished();
        }
      }
    });

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  _scheduleSegment(msgState, buffer) {
    // If the message has been cleared/cancelled, ignore
    if (this.queue.indexOf(msgState) === -1) {
      return;
    }

    const duration = buffer.duration;
    if (duration <= msgState.scheduledDuration) {
      if (msgState.isFinal && msgState.activeSources.length === 0) {
        msgState.resolveFinished();
      }
      return;
    }

    if (!msgState.startedPlaying) {
      msgState.startedPlaying = true;
      msgState.startTimelineTime = this.audioContext.currentTime + 0.05;
    }

    const startOffset = msgState.scheduledDuration;
    const segmentDuration = duration - startOffset;
    let playTime = msgState.startTimelineTime + startOffset;

    // Starvation detection: if the calculated play time is in the past,
    // it means network starvation happened. Shift startTimelineTime forward.
    if (playTime < this.audioContext.currentTime) {
      console.warn(
        `[AudioQueue] Starvation detected for message ${msgState.messageId}. Shifting timeline.`
      );
      msgState.startTimelineTime = this.audioContext.currentTime - startOffset;
      playTime = this.audioContext.currentTime;
    }

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      source.onended = () => {
        msgState.activeSources = msgState.activeSources.filter((s) => s !== source);
        if (msgState.isFinal && msgState.activeSources.length === 0) {
          msgState.resolveFinished();
        }
      };

      msgState.activeSources.push(source);
      source.start(playTime, startOffset, segmentDuration);
    } catch (error) {
      console.error("[AudioQueue] Failed to schedule source node:", error);
      if (msgState.isFinal && msgState.activeSources.length === 0) {
        msgState.resolveFinished();
      }
    }

    msgState.scheduledDuration = duration;
  }

  playNext() {
    if (this.isProcessingPlayQueue) {
      return;
    }
    this.isProcessingPlayQueue = true;
    this._runPlayLoop().finally(() => {
      this.isProcessingPlayQueue = false;
    });
  }

  async _runPlayLoop() {
    while (this.queue.length > 0) {
      this.isPlaying = true;
      this.onPlaybackStateChange?.(true);

      const msgState = this.queue[0];
      this.currentMessageId = msgState.messageId;

      if (this.audioContext.state === "suspended") {
        try {
          await this.audioContext.resume();
        } catch (e) {
          console.error("[AudioQueue] Failed to resume AudioContext:", e);
        }
      }

      await msgState.finishedPromise;

      if (this.currentMessageId !== msgState.messageId) {
        continue;
      }

      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId: msgState.messageId });

      this.messageStates.delete(msgState.messageId);
      this.queue.shift();
    }

    if (this.isPlaying) {
      this.isPlaying = false;
      this.currentMessageId = null;
      this.onPlaybackStateChange?.(false);
    }
  }

  clear() {
    if (this.currentMessageId) {
      const msgState = this.messageStates.get(this.currentMessageId);
      if (msgState && msgState.activeSources) {
        for (const source of msgState.activeSources) {
          source.onended = null;
          try {
            source.stop();
          } catch (e) {
            console.error("[AudioQueue] Error stopping source node:", e);
          }
        }
        msgState.activeSources = [];
      }
      
      sendStatus(STATUS_EVENTS.TTS_PLAYBACK_COMPLETE, { messageId: this.currentMessageId });
      
      if (msgState && msgState.resolveFinished) {
        msgState.resolveFinished();
      }
    }

    for (const msgState of this.queue) {
      if (msgState.messageId !== this.currentMessageId) {
        if (msgState.resolveFinished) {
          msgState.resolveFinished();
        }
      }
    }

    this.queue = [];
    this.messageStates.clear();
    this.isPlaying = false;
    this.currentMessageId = null;
    this.onPlaybackStateChange?.(false);
  }
}
