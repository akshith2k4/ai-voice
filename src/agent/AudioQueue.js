export class AudioQueue {
  constructor() {
    this.isPlaying = false;

    if (!window.audioContext) {
      window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    this.audioContext = window.audioContext;

    this.nextPlaybackTime = 0;
    this._pendingBuffers = new Map();  // messageId -> ArrayBuffer[] (accumulating chunks)
    this._playing = new Set();         // messageIds currently making sound
    this._audioElements = new Map();   // messageId -> HTML5 Audio
    this._audioSources = new Map();    // messageId -> BufferSourceNode

    // ── Events ────────────────────────────────────────────────────────────────
    // Caller registers via onPlaybackChange(cb) — supports multiple listeners
    this._playbackListeners = new Set();
    // Single callback — only WalkthroughEngine subscribes
    this.onMessageEnded = null;  // (messageId) => void
    this.onCleared = null;       // () => void
  }

  // ── Playback state subscription ───────────────────────────────────────────

  onPlaybackChange(cb) {
    this._playbackListeners.add(cb);
    return () => this._playbackListeners.delete(cb);
  }

  // ── Play URL audio (S3 presigned — HTML5 Audio) ───────────────────────────

  async enqueueUrl(url, messageId) {
    console.log(`[AudioQueue] enqueueUrl: ${messageId}`);
    const arrivedAt = Date.now();
    const audio = new Audio(url);
    this._audioElements.set(messageId, audio);
    this._onStarted(messageId);

    audio.onended = () => {
      console.log(`[AudioQueue] url ended: ${messageId} (${Date.now() - arrivedAt}ms)`);
      this._onEnded(messageId);
    };
    audio.onerror = (err) => {
      console.error(`[AudioQueue] url error: ${messageId}`, err);
      this._onEnded(messageId);
    };
    try {
      await audio.play();
    } catch (err) {
      console.error(`[AudioQueue] play() failed: ${messageId}`, err);
      this._onEnded(messageId);
    }
  }

  // ── Play base64 audio (streaming chunks → Web Audio API) ─────────────────

  async enqueue(base64Audio, messageId, done) {
    if (this.audioContext.state === "suspended") {
      try { await this.audioContext.resume(); } catch (e) {}
    }

    let arrayBuffer;
    try {
      arrayBuffer = this._base64ToArrayBuffer(base64Audio);
    } catch (err) {
      console.error(`[AudioQueue] base64 decode failed: ${messageId}`, err);
      if (done !== false) this._onEnded(messageId);
      return;
    }

    if (!this._pendingBuffers.has(messageId)) this._pendingBuffers.set(messageId, []);
    if (arrayBuffer.byteLength > 0) this._pendingBuffers.get(messageId).push(arrayBuffer);

    if (done !== false) {
      const buffers = this._pendingBuffers.get(messageId) || [];
      this._pendingBuffers.delete(messageId);
      if (buffers.length === 0) { this._onEnded(messageId); return; }

      const combined = this._concatArrayBuffers(buffers);
      try {
        const audioBuffer = await this.audioContext.decodeAudioData(combined);
        this._schedulePlayback(audioBuffer, messageId);
      } catch (err) {
        console.error(`[AudioQueue] decode failed: ${messageId}`, err);
        this._onEnded(messageId);
      }
    }
  }

  // ── Stop everything ───────────────────────────────────────────────────────

  clear() {
    this._pendingBuffers.clear();
    this._audioElements.forEach(audio => { try { audio.pause(); } catch (e) {} });
    this._audioElements.clear();
    this._audioSources.forEach(source => {
      source.onended = null;
      try { source.stop(); } catch (e) {}
    });
    this._audioSources.clear();
    this._playing.clear();
    this.isPlaying = false;
    this.nextPlaybackTime = 0;
    this._playbackListeners.forEach(cb => cb(false));
    this.onCleared?.();
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _schedulePlayback(audioBuffer, messageId) {
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    this._audioSources.set(messageId, source);
    this._onStarted(messageId);

    const startTime = Math.max(this.audioContext.currentTime, this.nextPlaybackTime);
    source.start(startTime);
    this.nextPlaybackTime = startTime + audioBuffer.duration;
    source.onended = () => {
      console.log(`[AudioQueue] base64 ended: ${messageId}`);
      this._onEnded(messageId);
    };
  }

  _onStarted(messageId) {
    this._playing.add(messageId);
    if (this._playing.size === 1) {
      this.isPlaying = true;
      this._playbackListeners.forEach(cb => cb(true));
    }
  }

  _onEnded(messageId) {
    if (!this._playing.has(messageId)) return;
    this._playing.delete(messageId);
    this._audioElements.delete(messageId);
    this._audioSources.delete(messageId);
    this.onMessageEnded?.(messageId);
    if (this._playing.size === 0) {
      this.isPlaying = false;
      this.nextPlaybackTime = 0;
      this._playbackListeners.forEach(cb => cb(false));
    }
  }

  _concatArrayBuffers(buffers) {
    const total = buffers.reduce((n, b) => n + b.byteLength, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const b of buffers) { out.set(new Uint8Array(b), offset); offset += b.byteLength; }
    return out.buffer;
  }

  _base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
}

export const audioQueue = new AudioQueue();
