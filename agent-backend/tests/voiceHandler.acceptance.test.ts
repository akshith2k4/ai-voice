import { describe, test, expect, mock, beforeEach } from "bun:test";

// --- Mock setup (before imports) ---

const mockTranscribeAudio = mock(async (audio: string) => ({
  text: "hello world",
  languageCode: "en",
  confidence: 0.95,
}));

const mockSynthesizeToBase64 = mock(async (text: string, lang: string) => {
  return "aGVsbG8=";
});

const mockOrchestrate = mock(async (text: string, sessionId: string, lang?: string) => ({
  toolCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
  rawContent: null as string | null,
}));

const mockOrchestrateStream = mock(async function* (text: string, sessionId: string, lang?: string) {
  const res = await mockOrchestrate(text, sessionId, lang);
  if (res.rawContent) {
    yield { type: "text", text: res.rawContent };
  }
  for (const tc of res.toolCalls) {
    yield { type: "tool_call", toolCall: tc };
  }
  return res;
});

const mockDriverStart = mock((formId: string, sessionId: string) => {});
const mockGetSession = mock((sessionId: string) => null as any);

const mockSynthesizeStream = mock(async (text: string, lang: string, onChunk: (base64: string, done: boolean) => void) => {
  const base64 = await mockSynthesizeToBase64(text, lang);
  onChunk(base64, true);
});

mock.module("../src/services/sttService.js", () => ({
  transcribeAudio: mockTranscribeAudio,
  getRetryCount: mock(() => 0),
  incrementRetry: mock((sid: string) => 1),
  resetRetry: mock(() => {}),
  getMaxRetries: mock(() => 2),
  handleAudioChunk: mock(async () => {}),
  handleAudioEnd: mock(async () => ({
    text: "hello world",
    languageCode: "en",
    confidence: 0.95,
  })),
  onSpeechDetected: mock(() => {}),
}));

mock.module("../src/services/ttsService.js", () => ({
  synthesizeToBase64: mockSynthesizeToBase64,
  synthesizeStream: mockSynthesizeStream,
}));

mock.module("../llm/orchestrator.js", () => ({
  orchestrate: mockOrchestrate,
  orchestrateStream: mockOrchestrateStream,
}));

mock.module("../src/walkthrough/driver.js", () => ({
  walkthroughDriver: {
    start: mockDriverStart,
    getSession: mockGetSession,
  },
}));

// --- Import after mocks ---
const { handleVoice } = await import("../src/handlers/voiceHandler.js");
const sttService = await import("../src/services/sttService.js");

function createCtx(overrides?: Record<string, unknown>) {
  const sent: any[] = [];
  return {
    sessionId: "test-session-1",
    send: (msg: any) => sent.push(msg),
    sent,
    ...overrides,
  };
}

function resetAllMocks() {
  mockTranscribeAudio.mockReset();
  mockSynthesizeToBase64.mockReset();
  mockSynthesizeStream.mockReset();
  mockOrchestrate.mockReset();
  mockOrchestrateStream.mockReset();
  mockDriverStart.mockReset();
  mockGetSession.mockReset();

  mockTranscribeAudio.mockImplementation(async () => ({
    text: "hello world",
    languageCode: "en",
    confidence: 0.95,
  }));
  mockSynthesizeToBase64.mockImplementation(async () => "aGVsbG8=");
  mockSynthesizeStream.mockImplementation(async (text: string, lang: string, onChunk: (base64: string, done: boolean) => void) => {
    const base64 = await mockSynthesizeToBase64(text, lang);
    onChunk(base64, true);
  });
  mockOrchestrate.mockImplementation(async () => ({
    toolCalls: [],
    rawContent: null,
  }));
  mockOrchestrateStream.mockImplementation(async function* (text: string, sessionId: string, lang?: string) {
    const res = await mockOrchestrate(text, sessionId, lang);
    if (res.rawContent) {
      yield { type: "text", text: res.rawContent };
    }
    for (const tc of res.toolCalls) {
      yield { type: "tool_call", toolCall: tc };
    }
    return res;
  });

  // Reset the real sttService retry counts by re-importing (sttService is already mocked)
  // We need to track retry behavior through the mocked sttService
}

// Track retry counts per session since sttService is mocked
const sessionRetries = new Map<string, number>();

function makeRetryMock() {
  sessionRetries.clear();

  // Override the mocked sttService functions for retry tests
  const mod = sttService as any;
  mod.incrementRetry.mockImplementation((sid: string) => {
    const count = (sessionRetries.get(sid) || 0) + 1;
    sessionRetries.set(sid, count);
    return count;
  });
  mod.getRetryCount.mockImplementation((sid: string) => {
    return sessionRetries.get(sid) || 0;
  });
  mod.resetRetry.mockImplementation((sid: string) => {
    sessionRetries.set(sid, 0);
  });
  mod.getMaxRetries.mockImplementation(() => 2);
}

describe("VoiceHandler — acceptance tests", () => {
  beforeEach(() => {
    resetAllMocks();
    makeRetryMock();
  });

  // =============================================
  // CONTRACT 1: test: fast path
  // =============================================
  describe("test: fast path", () => {
    test("text starting with 'test:' calls walkthroughDriver.start directly", async () => {
      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "test:createOrder" }, ctx as any);

      expect(mockDriverStart).toHaveBeenCalledTimes(1);
      expect(mockDriverStart).toHaveBeenCalledWith("createOrder", "test-session-1", false);
    });

    test("test: path does not call transcribe or orchestrate", async () => {
      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "test:myForm" }, ctx as any);

      expect(mockTranscribeAudio).not.toHaveBeenCalled();
      expect(mockOrchestrate).not.toHaveBeenCalled();
    });

    test("test: trims whitespace from formId", async () => {
      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "test:  createHotel  " }, ctx as any);

      expect(mockDriverStart).toHaveBeenCalledWith("createHotel", "test-session-1", false);
    });
  });

  // =============================================
  // CONTRACT 2: text path
  // =============================================
  describe("text path (no audio)", () => {
    test("plain text goes to orchestrate without STT", async () => {
      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [],
        rawContent: "Hello there!",
      }));
      mockSynthesizeToBase64.mockImplementation(async () => "dGVzdA==");

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "navigate to orders" }, ctx as any);

      expect(mockTranscribeAudio).not.toHaveBeenCalled();
      expect(mockOrchestrate).toHaveBeenCalledWith("navigate to orders", "test-session-1", undefined);
    });

    test("text path sends rawContent as respond with TTS when no tool calls", async () => {
      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [],
        rawContent: "I can help with that.",
      }));
      mockSynthesizeToBase64.mockImplementation(async () => "dGVzdA==");

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "help" }, ctx as any);

      const respondMsgs = ctx.sent.filter(
        (m: any) => m.type === "tool" && m.tool === "respond"
      );
      expect(respondMsgs.length).toBeGreaterThanOrEqual(1);
      const last = respondMsgs[respondMsgs.length - 1];
      expect(last.args.message).toBe("I can help with that.");
      expect(last.args.tts).toBe(true);
      expect(last.args.messageId).toBeDefined();
    });
  });

  // =============================================
  // CONTRACT 3: audio path → STT → echo → handleText
  // =============================================
  describe("audio path", () => {
    test("audio is transcribed, echoed with tts:false, then orchestrated", async () => {
      mockTranscribeAudio.mockImplementation(async () => ({
        text: "show me the orders",
        languageCode: "en",
        confidence: 0.9,
      }));
      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [{ name: "navigate", args: { route: "/orders" } }],
        rawContent: null,
      }));

      const ctx = createCtx();
      await handleVoice({ type: "voice", audio: "base64audio" }, ctx as any);

      expect(mockTranscribeAudio).toHaveBeenCalledWith("base64audio");

      // Echo message
      const echoMsg = ctx.sent.find(
        (m: any) =>
          m.type === "tool" &&
          m.tool === "respond" &&
          m.args.message?.startsWith('You said:')
      );
      expect(echoMsg).toBeDefined();
      expect(echoMsg.args.tts).toBe(false);
      expect(echoMsg.args.message).toBe('You said: "show me the orders"');

      // Orchestrator called with transcribed text and language code
      expect(mockOrchestrate).toHaveBeenCalledWith("show me the orders", "test-session-1", "en");
    });

    test("silence when no audio and no text", async () => {
      const ctx = createCtx();
      await handleVoice({ type: "voice" }, ctx as any);

      expect(mockTranscribeAudio).not.toHaveBeenCalled();
      expect(mockOrchestrate).not.toHaveBeenCalled();
      expect(ctx.sent).toHaveLength(0);
    });
  });

  // =============================================
  // CONTRACT 4: empty STT retry logic
  // =============================================
  describe("empty STT retry", () => {
    test("sends 'I didn't catch that' on first empty transcription", async () => {
      mockTranscribeAudio.mockImplementation(async () => ({
        text: "",
        languageCode: "en",
        confidence: 0,
      }));

      const ctx = createCtx();
      await handleVoice({ type: "voice", audio: "base64audio" }, ctx as any);

      expect(ctx.sent).toHaveLength(1);
      expect(ctx.sent[0].args.message).toBe("I didn't catch that, could you repeat?");
      expect(ctx.sent[0].args.tts).toBe(true);
    });

    test("sends retry prompt on second empty transcription", async () => {
      mockTranscribeAudio.mockImplementation(async () => ({
        text: "",
        languageCode: "en",
        confidence: 0,
      }));

      const sid = "retry-session";
      const ctx1 = createCtx({ sessionId: sid });
      await handleVoice({ type: "voice", audio: "a1" }, ctx1 as any);
      expect(ctx1.sent).toHaveLength(1);

      const ctx2 = createCtx({ sessionId: sid });
      await handleVoice({ type: "voice", audio: "a2" }, ctx2 as any);
      expect(ctx2.sent).toHaveLength(1);
      expect(ctx2.sent[0].args.message).toBe("I didn't catch that, could you repeat?");
    });

    test("stops retrying after MAX_EMPTY_RETRIES (2) and resets", async () => {
      mockTranscribeAudio.mockImplementation(async () => ({
        text: "",
        languageCode: "en",
        confidence: 0,
      }));

      const sid = "max-retry-session";

      const ctx1 = createCtx({ sessionId: sid });
      await handleVoice({ type: "voice", audio: "a1" }, ctx1 as any);
      expect(ctx1.sent).toHaveLength(1);

      const ctx2 = createCtx({ sessionId: sid });
      await handleVoice({ type: "voice", audio: "a2" }, ctx2 as any);
      expect(ctx2.sent).toHaveLength(1);

      // Third empty — should NOT send anything (resets counter silently)
      const ctx3 = createCtx({ sessionId: sid });
      await handleVoice({ type: "voice", audio: "a3" }, ctx3 as any);
      expect(ctx3.sent).toHaveLength(0);
    });

    test("retry count resets on successful transcription", async () => {
      const sid = "reset-retry-session";

      // First call: empty
      mockTranscribeAudio.mockImplementationOnce(async () => ({
        text: "",
        languageCode: "en",
        confidence: 0,
      }));
      const ctx1 = createCtx({ sessionId: sid });
      await handleVoice({ type: "voice", audio: "a1" }, ctx1 as any);
      expect(ctx1.sent).toHaveLength(1);

      // Second call: success — resets counter
      mockTranscribeAudio.mockImplementationOnce(async () => ({
        text: "hello",
        languageCode: "en",
        confidence: 0.9,
      }));
      mockOrchestrate.mockImplementationOnce(async () => ({
        toolCalls: [],
        rawContent: "Hi!",
      }));
      const ctx2 = createCtx({ sessionId: sid });
      await handleVoice({ type: "voice", audio: "a2" }, ctx2 as any);
      expect(ctx2.sent.length).toBeGreaterThanOrEqual(1);

      // Third call: empty again — counter should be at 1 (not 3)
      mockTranscribeAudio.mockImplementationOnce(async () => ({
        text: "",
        languageCode: "en",
        confidence: 0,
      }));
      const ctx3 = createCtx({ sessionId: sid });
      await handleVoice({ type: "voice", audio: "a3" }, ctx3 as any);
      expect(ctx3.sent).toHaveLength(1);
      expect(ctx3.sent[0].args.message).toBe("I didn't catch that, could you repeat?");
    });
  });

  // =============================================
  // CONTRACT 5: tool call dispatch
  // =============================================
  describe("tool call dispatch", () => {
    test("navigate tool sends navigate message", async () => {
      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [{ name: "navigate", args: { route: "/orders" } }],
        rawContent: null,
      }));

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "go to orders" }, ctx as any);

      const navMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "navigate"
      );
      expect(navMsg).toBeDefined();
      expect(navMsg.args.route).toBe("/orders");
    });

    test("start_walkthrough sends spoken intro with TTS before starting driver", async () => {
      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [
          {
            name: "start_walkthrough",
            args: { formId: "createOrder", message: "Let me show you the order form." },
          },
        ],
        rawContent: null,
      }));
      mockSynthesizeToBase64.mockImplementation(async () => "aW50cm8=");

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "show me orders" }, ctx as any);

      // Should have: respond with tts:true + tts_audio + driver.start
      const respondMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "respond" && m.args.tts === true
      );
      expect(respondMsg).toBeDefined();
      expect(respondMsg.args.message).toBe("Let me show you the order form.");
      expect(respondMsg.args.messageId).toBeDefined();

      const ttsMsg = ctx.sent.find((m: any) => m.type === "tts_audio");
      expect(ttsMsg).toBeDefined();
      expect(ttsMsg.messageId).toBe(respondMsg.args.messageId);

      expect(mockDriverStart).toHaveBeenCalledWith("createOrder", "test-session-1");

      // Verify order: respond BEFORE driver.start
      const respondIdx = ctx.sent.indexOf(respondMsg);
      const ttsIdx = ctx.sent.indexOf(ttsMsg);
      expect(ttsIdx).toBe(respondIdx + 1);
    });

    test("answer_question sends respond with TTS", async () => {
      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [
          { name: "answer_question", args: { response: "Orders are at /orders." } },
        ],
        rawContent: null,
      }));
      mockSynthesizeToBase64.mockImplementation(async () => "YW5zd2Vy");

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "where are orders" }, ctx as any);

      const respondMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "respond"
      );
      expect(respondMsg).toBeDefined();
      expect(respondMsg.args.message).toBe("Orders are at /orders.");
      expect(respondMsg.args.tts).toBe(true);
      expect(respondMsg.args.messageId).toBeDefined();

      const ttsMsg = ctx.sent.find((m: any) => m.type === "tts_audio");
      expect(ttsMsg).toBeDefined();
      expect(ttsMsg.messageId).toBe(respondMsg.args.messageId);
    });

    test("ask_clarification sends respond with TTS", async () => {
      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [
          { name: "ask_clarification", args: { message: "Which form do you mean?" } },
        ],
        rawContent: null,
      }));
      mockSynthesizeToBase64.mockImplementation(async () => "Y2xhcg==");

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "show me the form" }, ctx as any);

      const respondMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "respond"
      );
      expect(respondMsg).toBeDefined();
      expect(respondMsg.args.message).toBe("Which form do you mean?");
      expect(respondMsg.args.tts).toBe(true);

      const ttsMsg = ctx.sent.find((m: any) => m.type === "tts_audio");
      expect(ttsMsg).toBeDefined();
    });

    test("rawContent fallback sends respond with TTS when no tool calls", async () => {
      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [],
        rawContent: "I'm not sure how to help with that.",
      }));
      mockSynthesizeToBase64.mockImplementation(async () => "ZmFsbGJhY2s=");

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "do something weird" }, ctx as any);

      const respondMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "respond"
      );
      expect(respondMsg).toBeDefined();
      expect(respondMsg.args.message).toBe("I'm not sure how to help with that.");
      expect(respondMsg.args.tts).toBe(true);

      const ttsMsg = ctx.sent.find((m: any) => m.type === "tts_audio");
      expect(ttsMsg).toBeDefined();
    });
  });

  // =============================================
  // CONTRACT 6: TTS matching
  // =============================================
  describe("TTS messageId matching", () => {
    test("respond with tts:true always has matching tts_audio messageId", async () => {
      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [
          { name: "answer_question", args: { response: "Test answer" } },
        ],
        rawContent: null,
      }));
      mockSynthesizeToBase64.mockImplementation(async () => "dGVzdA==");

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "test?" }, ctx as any);

      const respondMsgs = ctx.sent.filter(
        (m: any) => m.type === "tool" && m.tool === "respond" && m.args.tts === true
      );
      const ttsMsgs = ctx.sent.filter((m: any) => m.type === "tts_audio");

      expect(respondMsgs.length).toBe(ttsMsgs.length);
      for (const rm of respondMsgs) {
        const matching = ttsMsgs.find((t: any) => t.messageId === rm.args.messageId);
        expect(matching).toBeDefined();
      }
    });
  });

  // =============================================
  // CONTRACT 7: TTS failure handling
  // =============================================
  describe("TTS failure handling", () => {
    test("TTS failure does not prevent respond message from being sent", async () => {
      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [
          { name: "answer_question", args: { response: "This will fail TTS" } },
        ],
        rawContent: null,
      }));
      mockSynthesizeToBase64.mockRejectedValue(new Error("TTS API down"));

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "test?" }, ctx as any);

      const respondMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "respond"
      );
      expect(respondMsg).toBeDefined();
      expect(respondMsg.args.message).toBe("This will fail TTS");

      const ttsMsg = ctx.sent.find((m: any) => m.type === "tts_audio");
      expect(ttsMsg).toBeUndefined();
    });
  });

  // =============================================
  // CONTRACT 8: STT error handling
  // =============================================
  describe("STT error handling", () => {
    test("STT error sends error message with TTS", async () => {
      mockTranscribeAudio.mockRejectedValue(new Error("STT API down"));

      const ctx = createCtx();
      await handleVoice({ type: "voice", audio: "base64audio" }, ctx as any);

      expect(ctx.sent).toHaveLength(1);
      expect(ctx.sent[0].type).toBe("tool");
      expect(ctx.sent[0].tool).toBe("respond");
      expect(ctx.sent[0].args.message).toBe(
        "Sorry, I had trouble hearing you. Please try again."
      );
      expect(ctx.sent[0].args.tts).toBe(true);
    });
  });

  // =============================================
  // CONTRACT 9: Detours & Resumption
  // =============================================
  describe("Detours and Resumption", () => {
    test("detour_to_field transitions state and sends tool calls", async () => {
      const mockSMTransition = mock((state: string) => {});
      const mockSession = {
        sessionId: "test-session-1",
        schema: {
          fields: [
            { key: "customer", label: "Customer", explanation: "Select the customer name" },
          ],
          subForms: [],
        },
        stateMachine: {
          currentState: "FIELD_EXPLAIN",
          currentContext: { fieldIndex: 0 },
          transition: mockSMTransition,
        },
      };
      mockGetSession.mockReturnValue(mockSession);

      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [
          { name: "detour_to_field", args: { fieldKey: "customer" } },
        ],
        rawContent: null,
      }));
      mockSynthesizeToBase64.mockImplementation(async () => "ZGV0b3Vy");

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "what is customer field?" }, ctx as any);

      expect(mockSMTransition).toHaveBeenCalledWith("DETOUR");

      const detourStartMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "detour_start"
      );
      expect(detourStartMsg).toBeDefined();
      expect(detourStartMsg.args.fieldKey).toBe("customer");

      const goToFieldMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "go_to_field"
      );
      expect(goToFieldMsg).toBeDefined();
      expect(goToFieldMsg.args.fieldKey).toBe("customer");
      expect(goToFieldMsg.args.label).toBe("Customer");

      const respondMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "respond"
      );
      expect(respondMsg).toBeDefined();
      expect(respondMsg.args.message).toBe("Select the customer name");
      expect(respondMsg.args.tts).toBe(true);
    });

    test("resume_walkthrough transitions state and returns to original field", async () => {
      const mockSMTransition = mock((state: string) => {});
      const mockSession = {
        sessionId: "test-session-1",
        schema: {
          fields: [
            { key: "customer", label: "Customer", explanation: "Select the customer name" },
          ],
          subForms: [],
        },
        stateMachine: {
          currentState: "DETOUR_QA",
          currentContext: { fieldIndex: 0 },
          transition: mockSMTransition,
        },
      };
      mockGetSession.mockReturnValue(mockSession);

      mockOrchestrate.mockImplementation(async () => ({
        toolCalls: [
          { name: "resume_walkthrough", args: {} },
        ],
        rawContent: null,
      }));
      mockSynthesizeToBase64.mockImplementation(async () => "cmVzdW1l");

      const ctx = createCtx();
      await handleVoice({ type: "voice", text: "continue" }, ctx as any);

      expect(mockSMTransition).toHaveBeenCalledWith("DETOUR_COMPLETE");

      const detourEndMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "detour_end"
      );
      expect(detourEndMsg).toBeDefined();

      const goToFieldMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "go_to_field"
      );
      expect(goToFieldMsg).toBeDefined();
      expect(goToFieldMsg.args.fieldKey).toBe("customer");

      const respondMsg = ctx.sent.find(
        (m: any) => m.type === "tool" && m.tool === "respond"
      );
      expect(respondMsg).toBeDefined();
      expect(respondMsg.args.message).toContain("Returning to our walkthrough");
    });
  });
});

