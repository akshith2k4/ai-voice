import { STTProvider } from "./providersConfig.js";
import { ElevenLabsSTT } from "./providers/elevenLabsSTT.js";
import { OpenAISTT } from "./providers/openAiSTT.js";
import { ISTTService, SttResult } from "./interfaces.js";
import { config } from "../config.js";
import { getTurnId } from "./latencyTracker.js";
import { fireAndForget } from "./observability.js";
import { db, turns } from "./db.js";
import { eq } from "drizzle-orm";

const speechCallbacks: ((sessionId: string) => void)[] = [];

type AudioSession = { chunks: Buffer[]; speechDetected: boolean };
const activeSessions = new Map<string, AudioSession>();

// Singleton provider instances
const providers = new Map<STTProvider, ISTTService>();

function getSTTProvider(): STTProvider {
  return config.providers.stt === STTProvider.OPEN_AI ? STTProvider.OPEN_AI : STTProvider.ELEVEN_LABS;
}

function getSTTService(): ISTTService {
  const provider = getSTTProvider();
  if (!providers.has(provider)) {
    providers.set(provider, provider === STTProvider.OPEN_AI ? new OpenAISTT() : new ElevenLabsSTT());
  }
  return providers.get(provider)!;
}

function pcmToWav(pcmBuffer: Uint8Array, sampleRate = 16000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;

  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(numChannels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  Buffer.from(pcmBuffer).copy(wav, 44);
  return wav;
}

export function onSpeechDetected(callback: (sessionId: string) => void): void {
  speechCallbacks.push(callback);
}

function peakAmplitude(buf: Buffer): number {
  let maxVal = 0;
  for (let i = 0; i + 1 < buf.length; i += 2) {
    const absVal = Math.abs(buf.readInt16LE(i));
    if (absVal > maxVal) maxVal = absVal;
  }
  return maxVal / 32768;
}

export async function handleAudioChunk(sessionId: string, base64Chunk: string): Promise<void> {
  const buf = Buffer.from(base64Chunk, "base64");

  let session = activeSessions.get(sessionId);
  if (!session) {
    session = { chunks: [], speechDetected: false };
    activeSessions.set(sessionId, session);
  }

  // Always buffer the chunk to prevent clipping the start of speech
  session.chunks.push(buf);

  // Check for speech to trigger barge-in
  if (!session.speechDetected) {
    let amp: number;
    try { amp = peakAmplitude(buf); } catch { return; }
    
    if (amp > config.voice.bargeInThreshold) {
      session.speechDetected = true;
      console.log(`[STT] Speech start for ${sessionId} (amp: ${amp.toFixed(4)})`);
      speechCallbacks.forEach(cb => cb(sessionId));
    }
  }
}

export async function handleAudioEnd(sessionId: string): Promise<SttResult> {
  const session = activeSessions.get(sessionId);
  if (!session || session.chunks.length === 0) {
    activeSessions.delete(sessionId);
    return { text: "", languageCode: "en", confidence: 0 };
  }
  activeSessions.delete(sessionId);

  const combined = Buffer.concat(session.chunks);
  console.log(`[STT] Finalizing ${sessionId} — ${combined.length} bytes PCM`);

  const wavBuffer = pcmToWav(combined, 16000);
  const result = await getSTTService().transcribe(wavBuffer);
  return { ...result, wavBuffer };
}

export async function transcribeAudio(base64Audio: string): Promise<SttResult> {
  const pcm = Buffer.from(base64Audio, "base64");
  const wavBuffer = pcmToWav(pcm, 16000);
  const result = await getSTTService().transcribe(wavBuffer);
  return { ...result, wavBuffer };
}

export function cleanupSession(sessionId: string): void {
  activeSessions.delete(sessionId);
}


export type { SttResult };
