import { ISTTService, SttResult } from "../interfaces.js";

export class ElevenLabsSTT implements ISTTService {
  private activeSessions = new Map<string, { chunks: Buffer[]; speechDetected: boolean }>();
  private speechDetectedCallbacks: ((sessionId: string) => void)[] = [];

  constructor() {}

  onSpeechDetected(callback: (sessionId: string) => void): void {
    this.speechDetectedCallbacks.push(callback);
  }

  private pcmToWav(pcmBuffer: Uint8Array, sampleRate = 16000): Uint8Array {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;
    const chunkSize = 36 + dataSize;

    const wavHeader = new Uint8Array(44);
    const view = new DataView(wavHeader.buffer);

    // RIFF identifier
    wavHeader[0] = 0x52; // R
    wavHeader[1] = 0x49; // I
    wavHeader[2] = 0x46; // F
    wavHeader[3] = 0x46; // F

    view.setUint32(4, chunkSize, true);

    // WAVE identifier
    wavHeader[8] = 0x57;  // W
    wavHeader[9] = 0x41;  // A
    wavHeader[10] = 0x56; // V
    wavHeader[11] = 0x45; // E

    // subchunk 1 identifier "fmt "
    wavHeader[12] = 0x66; // f
    wavHeader[13] = 0x6d; // m
    wavHeader[14] = 0x74; // t
    wavHeader[15] = 0x20; //  

    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // subchunk 2 identifier "data"
    wavHeader[36] = 0x64; // d
    wavHeader[37] = 0x61; // a
    wavHeader[38] = 0x74; // t
    wavHeader[39] = 0x61; // a

    view.setUint32(40, dataSize, true);

    const wavFile = new Uint8Array(44 + dataSize);
    wavFile.set(wavHeader, 0);
    wavFile.set(pcmBuffer, 44);

    return wavFile;
  }

  async transcribe(base64Audio: string): Promise<SttResult> {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }
    if (!base64Audio || base64Audio.length < 100) {
      throw new Error("Empty audio");
    }

    const audioBuffer = Buffer.from(base64Audio, "base64");
    const wavBytes = this.pcmToWav(audioBuffer, 16000);

    const form = new FormData();
    form.append("model_id", "scribe_v2");
    form.append("file", new Blob([Buffer.from(wavBytes)], { type: "audio/wav" }), "audio.wav");

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ElevenLabs STT failed ${res.status}: ${text}`);
    }

    const data = await res.json() as {
      text?: string;
      language_code?: string;
    };

    const text = (data.text || "").trim();
    const languageCode = data.language_code || "en";
    const confidence = 1.0;

    console.log(`[ElevenLabs STT REST] Transcribed: "${text}" (${languageCode})`);
    return { text, languageCode, confidence };
  }

  async handleAudioChunk(sessionId: string, base64Chunk: string): Promise<void> {
    let session = this.activeSessions.get(sessionId);
    if (!session) {
      console.log(`[ElevenLabs STT Buffering] Starting buffering session: ${sessionId}`);
      session = { chunks: [], speechDetected: false };
      this.activeSessions.set(sessionId, session);
    }

    const buf = Buffer.from(base64Chunk, "base64");
    session.chunks.push(buf);

    try {
      let maxVal = 0;
      for (let i = 0; i < buf.length; i += 2) {
        if (i + 1 < buf.length) {
          const val = buf.readInt16LE(i);
          const absVal = Math.abs(val);
          if (absVal > maxVal) maxVal = absVal;
        }
      }
      const maxAmp = maxVal / 32768;
      console.log(`[ElevenLabs STT Buffering] Chunk size: ${buf.length} bytes, Max Amplitude: ${maxAmp.toFixed(4)}`);

      const threshold = (() => {
        if (process.env.BARGE_IN_THRESHOLD === undefined || process.env.BARGE_IN_THRESHOLD === null) {
          return 0.05;
        }
        const val = Number(process.env.BARGE_IN_THRESHOLD);
        return isNaN(val) || val < 0 || val > 1 ? 0.05 : val;
      })();
      if (maxAmp > threshold && !session.speechDetected) {
        session.speechDetected = true;
        console.log(`[ElevenLabs STT Buffering] Speech detected for session ${sessionId} (barge-in triggered with threshold ${threshold})`);
        this.speechDetectedCallbacks.forEach(cb => cb(sessionId));
      }
    } catch (err) {
      console.warn("[ElevenLabs STT Buffering] Failed to calculate amplitude:", err);
    }
  }

  async handleAudioEnd(sessionId: string): Promise<SttResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`No active buffering session found for ${sessionId}`);
    }
    this.activeSessions.delete(sessionId);

    if (session.chunks.length === 0) {
      return { text: "", languageCode: "en", confidence: 0 };
    }

    const totalLength = session.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = Buffer.concat(session.chunks, totalLength);

    console.log(`[ElevenLabs STT Buffering] Finalizing audio for ${sessionId}. Total size: ${totalLength} bytes.`);
    const wavBytes = this.pcmToWav(combined, 16000);

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
    const form = new FormData();
    form.append("model_id", "scribe_v2");
    form.append("file", new Blob([Buffer.from(wavBytes)], { type: "audio/wav" }), "audio.wav");

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ElevenLabs STT Scribe failed ${res.status}: ${text}`);
    }

    const data = await res.json() as {
      text?: string;
      language_code?: string;
    };

    const text = (data.text || "").trim();
    const languageCode = data.language_code || "en";
    const confidence = 1.0;

    console.log(`[ElevenLabs STT Buffering] Final Transcription: "${text}" (${languageCode})`);
    return { text, languageCode, confidence };
  }

  cleanupSession(sessionId: string): void {
    const deleted = this.activeSessions.delete(sessionId);
    if (deleted) {
      console.log(`[ElevenLabs STT] [Session: ${sessionId}] STT session state cleaned up.`);
    }
  }
}
