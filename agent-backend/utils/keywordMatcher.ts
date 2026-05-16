// ============================================
// Keyword Matcher
// Detects continue/pause/cancel without LLM
// Saves ~300-500ms per interaction
// ============================================

export type KeywordAction = "resume" | "pause" | "cancel" | null;

const KEYWORD_MAP: { keywords: string[]; action: KeywordAction }[] = [
  {
    keywords: [
      "continue",
      "ok",
      "resume",
      "go on",
      "go ahead",
      "yes",
      "yeah",
      "proceed",
      "next",
      "keep going",
    ],
    action: "resume",
  },
  {
    keywords: ["wait", "hold on", "pause", "stop there", "hold up"],
    action: "pause",
  },
  {
    keywords: [
      "cancel",
      "stop",
      "close",
      "quit",
      "never mind",
      "nevermind",
      "end",
    ],
    action: "cancel",
  },
];

/**
 * Check if the transcribed text matches a known keyword command.
 * Returns the action if matched, null otherwise.
 * Only matches if the ENTIRE text is a keyword (or very close to one).
 */
export function matchKeyword(text: string): KeywordAction {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return null;

  for (const { keywords, action } of KEYWORD_MAP) {
    // Exact match
    if (keywords.includes(normalized)) {
      return action;
    }

    // Starts with keyword (e.g., "continue please" → resume)
    for (const keyword of keywords) {
      if (normalized.startsWith(keyword)) {
        const rest = normalized.slice(keyword.length).trim();
        if (
          rest.length === 0 ||
          ["please", "yeah", "yes", "now"].includes(rest)
        ) {
          return action;
        }
      }
    }
  }

  return null;
}
