import dotenv from "dotenv";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { uploadToS3 } from "../src/services/s3Service.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mp3Dir = join(__dirname, "../voicefiles_mp3");
const bucketName = process.env.AWS_S3_BUCKET_NAME;

console.log("=== S3 Walkthrough Audio Upload Script ===");
console.log(`Source Directory: ${mp3Dir}`);
console.log(`Target Bucket: ${bucketName}`);

if (!bucketName) {
  console.error("ERROR: AWS_S3_BUCKET_NAME is not configured in .env!");
  process.exit(1);
}

async function runUpload() {
  if (!existsSync(mp3Dir)) {
    console.error(`ERROR: Directory not found: ${mp3Dir}`);
    process.exit(1);
  }

  const files = readdirSync(mp3Dir).filter((f) => f.endsWith(".mp3"));
  console.log(`Found ${files.length} MP3 files to upload.`);

  let successCount = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = join(mp3Dir, file);
    const key = `walkthrough-audio/${file}`;

    console.log(`[${i + 1}/${files.length}] Uploading ${file} to S3 Key: "${key}"...`);

    try {
      const buffer = readFileSync(filePath);
      await uploadToS3(key, buffer, "audio/mpeg");
      console.log(`  ✅ Successfully uploaded ${file}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ Failed to upload ${file}:`, err);
    }
  }

  console.log("\n-----------------------------------------");
  console.log("Upload Migration Completed!");
  console.log(`Successfully uploaded: ${successCount} / ${files.length} files.`);
  console.log("-----------------------------------------\n");
}

runUpload().catch((err) => {
  console.error("Migration crashed with error:", err);
  process.exit(1);
});
