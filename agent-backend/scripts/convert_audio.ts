import { mkdirSync, existsSync, readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = join(__dirname, "../voicefiles");
const destDir = join(__dirname, "../voicefiles_mp3");
const schemasDir = join(__dirname, "../src/schema/forms");

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getHash(text: string, languageCode: string = "en"): string {
  const normalized = normalizeText(text);
  return crypto.createHash("md5").update(`${normalized}_${languageCode}`).digest("hex");
}

interface WalkthroughPrompt {
  text: string;
  formId: string;
  type: "overview" | "wrapUp" | "field" | "subform_intro" | "subform_multiple" | "copy_explanation" | "copy_checkbox" | "subform_field" | "standard";
  fieldKey?: string;
  subFormId?: string;
}

// 1. Gather all walkthrough prompts from schemas
const prompts: WalkthroughPrompt[] = [];

if (existsSync(schemasDir)) {
  const schemaFiles = readdirSync(schemasDir).filter(f => f.endsWith(".json"));
  for (const file of schemaFiles) {
    try {
      const content = readFileSync(join(schemasDir, file), "utf-8");
      const schema = JSON.parse(content);
      const formId = schema.id;

      if (!formId) continue;

      if (schema.overview) {
        prompts.push({ text: schema.overview, formId, type: "overview" });
      }
      if (schema.wrapUp) {
        prompts.push({ text: schema.wrapUp, formId, type: "wrapUp" });
      }

      if (Array.isArray(schema.fields)) {
        for (const field of schema.fields) {
          if (field.explanation) {
            prompts.push({ text: field.explanation, formId, type: "field", fieldKey: field.key });
          }
          if (field.emptyMessage) {
            prompts.push({ text: field.emptyMessage, formId, type: "field", fieldKey: field.key });
          }
        }
      }

      if (Array.isArray(schema.subForms)) {
        for (const subForm of schema.subForms) {
          if (subForm.explanation) {
            prompts.push({ text: subForm.explanation, formId, type: "subform_intro", subFormId: subForm.id });
          }
          if (subForm.explanationForMultiple) {
            prompts.push({ text: subForm.explanationForMultiple, formId, type: "subform_multiple", subFormId: subForm.id });
          }
          if (subForm.copyFrom) {
            prompts.push({
              text: subForm.copyFrom.copyExplanation || `These items can be copied from ${subForm.copyFrom.subFormId}.`,
              formId,
              type: "copy_explanation",
              subFormId: subForm.id
            });
            prompts.push({
              text: "I've checked the copy option to automatically copy items.",
              formId,
              type: "copy_checkbox",
              subFormId: subForm.id
            });
          }
          if (Array.isArray(subForm.fields)) {
            for (const field of subForm.fields) {
              if (field.explanation) {
                prompts.push({ text: field.explanation, formId, type: "subform_field", subFormId: subForm.id, fieldKey: field.key });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`Failed to parse schema file ${file}:`, err);
    }
  }
}

// 2. Add standard static messages from the walkthrough driver
const standardMessages = [
  "A walkthrough is already in progress. Say 'cancel' to stop it first.",
  "I'll clear the demo data now.",
  "This field is read-only. It gets filled automatically when you save.",
  "This field was already filled automatically for you.",
  "I'll skip filling this field — no demo value is configured.",
  "The products have been loaded automatically based on the customer's agreement.",
  "I'm having trouble with this form. The walkthrough will stop now. Please try again later.",
  "I had trouble with the customer field. I'll skip it and continue."
];

for (const msg of standardMessages) {
  prompts.push({ text: msg, formId: "createOrder", type: "standard" });
}

// Helper to check if a prompt matches a filename using keyword rules
function matchPrompt(prompt: WalkthroughPrompt, filename: string): boolean {
  const normFile = filename.toLowerCase();

  // Handle standard messages first
  if (prompt.type === "standard") {
    if (prompt.text.includes("clear the demo data") && normFile.includes("clear_demo")) return true;
    if (prompt.text.includes("read-only") && normFile.includes("readonly")) return true;
    if (prompt.text.includes("loaded automatically") && (normFile.includes("auto_populated") || normFile.includes("auto_populate"))) return true;
    if (prompt.text.includes("no demo value") && normFile.includes("nodemo")) return true;
    if (prompt.text.includes("having trouble with this form") && normFile.includes("abort")) return true;
    if (prompt.text.includes("had trouble with the customer field") && normFile.includes("errors_skip")) return true;
    return false;
  }

  // Check form context match
  const formPart = prompt.formId.toLowerCase().replace("create", ""); // "order", "hotel", "agreement"
  const isFormMatch = normFile.includes(formPart) || (formPart === "order" && normFile.includes("orders"));
  if (!isFormMatch) return false;

  // Overview & WrapUp
  if (prompt.type === "overview" && normFile.includes("overview")) return true;
  if (prompt.type === "wrapUp" && (normFile.includes("wrapup") || normFile.includes("wrap_up"))) return true;

  // Subform intro & multiple item transition
  if (prompt.type === "subform_intro") {
    const subFormPart = prompt.subFormId!.toLowerCase();
    if (subFormPart.includes("delivery") && normFile.includes("subform_introduction")) return true;
    if (subFormPart.includes("pickup") && normFile.includes("pickup_subform")) return true;
    if (subFormPart.includes("rental") && normFile.includes("rentalitem_introduction")) return true;
    if (subFormPart.includes("wash") && normFile.includes("washitems_introduction")) return true;
  }

  if (prompt.type === "subform_multiple") {
    const subFormPart = prompt.subFormId!.toLowerCase();
    if (subFormPart.includes("delivery") && normFile.includes("multiple_item_transitions")) return true;
    if (subFormPart.includes("pickup") && normFile.includes("pickup_multiple")) return true;
  }

  if (prompt.type === "copy_explanation" && normFile.includes("pickup_copy")) return true;
  if (prompt.type === "copy_checkbox" && (normFile.includes("pickup_checkbox") || normFile.includes("copyoption"))) return true;

  // Fields (general)
  if (prompt.type === "field") {
    const key = prompt.fieldKey!.toLowerCase();
    const keyNorm = key.replace("order", ""); // "referenceid", "date", "type", "customer", etc.
    if (keyNorm === "referenceid" && normFile.includes("referenceid")) return true;
    if (keyNorm === "customer" && normFile.includes("customer")) return true;
    if (keyNorm === "date" && normFile.includes("order_date")) return true;
    if (keyNorm === "type" && normFile.includes("order_type")) return true;
    if (keyNorm === "isadjustment" && normFile.includes("adjustment")) return true;
    if (keyNorm === "deliverytype" && normFile.includes("delivery_type")) return true;
    if (keyNorm === "pickupdate" && normFile.includes("pickup_date")) return true;
    if (keyNorm === "deliverydate" && normFile.includes("delivery_date") && !normFile.includes("pickup")) return true;
  }

  // Subform fields
  if (prompt.type === "subform_field") {
    const subFormPart = prompt.subFormId!.toLowerCase();
    const key = prompt.fieldKey!.toLowerCase();
    if (subFormPart.includes("delivery")) {
      if (key === "product" && normFile.includes("subform_product")) return true;
      if (key === "quantity" && normFile.includes("subform_quantity") && !normFile.includes("pickup") && !normFile.includes("rental") && !normFile.includes("wash")) return true;
      if (key === "remarks" && normFile.includes("remarks") && !normFile.includes("pickup")) return true;
    }
    if (subFormPart.includes("pickup")) {
      if (key === "product" && normFile.includes("pickupitem_product")) return true;
      if (key === "quantity" && normFile.includes("pickup_quantity")) return true;
      if (key === "remarks" && normFile.includes("pickupitem_remarks")) return true;
    }
    if (subFormPart.includes("rental")) {
      if (key === "product" && normFile.includes("rentalitem_product")) return true;
      if (key === "quantity" && normFile.includes("rentalitem_quantity")) return true;
      if (key === "rentalduration" && normFile.includes("rentalduraiton")) return true;
    }
    if (subFormPart.includes("wash")) {
      if (key === "product" && normFile.includes("washitem_product")) return true;
      if (key === "quantity" && normFile.includes("washitem_quantity")) return true;
    }
  }

  return false;
}

// 3. Match and convert files
console.log(`Starting dynamic hashed PCM conversion...`);
console.log(`Source: ${srcDir}`);
console.log(`Destination: ${destDir}`);

if (!existsSync(srcDir)) {
  console.error(`Source directory not found: ${srcDir}`);
  process.exit(1);
}

const files = readdirSync(srcDir).filter(f => f.endsWith(".mp3"));
console.log(`Found ${files.length} MP3 files on disk.`);

let successCount = 0;
const unmatchedFiles: string[] = [];

for (const file of files) {
  let matchedPrompt: WalkthroughPrompt | null = null;
  for (const prompt of prompts) {
    if (matchPrompt(prompt, file)) {
      matchedPrompt = prompt;
      break;
    }
  }

  if (!matchedPrompt) {
    console.warn(`[Warning] No match found for file: ${file}`);
    unmatchedFiles.push(file);
    continue;
  }

  const hashName = getHash(matchedPrompt.text, "en");
  const srcPath = join(srcDir, file);
  const destPath = join(destDir, `${hashName}.mp3`);

  console.log(`Converting ${file} -> ${hashName}.mp3 (Type: ${matchedPrompt.type}, Key: ${matchedPrompt.fieldKey || matchedPrompt.subFormId || "none"})`);
  try {
    execSync(`ffmpeg -y -i "${srcPath}" -c:a libmp3lame -ar 44100 -ac 1 -q:a 5 "${destPath}"`, { stdio: "ignore" });
    successCount++;
  } catch (err) {
    console.error(`Failed to convert ${file}:`, err);
  }
}

console.log("\n-----------------------------------------");
console.log(`Conversion completed!`);
console.log(`Successfully matched and converted: ${successCount} / ${files.length} files.`);
if (unmatchedFiles.length > 0) {
  console.log(`Unmatched files (${unmatchedFiles.length}):`);
  for (const f of unmatchedFiles) {
    console.log(`  - ${f}`);
  }
}
console.log("-----------------------------------------\n");
