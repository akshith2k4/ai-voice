import { describe, test, expect, mock } from "bun:test";

const mockSchemaJson = {
  id: "testMultilingual",
  name: "Test Multilingual Form",
  route: "/test-multilingual",
  setupSteps: [
    {
      tool: "navigate",
      args: { route: "/test-multilingual" }
    }
  ],
  overview: "Flat English overview.",
  nodes: [
    {
      nodeType: "field",
      key: "name",
      label: "Name",
      type: "text",
      demoValue: "test",
      explanation: {
        en: "Explain in English",
        hi: "Explain in Hindi"
      },
      commonQuestions: [
        {
          question: "Question 1",
          answer: "Flat answer"
        }
      ]
    }
  ],
  wrapUp: {
    en: "Wrap English",
    hi: "Wrap Hindi"
  }
};

// Mock fs before importing the schema loader
mock.module("fs", () => {
  const original = require("fs");
  return {
    ...original,
    existsSync: (path: string) => {
      if (path === "/dummy/dir") return true;
      return original.existsSync(path);
    },
    readdirSync: (path: string, options: any) => {
      if (path === "/dummy/dir") return ["testMultilingual.json"];
      return original.readdirSync(path, options);
    },
    readFileSync: (path: string, options: any) => {
      if (typeof path === "string" && path.endsWith("testMultilingual.json")) {
        return JSON.stringify(mockSchemaJson);
      }
      return original.readFileSync(path, options);
    }
  };
});

// Import after mock setup
import { loadAllSchemas, getSchema } from "../src/schema/loader.js";
import { buildWalkthroughPrompt } from "../llm/prompts.js";
import { OpenAISTT } from "../src/services/providers/openAiSTT.js";

describe("Multi-Language Integration Tests", () => {
  test("Schema loader normalizes flat strings and keeps language objects", () => {
    loadAllSchemas("/dummy/dir");
    const schema = getSchema("testMultilingual");

    // Overview should be normalized to an object containing at least "en"
    expect(schema.overview).toBeTypeOf("object");
    expect(schema.overview.en).toBe("Flat English overview.");

    // wrapUp should remain as specified
    expect(schema.wrapUp).toBeTypeOf("object");
    expect(schema.wrapUp.en).toBe("Wrap English");
    expect(schema.wrapUp.hi).toBe("Wrap Hindi");

    // Field explanation should remain as object
    const nameField = schema.nodes[0] as any;
    expect(nameField.explanation).toBeTypeOf("object");
    expect(nameField.explanation.en).toBe("Explain in English");
    expect(nameField.explanation.hi).toBe("Explain in Hindi");

    // commonQuestions answer should be normalized
    expect(nameField.commonQuestions[0].answer).toBeTypeOf("object");
    expect(nameField.commonQuestions[0].answer.en).toBe("Flat answer");
  });

  test("Whisper language detection returns mapped code", async () => {
    // Mock global fetch to simulate Whisper API returning verbose_json
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({
        text: "नमस्ते",
        language: "hindi"
      }), { status: 200 });
    }) as any;

    const openAiStt = new OpenAISTT();
    const result = await openAiStt.transcribe(Buffer.from([]));

    expect(result.text).toBe("नमस्ते");
    expect(result.languageCode).toBe("hi");

    // Now test English
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({
        text: "hello",
        language: "english"
      }), { status: 200 });
    }) as any;

    const result2 = await openAiStt.transcribe(Buffer.from([]));
    expect(result2.languageCode).toBe("en");

    globalThis.fetch = originalFetch;
  });

  test("Prompt builder incorporates language rules and correct context translations", () => {
    const testSchema = {
      id: "createOrder",
      name: "Create Order",
      route: "/orders",
      setupSteps: [],
      overview: { en: "English overview", hi: "Hindi overview" },
      nodes: [
        {
          nodeType: "field" as const,
          key: "customer",
          label: "Customer",
          type: "text" as const,
          demoValue: "Acme Corp",
          explanation: { en: "English explanation", hi: "Hindi explanation" },
          commonQuestions: [
            {
              question: "Is it mandatory?",
              answer: { en: "English answer", hi: "Hindi answer" }
            }
          ]
        }
      ],
      wrapUp: { en: "English wrap", hi: "Hindi wrap" }
    } as any;

    const currentField = testSchema.nodes[0];

    // Build prompt for English
    const promptEn = buildWalkthroughPrompt(testSchema, currentField, "en");
    expect(promptEn).toContain("You MUST respond in the following language: en.");
    expect(promptEn).toContain("English explanation");
    expect(promptEn).not.toContain("Hindi explanation");

    // Build prompt for Hindi
    const promptHi = buildWalkthroughPrompt(testSchema, currentField, "hi");
    expect(promptHi).toContain("You MUST respond in the following language: hi.");
    expect(promptHi).toContain("Hindi explanation");
    expect(promptHi).not.toContain("English explanation");
  });
});
