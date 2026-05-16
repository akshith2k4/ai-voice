// ============================================
// ElevenLabs Text-to-Speech
// Converts text → audio buffer (MP3)
// ============================================

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_TTS_MODEL =
  process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2";

const TTS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

export interface TTSResult {
  success: boolean;
  audioBuffer: Buffer | null;
  error?: string;
}

/**
 * Generate speech audio from text using ElevenLabs TTS
 */
export async function generateSpeech(text: string): Promise<TTSResult> {
  if (!ELEVENLABS_API_KEY) {
    console.warn("[TTS] ELEVENLABS_API_KEY not configured, skipping TTS");
    return { success: false, audioBuffer: null, error: "Not configured" };
  }

  if (!text || text.trim().length === 0) {
    return { success: false, audioBuffer: null, error: "Empty text" };
  }

  try {
    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_TTS_MODEL,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TTS] API error ${response.status}: ${errorText}`);
      return {
        success: false,
        audioBuffer: null,
        error: `TTS API returned ${response.status}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const sizeKB = (audioBuffer.length / 1024).toFixed(1);
    console.log(
      `[TTS] Generated audio: ${sizeKB}KB for "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`
    );

    return { success: true, audioBuffer };
  } catch (error) {
    console.error("[TTS] Speech generation failed:", error);
    return {
      success: false,
      audioBuffer: null,
      error: error instanceof Error ? error.message : "Unknown TTS error",
    };
  }
}
