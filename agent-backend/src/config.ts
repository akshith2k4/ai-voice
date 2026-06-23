// Central configuration — all process.env reads live here.
// Every other file imports from this module instead of reading process.env directly.

export const config = {
  server: {
    port: parseInt(process.env.PORT || "3001"),
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  },

  providers: {
    stt: process.env.STT_PROVIDER || "ELEVEN_LABS",
    tts: process.env.TTS_PROVIDER || "ELEVEN_LABS",
    llm: process.env.LLM_PROVIDER || "OPEN_AI",
  },

  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || "",
    voiceId: process.env.ELEVENLABS_VOICE_ID || process.env.ELEVENLABS_VOICE_EN,
    voiceIdEn: process.env.ELEVENLABS_VOICE_ID_EN || process.env.ELEVENLABS_VOICE_EN || process.env.ELEVENLABS_VOICE_ID,
    voiceIdHi: process.env.ELEVENLABS_VOICE_ID_HI || process.env.ELEVENLABS_VOICE_HI || process.env.ELEVENLABS_VOICE_ID,
    ttsModel: process.env.ELEVENLABS_TTS_MODEL || "eleven_v3",
    sttModel: process.env.ELEVENLABS_STT_MODEL || "scribe_v1",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o",
    ttsModel: process.env.OPENAI_TTS_MODEL || "tts-1",
    ttsVoice: process.env.OPENAI_TTS_VOICE || "alloy",
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  },

  aws: {
    region: (process.env.AWS_REGION || "us-east-1").trim(),
    bucketName: (process.env.AWS_S3_BUCKET_NAME || "").trim(),
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
  },

  voice: {
    bargeInThreshold: (() => {
      const raw = process.env.BARGE_IN_THRESHOLD;
      if (raw === undefined || raw === null) return 0.05;
      const val = Number(raw);
      return isNaN(val) || val < 0 || val > 1 ? 0.05 : val;
    })(),
    bargeInGracePeriodMs: (() => {
      const raw = process.env.BARGE_IN_GRACE_PERIOD_MS;
      if (raw === undefined || raw === null) return 1500;
      const val = parseInt(raw, 10);
      return isNaN(val) || val < 0 ? 1500 : val;
    })(),
  },
} as const;
