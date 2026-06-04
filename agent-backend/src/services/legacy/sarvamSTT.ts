import WebSocket from "ws";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "";
const STT_MODEL = process.env.SARVAM_STT_MODEL || "saaras:v3";


type SpeechDetectedCallback = (sessionId: string) => void;
const speechDetectedCallbacks: SpeechDetectedCallback[] = [];

export function onSpeechDetected(callback: SpeechDetectedCallback) {
  speechDetectedCallbacks.push(callback);
}

export interface SttResult {
  text: string;
  languageCode: string;
  confidence: number;
}

// REST implementation (existing)
export async function transcribe(base64Audio: string): Promise<SttResult> {
  if (!SARVAM_API_KEY) {
    throw new Error("SARVAM_API_KEY not configured");
  }
  if (!base64Audio || base64Audio.length < 100) {
    throw new Error("Empty audio");
  }

  const audioBuffer = Buffer.from(base64Audio, "base64");
  const form = new FormData();
  form.append("model", STT_MODEL);
  form.append("file", new Blob([audioBuffer], { type: "audio/webm" }), "audio.webm");
  form.append("language_code", "unknown");

  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sarvam STT failed ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    transcript?: string;
    language_code?: string;
  };

  const text = (data.transcript || "").trim();
  const languageCode = data.language_code || "en-IN";
  const confidence = 1.0;

  return { text, languageCode, confidence };
}

// WS Streaming session manager class
class ActiveStreamingSession {
  ws: WebSocket;
  transcript = "";
  languageCode = "en-IN";
  resolvePromise: ((result: SttResult) => void) | null = null;
  rejectPromise: ((err: any) => void) | null = null;
  isFlushing = false;
  speechDetected = false;
  openPromise: Promise<void>;

  constructor(sessionId: string, apiKey: string, model: string) {
    if (!apiKey) {
      throw new Error("SARVAM_API_KEY is not configured in process.env. Please add it to your .env file.");
    }
    const url = `wss://api.sarvam.ai/speech-to-text/ws?language-code=unknown&model=${model}&input_audio_codec=pcm_s16le&sample_rate=16000`;
    this.ws = new WebSocket(url, {
      headers: {
        "api-subscription-key": apiKey,
      },
    });

    this.openPromise = new Promise<void>((resolve, reject) => {
      this.ws.on("open", () => resolve());
      this.ws.on("error", (err) => reject(err));
    });

    this.ws.on("message", (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.type === "data" && response.data) {
          this.transcript = (response.data.transcript || "").trim();
          if (response.data.language_code) {
            this.languageCode = response.data.language_code;
          }
          console.log(`[Sarvam STT WS] Transcript updated: "${this.transcript}" (${this.languageCode})`);

          // If we are in the flushing state, the response contains the final transcription.
          if (this.isFlushing && this.resolvePromise) {
            this.resolvePromise({
              text: this.transcript,
              languageCode: this.languageCode,
              confidence: 1.0
            });
            this.resolvePromise = null;
            this.ws.close();
          }
        } else if (response.type === "error") {
          console.error("[Sarvam STT WS] Error received from server:", response.data);
          if (this.rejectPromise) {
            this.rejectPromise(new Error(response.data.error || "STT WebSocket error"));
            this.rejectPromise = null;
          }
        }
      } catch (err) {
        console.error("[Sarvam STT WS] Error parsing message:", err);
      }
    });

    this.ws.on("error", (err) => {
      console.error("[Sarvam STT WS] Socket error:", err);
      if (this.rejectPromise) {
        this.rejectPromise(err);
        this.rejectPromise = null;
      }
    });

    this.ws.on("close", (code, reason) => {
      console.log(`[Sarvam STT WS] Connection closed for session ${sessionId}. Code: ${code}, Reason: ${reason ? reason.toString() : "None"}`);
      if (this.resolvePromise) {
        this.resolvePromise({
          text: this.transcript,
          languageCode: this.languageCode,
          confidence: 1.0
        });
        this.resolvePromise = null;
      }
    });
  }

  sendChunk(base64Chunk: string) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        audio: {
          data: base64Chunk,
          sample_rate: "16000",
          encoding: "audio/wav"
        }
      }));
    }
  }

  async finish(): Promise<SttResult> {
    this.isFlushing = true;
    return new Promise<SttResult>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: "flush"
        }));
        
        // Safety timeout in case flush response doesn't arrive
        setTimeout(() => {
          if (this.resolvePromise) {
            resolve({
              text: this.transcript,
              languageCode: this.languageCode,
              confidence: 1.0
            });
            this.resolvePromise = null;
          }
          try { this.ws.close(); } catch {}
        }, 1500);
      } else {
        resolve({
          text: this.transcript,
          languageCode: this.languageCode,
          confidence: 1.0
        });
      }
    });
  }
}

const activeSessions = new Map<string, ActiveStreamingSession>();

export async function handleAudioChunk(sessionId: string, base64Chunk: string): Promise<void> {
  let session = activeSessions.get(sessionId);
  if (!session) {
    console.log(`[Sarvam STT WS] Starting streaming session: ${sessionId}`);
    session = new ActiveStreamingSession(sessionId, SARVAM_API_KEY, STT_MODEL);
    activeSessions.set(sessionId, session);
  }
  
  // Calculate amplitude to debug silence issues
  try {
    const buf = Buffer.from(base64Chunk, "base64");
    let maxVal = 0;
    for (let i = 0; i < buf.length; i += 2) {
      if (i + 1 < buf.length) {
        const val = buf.readInt16LE(i);
        const absVal = Math.abs(val);
        if (absVal > maxVal) maxVal = absVal;
      }
    }
    const maxAmp = maxVal / 32768;
    console.log(`[Sarvam STT WS] Chunk received for ${sessionId}. Size: ${buf.length} bytes, Max Amplitude: ${maxAmp.toFixed(4)}`);
    
    if (maxAmp > 0.05 && !session.speechDetected) {
      session.speechDetected = true;
      speechDetectedCallbacks.forEach(cb => cb(sessionId));
    }
  } catch (err) {
    console.warn("[Sarvam STT WS] Failed to calculate amplitude:", err);
  }

  await session.openPromise.catch(() => {}); // Wait for connect (ignore errors, sendChunk checks readystate)
  session.sendChunk(base64Chunk);
}

export async function handleAudioEnd(sessionId: string): Promise<SttResult> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error(`No active streaming session found for ${sessionId}`);
  }
  activeSessions.delete(sessionId);
  return session.finish();
}
