import fs from "fs";
import path from "path";
import crypto from "crypto";

function getHash(text: string, lang: string): string {
  const normalized = text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return crypto.createHash("md5").update(`${normalized}_${lang}`).digest("hex");
}

const formPath = path.resolve(__dirname, "../src/schema/forms/createOrder.json");
const file = fs.readFileSync(formPath, "utf-8");
const data = JSON.parse(file);

const results: { text: string; lang: string; hash: string }[] = [];
const seenHashes = new Set<string>();

function walk(obj: any) {
  if (!obj || typeof obj !== "object") return;

  if (typeof obj.en === "string") {
    const hash = getHash(obj.en, "en");
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      results.push({ text: obj.en, lang: "en", hash });
    }
  }
  if (typeof obj.hi === "string") {
    const hash = getHash(obj.hi, "hi");
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      results.push({ text: obj.hi, lang: "hi", hash });
    }
  }

  for (const key of Object.keys(obj)) {
    walk(obj[key]);
  }
}

walk(data);

console.log("JSON_HASHES_START");
console.log(JSON.stringify(results, null, 2));
console.log("JSON_HASHES_END");
