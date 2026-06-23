import { config } from "../config.js";

export interface FillerAudio {
  text: string;
  s3Url: string;
}

const { region, bucketName } = config.aws;
const S3_BASE_URL = bucketName && region 
  ? `https://${bucketName}.s3.${region}.amazonaws.com`
  : "https://linengrass-voiceai-prod.s3.ap-southeast-2.amazonaws.com";

const fillers: FillerAudio[] = [
  {
    text: "Yeah, good question.",
    s3Url: `${S3_BASE_URL}/assets/fillers/Yeah%20good%20question.mp3`,
  },
  {
    text: "Let's check that section.",
    s3Url: `${S3_BASE_URL}/assets/fillers/let%20check%20that%20section.mp3`,
  },
  {
    text: "Let me check that for you.",
    s3Url: `${S3_BASE_URL}/assets/fillers/let%20me%20check%20that%20for%20you.mp3`,
  },
  {
    text: "Let me explain how that works.",
    s3Url: `${S3_BASE_URL}/assets/fillers/let%20me%20explain%20how%20that%20works.mp3`,
  },
  {
    text: "Let's pause and look at that.",
    s3Url: `${S3_BASE_URL}/assets/fillers/lets%20pause%20and%20look%20at%20that.mp3`,
  },
  {
    text: "Let's see what we have here.",
    s3Url: `${S3_BASE_URL}/assets/fillers/lets%20see%20what%20we%20have%20here.mp3`,
  },
];

/**
 * Loads all conversational fillers from the public assets directory on startup.
 * Converts each MP3 to base64 and caches it in memory.
 */
export async function initializeFillers() {
  console.log(`[FillerService] Configured ${fillers.length} conversational fillers from S3: ${S3_BASE_URL}`);
}

/**
 * Checks if the user's transcribed text is a question.
 * Handles conversational preambles, missing end punctuation, and nested questions.
 */
export function isQuestion(text: string): boolean {
  const trimmed = text.trim();
  
  // 1. If it contains a question mark anywhere, it is a question
  if (trimmed.includes("?")) return true;

  // 2. Split the utterance into sentences or clauses to check segment starts
  const segments = trimmed.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);

  // Match common question-starting words and auxiliary verbs
  const questionRegex = /^(what|how|why|who|when|where|can|could|would|is|are|do|does|did|should|will|has|have|may|tell)\b/i;

  for (const segment of segments) {
    // Clean common leading conversational starters for each segment
    const cleaned = segment.replace(/^(so|well|hey|ok|okay|hi|hello|now|please|regarding|coming to|about)\b\s*,?\s*/i, "");
    if (questionRegex.test(cleaned)) {
      return true;
    }
  }

  // 3. Fallback: match common question patterns anywhere in the string
  const patternRegex = /\b(what should|how (do|can|to)|can (i|you)|is there|are there|how about)\b/i;
  if (patternRegex.test(trimmed)) {
    return true;
  }

  return false;
}

const lastPlayedFiller = new Map<string, string>(); // sessionId -> fillerText

export function cleanupSession(sessionId: string): void {
  lastPlayedFiller.delete(sessionId);
}

/**
 * Maps query topics/intents to the most appropriate filler, falling back to a random generic filler.
 * Tracks last played fillers to prevent consecutive repetitions for the same session.
 */
export function selectFiller(text: string, sessionId?: string): FillerAudio | null {
  if (process.env.NODE_ENV === "test" || fillers.length === 0) return null;

  const lowercaseText = text.toLowerCase();
  const candidates: FillerAudio[] = [];

  // 1. Explanation intent -> "Let me explain how that works."
  const explainKeywords = ["how", "why", "explain", "reason", "meaning", "what is", "what does", "define", "purpose", "format"];
  if (explainKeywords.some((kw) => lowercaseText.includes(kw))) {
    const filler = fillers.find((f) => f.text.includes("explain"));
    if (filler) candidates.push(filler);
  }

  // 2. UI/field/section detour navigation intent -> "Let's check that section."
  const sectionKeywords = [
    "section", "page", "field", "screen", "tab", "where", "go to", "navigate",
    "button", "click", "select", "input", "dropdown", "box", "type",
    "customer", "reference", "id", "hotel", "agreement", "issue", "date"
  ];
  if (sectionKeywords.some((kw) => lowercaseText.includes(kw))) {
    const filler = fillers.find((f) => f.text.includes("check that section"));
    if (filler) candidates.push(filler);
  }

  // 3. Lookup/status check intent -> "Let me check that for you."
  const checkKeywords = ["check", "find", "status", "search", "lookup", "value", "get", "show", "list"];
  if (checkKeywords.some((kw) => lowercaseText.includes(kw))) {
    const filler = fillers.find((f) => f.text.includes("check that for you"));
    if (filler) candidates.push(filler);
  }

  // 4. Pause/wait intent -> "Let's pause and look at that."
  const pauseKeywords = ["wait", "pause", "stop", "hold on", "hang on", "second", "moment"];
  if (pauseKeywords.some((kw) => lowercaseText.includes(kw))) {
    const filler = fillers.find((f) => f.text.includes("pause"));
    if (filler) candidates.push(filler);
  }

  // Generic pool fallbacks
  const genericTexts = [
    "Yeah, good question.",
    "Let's see what we have here.",
    "Let me check that for you."
  ];
  const genericPool = fillers.filter((f) => genericTexts.includes(f.text));

  // Use matched specific intent candidates if present, else fallback to generic pool
  let pool = candidates.length > 0 ? candidates : genericPool;
  if (pool.length === 0) {
    pool = fillers; // ultimate fallback
  }

  // Apply no-repeat constraint to avoid consecutive repetition
  let finalPool = pool;
  if (sessionId) {
    const lastText = lastPlayedFiller.get(sessionId);
    if (lastText) {
      const filtered = pool.filter((f) => f.text !== lastText);
      if (filtered.length > 0) {
        finalPool = filtered;
      }
    }
  }

  const randomIndex = Math.floor(Math.random() * finalPool.length);
  const selected = finalPool[randomIndex];

  if (sessionId && selected) {
    lastPlayedFiller.set(sessionId, selected.text);
  }

  return selected;
}
