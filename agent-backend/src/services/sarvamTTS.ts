import dotenv from "dotenv";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "";
const TTS_MODEL = process.env.SARVAM_TTS_MODEL || "bulbul:v3";

interface TTSJob {
  text: string;
  languageCode: string;
  onChunk: (base64Chunk: string, isDone: boolean) => void;
  resolve: () => void;
  reject: (err: any) => void;
}

const ttsQueue: TTSJob[] = [];
let ttsBusy = false;

async function processQueue() {
  if (ttsBusy) return;
  ttsBusy = true;

  while (ttsQueue.length > 0) {
    const job = ttsQueue.shift()!;
    try {
      await synthesizeStreamDirect(job.text, job.languageCode, job.onChunk);
      job.resolve();
    } catch (err) {
      job.reject(err);
    }
  }

  ttsBusy = false;
}

function getSarvamConfig(languageCode: string) {
  const code = (languageCode || "en").toLowerCase();
  if (code.startsWith("hi")) {
    return {
      target_language_code: "hi-IN",
      speaker: process.env.SARVAM_VOICE_HI || "shubh"
    };
  }
  return {
    target_language_code: "en-IN",
    speaker: process.env.SARVAM_VOICE_EN || "shubh"
  };
}

async function synthesizeStreamDirect(
  text: string,
  languageCode: string,
  onChunk: (base64Chunk: string, isDone: boolean) => void,
  attempt = 1
): Promise<void> {
  if (!SARVAM_API_KEY) {
    throw new Error("SARVAM_API_KEY not configured");
  }
  if (!text.trim()) {
    throw new Error("Empty text for TTS");
  }

  const { target_language_code, speaker } = getSarvamConfig(languageCode);

  const res = await fetch("https://api.sarvam.ai/text-to-speech/stream", {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      speaker,
      model: "bulbul:v3",
      target_language_code,
      pace: 1.0,
      speech_sample_rate: 22050,
      output_audio_codec: "linear16",
      enable_preprocessing: true,
    }),
  });

  if (res.status === 429 && attempt <= 2) {
    console.warn(
      `[Sarvam TTS] Rate limit (429) encountered. Retrying in 1000ms (attempt ${attempt}/2)...`
    );
    await new Promise((r) => setTimeout(r, 1000));
    return synthesizeStreamDirect(text, languageCode, onChunk, attempt + 1);
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Sarvam TTS failed ${res.status}: ${errorText}`);
  }

  if (!res.body) {
    throw new Error("Response body is null");
  }

  const reader = res.body.getReader();
  let residue: Uint8Array | null = null;
  let lastChunk: Uint8Array | null = null;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    let dataToProcess = value;
    if (residue && residue.length > 0) {
      const combined = new Uint8Array(residue.length + value.length);
      combined.set(residue, 0);
      combined.set(value, residue.length);
      dataToProcess = combined;
      residue = null;
    }

    if (dataToProcess.length > 0) {
      const remainder = dataToProcess.length % 2;
      if (remainder > 0) {
        residue = dataToProcess.slice(dataToProcess.length - remainder);
        dataToProcess = dataToProcess.slice(0, dataToProcess.length - remainder);
      }

      if (dataToProcess.length > 0) {
        if (lastChunk) {
          onChunk(Buffer.from(lastChunk).toString("base64"), false);
        }
        lastChunk = dataToProcess;
      }
    }
  }

  if (lastChunk) {
    let finalBytes = lastChunk;
    if (residue && residue.length > 0) {
      const combined = new Uint8Array(lastChunk.length + residue.length);
      combined.set(lastChunk, 0);
      combined.set(residue, lastChunk.length);
      finalBytes = combined;
    }
    onChunk(Buffer.from(finalBytes).toString("base64"), true);
  } else {
    if (residue && residue.length > 0) {
      onChunk(Buffer.from(residue).toString("base64"), true);
    } else {
      onChunk("", true);
    }
  }
}

export function synthesizeStream(
  text: string,
  languageCode: string,
  onChunk: (base64Chunk: string, isDone: boolean) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ttsQueue.push({ text, languageCode, onChunk, resolve, reject });
    processQueue();
  });
}

function pcmToWav(pcmBuffer: Uint8Array, sampleRate = 24000): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const wavHeader = new Uint8Array(44);
  const view = new DataView(wavHeader.buffer);

  wavHeader[0] = 0x52; // R
  wavHeader[1] = 0x49; // I
  wavHeader[2] = 0x46; // F
  wavHeader[3] = 0x46; // F

  view.setUint32(4, chunkSize, true);

  wavHeader[8] = 0x57;  // W
  wavHeader[9] = 0x41;  // A
  wavHeader[10] = 0x56; // V
  wavHeader[11] = 0x45; // E

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

export async function synthesize(text: string, languageCode: string): Promise<string> {
  const chunks: Uint8Array[] = [];
  await synthesizeStream(text, languageCode, (base64Chunk, isDone) => {
    if (base64Chunk) {
      const buffer = Buffer.from(base64Chunk, "base64");
      chunks.push(buffer);
    }
  });

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const wavBytes = pcmToWav(combined, 22050);
  const base64 = Buffer.from(wavBytes).toString("base64");
  return `data:audio/wav;base64,${base64}`;
}
