import { readdirSync, mkdirSync, existsSync } from "fs";
import { join, basename, extname, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = join(__dirname, "../voicefiles");
const destDir = join(__dirname, "../voicefiles_pcm");

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

console.log(`Scanning directory: ${srcDir}`);
if (!existsSync(srcDir)) {
  console.error(`Source directory does not exist: ${srcDir}`);
  process.exit(1);
}

const files = readdirSync(srcDir).filter(f => extname(f).toLowerCase() === ".mp3");
console.log(`Found ${files.length} MP3 files to convert...`);

for (const file of files) {
  const srcPath = join(srcDir, file);
  const name = basename(file, extname(file));
  const destPath = join(destDir, `${name}.pcm`);

  console.log(`Converting ${file} -> ${name}.pcm`);
  try {
    // Convert to raw Mono (ac 1), 22050Hz (ar 22050), 16-bit PCM (c:a pcm_s16le, f s16le)
    execSync(`ffmpeg -y -i "${srcPath}" -f s16le -ar 22050 -ac 1 -c:a pcm_s16le "${destPath}"`, { stdio: "ignore" });
  } catch (err) {
    console.error(`Failed to convert ${file}:`, err);
  }
}

console.log("Conversion complete!");
