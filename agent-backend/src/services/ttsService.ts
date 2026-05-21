import { synthesize } from "./elevenLabsTTS.js";

export async function synthesizeToBase64(
  text: string,
  languageCode: string
): Promise<string> {
  const audioDataUrl = await synthesize(text, languageCode);
  return audioDataUrl.split(",")[1];
}
