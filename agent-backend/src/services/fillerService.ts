import { config } from "../config.js";
import { getObjectFromS3 } from "./s3Service.js";

export interface FillerAudio {
  text: string;
  audioBase64: string;
  state: "idle" | "walkthrough";
  intent?: string;
}

const cachedFillers: FillerAudio[] = [];
const lastPlayedFiller = new Map<string, string>(); // sessionId -> fillerText

// Define all fillers with their S3 keys
const FILLER_DEFINITIONS = [
  // --- IDLE STATE (Human-like thinking sounds) ---
  // NOTE: You must upload these specific files to your S3 bucket under assets/fillers/
  { text: "Mm-hmm.", s3Key: "assets/fillers/mm-hmm.mp3", state: "idle" },
  { text: "Yeah.", s3Key: "assets/fillers/yeah.mp3", state: "idle" },
  // --- WALKTHROUGH STATE (Contextual) ---
  { text: "Yeah, good question.", s3Key: "assets/fillers/Yeah%20good%20question.mp3", state: "walkthrough", intent: "generic" },
  { text: "Let's check that section.", s3Key: "assets/fillers/let%20check%20that%20section.mp3", state: "walkthrough", intent: "section" },
  { text: "Let me check that for you.", s3Key: "assets/fillers/let%20me%20check%20that%20for%20you.mp3", state: "walkthrough", intent: "check" },
  { text: "Let me explain how that works.", s3Key: "assets/fillers/let%20me%20explain%20how%20that%20works.mp3", state: "walkthrough", intent: "explain" },
  { text: "Let's pause and look at that.", s3Key: "assets/fillers/lets%20pause%20and%20look%20at%20that.mp3", state: "walkthrough", intent: "pause" },
  { text: "Let's see what we have here.", s3Key: "assets/fillers/lets%20see%20what%20we%20have%20here.mp3", state: "walkthrough", intent: "generic" },
];

/**
 * Preloads all filler audio from S3 into memory as Base64 strings.
 */
export async function initializeFillers() {
  cachedFillers.length = 0; // Clear any existing cache

  if (process.env.NODE_ENV === "test") {
    console.log("[FillerService] Test mode detected. Skipping filler preload.");
    return;
  }

  console.log(`[FillerService] Preloading ${FILLER_DEFINITIONS.length} fillers from S3...`);

  for (const def of FILLER_DEFINITIONS) {
    try {
      const decodedKey = decodeURIComponent(def.s3Key);
      const buffer = await getObjectFromS3(decodedKey);
      cachedFillers.push({
        text: def.text,
        audioBase64: buffer.toString("base64"),
        state: def.state as "idle" | "walkthrough",
        intent: def.intent,
      });
    } catch (err: any) {
      if (err && (err.name === "NoSuchKey" || err.Code === "NoSuchKey" || err.$metadata?.httpStatusCode === 404)) {
        console.warn(`[FillerService] ⚠️ Optional filler "${def.text}" not found on S3 (Key: ${def.s3Key}). Skipping.`);
      } else {
        console.error(`[FillerService] Failed to load filler "${def.text}" from S3 key: ${def.s3Key}. Skipping.`, err);
      }
    }
  }

  console.log(`[FillerService] ✅ Preloaded ${cachedFillers.length} fillers into memory.`);
}

/**
 * Checks if the user's transcribed text is a question.
 */
export function isQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.includes("?")) return true;

  const segments = trimmed.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
  const questionRegex = /^(what|how|why|who|when|where|can|could|would|is|are|do|does|did|should|will|has|have|may|tell)\b/i;

  for (const segment of segments) {
    const cleaned = segment.replace(/^(so|well|hey|ok|okay|hi|hello|now|please|regarding|coming to|about)\b\s*,?\s*/i, "");
    if (questionRegex.test(cleaned)) return true;
  }

  const patternRegex = /\b(what should|how (do|can|to)|can (i|you)|is there|are there|how about)\b/i;
  if (patternRegex.test(trimmed)) return true;

  return false;
}

export function cleanupSession(sessionId: string): void {
  lastPlayedFiller.delete(sessionId);
}

/**
 * Selects a filler based on session context and text intent.
 */
export function selectFiller(text: string, sessionId: string, sessionContext: "idle" | "walkthrough"): FillerAudio | null {
  if (process.env.NODE_ENV === "test" || cachedFillers.length === 0) return null;

  let pool: FillerAudio[] = [];

  if (sessionContext === "idle") {
    // For idle state, just pick a random thinking sound
    pool = cachedFillers.filter(f => f.state === "idle");
  } else {
    // For walkthrough state, use keyword matching
    const lowercaseText = text.toLowerCase();
    const candidates: FillerAudio[] = [];

    const findFiller = (intent: string) => cachedFillers.find(f => f.intent === intent && f.state === "walkthrough");

    if (["how", "why", "explain", "reason", "meaning", "what is", "what does", "define", "purpose", "format"].some(kw => lowercaseText.includes(kw))) {
      const f = findFiller("explain"); if (f) candidates.push(f);
    }
    if (["section", "page", "field", "screen", "tab", "where", "go to", "navigate", "button", "click", "select", "input", "dropdown", "box", "type", "customer", "reference", "id", "hotel", "agreement", "issue", "date"].some(kw => lowercaseText.includes(kw))) {
      const f = findFiller("section"); if (f) candidates.push(f);
    }
    if (["check", "find", "status", "search", "lookup", "value", "get", "show", "list"].some(kw => lowercaseText.includes(kw))) {
      const f = findFiller("check"); if (f) candidates.push(f);
    }
    if (["wait", "pause", "stop", "hold on", "hang on", "second", "moment"].some(kw => lowercaseText.includes(kw))) {
      const f = findFiller("pause"); if (f) candidates.push(f);
    }

    pool = candidates.length > 0 ? candidates : cachedFillers.filter(f => f.state === "walkthrough" && f.intent === "generic");
    
    // Fallback if specific walkthrough fillers are missing
    if (pool.length === 0) pool = cachedFillers.filter(f => f.state === "walkthrough");
    if (pool.length === 0) pool = cachedFillers; // Ultimate fallback
  }

  // Apply anti-repetition constraint
  let finalPool = pool;
  const lastText = lastPlayedFiller.get(sessionId);
  if (lastText) {
    const filtered = pool.filter(f => f.text !== lastText);
    if (filtered.length > 0) finalPool = filtered;
  }

  const selected = finalPool[Math.floor(Math.random() * finalPool.length)];

  if (sessionId && selected) {
    lastPlayedFiller.set(sessionId, selected.text);
  }

  return selected;
}

