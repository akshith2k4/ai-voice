import crypto from "crypto";
import { checkS3ObjectExists, uploadToS3 } from "./s3Service.js";
import { synthesizeStream } from "./ttsService.js";

const STATIC_PHRASES = [
  "Sorry, I had trouble hearing you. Please try again.",
  "I didn't catch that, could you repeat?",
  "Sorry, I'm having trouble connecting right now. Please try again.",
  "I'm having trouble understanding. Could you try again?",
  "Something went wrong. Please try again."
];

function getHash(text: string, lang: string): string {
  const normalized = text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return crypto.createHash("md5").update(`${normalized}_${lang}`).digest("hex");
}

export async function preloadStaticAudio(lang = "en"): Promise<void> {
  console.log("[Preloader] Checking/preloading static audio phrases...");
  for (const text of STATIC_PHRASES) {
    const hash = getHash(text, lang);
    const s3Key = `walkthrough-audio/${hash}.mp3`;
    try {
      const exists = await checkS3ObjectExists(s3Key);
      if (!exists) {
        console.log(`[Preloader] Pre-uploading static audio: "${text}"`);
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          synthesizeStream(text, lang, (base64Chunk, isDone) => {
            if (base64Chunk) {
              chunks.push(Buffer.from(base64Chunk, "base64"));
            }
            if (isDone) {
              if (chunks.length > 0) {
                const buf = Buffer.concat(chunks);
                uploadToS3(s3Key, buf, "audio/mpeg")
                  .then(() => {
                    console.log(`[Preloader] Successfully uploaded static audio for "${text}"`);
                    resolve();
                  })
                  .catch(e => {
                    console.warn(`[Preloader] S3 upload failed for static audio:`, e);
                    reject(e);
                  });
              } else {
                resolve();
              }
            }
          }).catch(reject);
        });
      } else {
        console.log(`[Preloader] Static audio already exists in S3 for: "${text}"`);
      }
    } catch (err) {
      console.warn(`[Preloader] Error checking/preloading static audio for "${text}":`, err);
    }
  }
}
