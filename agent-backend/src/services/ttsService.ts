import { TTSProvider } from "./providersConfig.js";
import { ElevenLabsTTS } from "./providers/elevenLabsTTS.js";
import { OpenAITTS } from "./providers/openAiTTS.js";
import { ITTSService } from "./interfaces.js";

const providers = new Map<TTSProvider, ITTSService>();

function getTTSProvider(): TTSProvider {
  const envVal = process.env.TTS_PROVIDER;
  if (envVal === TTSProvider.OPEN_AI) {
    return TTSProvider.OPEN_AI;
  }
  return TTSProvider.ELEVEN_LABS;
}

export function getTTSService(): ITTSService {
  const provider = getTTSProvider();
  let service = providers.get(provider);
  if (!service) {
    if (provider === TTSProvider.OPEN_AI) {
      service = new OpenAITTS();
    } else {
      service = new ElevenLabsTTS();
    }
    providers.set(provider, service);
  }
  return service;
}

// Facade functions to keep original exports working without breaking consumers
export function synthesizeStream(
  text: string,
  languageCode: string,
  onChunk: (base64Chunk: string, isDone: boolean) => void,
  sessionId: string = "default"
): Promise<void> {
  return getTTSService().synthesizeStream(text, languageCode, onChunk, sessionId);
}

export function interruptActiveTTS(sessionId: string = "default"): void {
  return getTTSService().interruptActiveTTS(sessionId);
}

export function cleanupSession(sessionId: string): void {
  // Clean up session in all active providers to prevent leaks
  for (const provider of providers.values()) {
    provider.cleanupSession(sessionId);
  }
}
