import { synthesizeStream } from "./elevenLabsTTS.js";

/*
import { synthesize } from "./elevenLabsTTS.js";

export async function synthesizeToBase64(
  text: string,
  languageCode: string,
  sessionId?: string
): Promise<string> {
  const audioDataUrl = await synthesize(text, languageCode, sessionId);
  return audioDataUrl.split(",")[1];
}
*/

export { synthesizeStream };
