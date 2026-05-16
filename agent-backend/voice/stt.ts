// ============================================
// ElevenLabs Speech-to-Text
// Converts audio blob → transcribed text
// ============================================

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

export interface STTResult {
  success: boolean;
  text: string;
  languageCode?: string;
  error?: string;
}

/**
 * Send audio to ElevenLabs STT and get transcribed text
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<STTResult> {
  if (!ELEVENLABS_API_KEY) {
    return {
      success: false,
      text: "",
      error: "ELEVENLABS_API_KEY not configured",
    };
  }

  try {
    const formData = new FormData();
    // Bun's Buffer.buffer may be SharedArrayBuffer — copy to a plain ArrayBuffer first
    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: "audio/webm;codecs=opus" });
    formData.append("file", blob, "audio.webm");   // field name must be "file"
    formData.append("model_id", "scribe_v2");       // scribe_v2 is current

    const response = await fetch(STT_URL, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[STT] API error ${response.status}: ${errorText}`);
      return {
        success: false,
        text: "",
        error: `STT API returned ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      text?: string;
      language_code?: string;
    };

    const text = data.text?.trim() || "";
    console.log(
      `[STT] Transcribed: "${text}"` +
        (data.language_code ? ` (lang: ${data.language_code})` : "")
    );

    return {
      success: true,
      text,
      languageCode: data.language_code,
    };
  } catch (error) {
    console.error("[STT] Transcription failed:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "Unknown STT error",
    };
  }
}
