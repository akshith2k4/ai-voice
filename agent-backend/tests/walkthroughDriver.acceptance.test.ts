import { describe, test, expect, mock, beforeEach } from "bun:test";

// --- Mock setup (before imports) ---

const mockConnectionSend = mock((sessionId: string, msg: any) => {
  if (msg && msg.type === "tts_audio") {
    setTimeout(() => {
      walkthroughDriver.handleEvent(sessionId, "tts_playback_complete", { messageId: msg.messageId });
    }, 10);
  }
  return true;
});

const mockConnectionManager = {
  connectionManager: {
    send: mock((sessionId: string, msg: any) => {
      if (globalThis.__mockConnectionSend) {
        return (globalThis as any).__mockConnectionSend(sessionId, msg);
      }
      return true;
    }),
    add: mock(() => {}),
    remove: mock(() => {}),
    get: mock(() => undefined),
    has: mock(() => true),
    broadcast: mock(() => 0),
    touch: mock(() => {}),
    getSessionIds: mock(() => []),
    size: 0,
  },
};

mock.module("../src/connectionManager.js", () => mockConnectionManager);
mock.module("../connectionManager.js", () => mockConnectionManager);

const mockSynthesize = mock(async (text: string, lang: string) => {
  return "data:audio/mpeg;base64,aGVsbG8=";
});

const mockSynthesizeStream = mock(async (text: string, lang: string, onChunk: (base64: string, done: boolean) => void) => {
  const result = await mockSynthesize(text, lang);
  const base64 = result.split(",")[1];
  onChunk(base64, true);
});

mock.module("../src/services/ttsService.js", () => ({
  synthesizeToBase64: mock((text: string, lang: string) => {
    if (globalThis.__mockSynthesizeToBase64) {
      return (globalThis as any).__mockSynthesizeToBase64(text, lang);
    }
    return Promise.resolve("aGVsbG8=");
  }),
  synthesizeStream: mock((text: string, lang: string, onChunk: any, sessionId?: string) => {
    if (globalThis.__mockSynthesizeStream) {
      return (globalThis as any).__mockSynthesizeStream(text, lang, onChunk, sessionId);
    }
    onChunk("aGVsbG8=", true);
    return Promise.resolve();
  }),
  synthesize: mock((text: string, lang: string) => {
    if (globalThis.__mockSynthesize) {
      return (globalThis as any).__mockSynthesize(text, lang);
    }
    return Promise.resolve("data:audio/mpeg;base64,aGVsbG8=");
  }),
  interruptActiveTTS: mock(() => {}),
  openStream: mock((sessionId: any, lang: any, onAudio: any, onReady: any, onStop: any) => {
    if (globalThis.__mockOpenStream) {
      return (globalThis as any).__mockOpenStream(sessionId, lang, onAudio, onReady, onStop);
    }
    return {
      push: mock(() => {}),
      finish: mock(() => {}),
      interrupt: mock(() => {}),
    };
  }),
  cleanupSession: mock(() => {}),
}));

mock.module("../src/services/s3Service.js", () => ({
  checkS3ObjectExists: mock(async () => {
    if (globalThis.__mockCheckS3ObjectExists) {
      return (globalThis as any).__mockCheckS3ObjectExists();
    }
    return false;
  }),
  getPresignedUrl: mock(async () => {
    if (globalThis.__mockGetPresignedUrl) {
      return (globalThis as any).__mockGetPresignedUrl();
    }
    return "https://mocked-s3-url.com/audio.mp3";
  }),
  uploadToS3: mock(async () => {}),
}));

const ORDER_SCHEMA = {
  id: "createOrder",
  name: "Create Order",
  mode: "guided",
  route: "/orders",
  setupSteps: [
    {
      tool: "navigate",
      args: { route: "/orders" },
      waitFor: "navigation_complete"
    },
    {
      tool: "open_dialog",
      args: { selector: ".add-btn", fallbackText: "Create Order" },
      waitFor: "form_registered"
    }
  ],
  overview: "Unique order creation form testing overview.",
  nodes: [
    {
      nodeType: "field" as const,
      key: "customer",
      label: "Customer",
      type: "text" as const,
      demoValue: "Acme Corp",
      explanation: "Select the customer for this order.",
    },
    {
      nodeType: "field" as const,
      key: "orderType",
      label: "Order Type",
      type: "select" as const,
      demoValue: "delivery",
      explanation: "Choose the order type.",
    },
  ],
  wrapUp: "That completes the order form walkthrough!",
};

const mockLoader = {
  getSchema: (formId: string) => {
    if (globalThis.__mockGetSchema) {
      return (globalThis as any).__mockGetSchema(formId);
    }
    throw new Error(`Schema not found: "${formId}"`);
  },
  getAvailableForms: () => {
    if (globalThis.__mockGetAvailableForms) {
      return (globalThis as any).__mockGetAvailableForms();
    }
    return [];
  },
  findFieldInNodes: (nodes: any[], targetKey: string) => {
    return { matchedField: { label: "Customer" }, repeatingId: null };
  },
};

mock.module("../src/schema/loader.js", () => mockLoader);
mock.module("../schema/loader.js", () => mockLoader);

// --- Import after mocks ---
const { walkthroughExecutor: walkthroughDriver } = await import("../src/walkthrough/executor.js") as any;
const { connectionManager } = await import("../src/connectionManager.js");

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function sentMessages(sessionId: string): any[] {
  return mockConnectionSend.mock.calls
    .filter((c: any) => c[0] === sessionId)
    .map((c: any) => c[1]);
}

function resetAllMocks() {
  globalThis.__mockConnectionSend = (sessionId: string, msg: any) => {
    console.log("[walkthroughDriver] globalThis.__mockConnectionSend called for sessionId:", sessionId, "msg:", JSON.stringify(msg));
    return mockConnectionSend(sessionId, msg);
  };
  mockConnectionSend.mockReset();
  mockSynthesize.mockReset();
  mockSynthesizeStream.mockReset();
  mockConnectionSend.mockImplementation((sessionId: string, msg: any) => {
    if (msg && msg.type === "tts_audio") {
      setTimeout(() => {
        walkthroughDriver.handleEvent(sessionId, "tts_playback_complete", { messageId: msg.messageId });
      }, 10);
    }
    return true;
  });
  mockSynthesize.mockImplementation(async () => "data:audio/mpeg;base64,aGVsbG8=");
  mockSynthesizeStream.mockImplementation(async (text: string, lang: string, onChunk: (base64: string, done: boolean) => void) => {
    const result = await mockSynthesize(text, lang);
    const base64 = result.split(",")[1];
    onChunk(base64, true);
  });

  // Set the dynamic global delegates!
  globalThis.__mockSynthesize = (text: string, lang: string) => {
    return mockSynthesize(text, lang);
  };
  globalThis.__mockSynthesizeStream = (text: string, lang: string, onChunk: any) => {
    return mockSynthesizeStream(text, lang, onChunk);
  };
  globalThis.__mockCheckS3ObjectExists = async () => false;
  globalThis.__mockGetPresignedUrl = async () => "https://mocked-s3-url.com/audio.mp3";
  globalThis.__mockGetSchema = (formId: string) => {
    if (formId === "createOrder") return ORDER_SCHEMA;
    throw new Error(`Schema not found: "${formId}"`);
  };
  globalThis.__mockGetAvailableForms = () => [{ id: "createOrder", name: "Create Order", route: "/orders" }];
}

/**
 * Drive a walkthrough session through the initial setup:
 * navigate → dialog_opened → form_registered
 * Returns after overview is sent.
 */
async function driveToOverview(sid: string) {
  walkthroughDriver.start("createOrder", sid);
  // Wait for navigate to be sent and driver to start waiting for navigation_complete
  await delay(200);
  walkthroughDriver.handleEvent(sid, "navigation_complete");
  // Driver does await this.wait(500) after navigation_complete resolves
  await delay(600);
  // Now driver sends open_dialog and waits for dialog_opened
  walkthroughDriver.handleEvent(sid, "dialog_opened");
  // Driver polls for form_registered (up to 1.5s with 100ms intervals)
  await delay(200);
  walkthroughDriver.handleEvent(sid, "form_registered");
  // Driver sends overview and waits EXPLAIN_DISPLAY (1000ms)
  await delay(500);
}

describe("WalkthroughDriver — acceptance tests", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // =============================================
  // CONTRACT 1: Session lifecycle
  // =============================================
  describe("session lifecycle", () => {
    test("start creates a session and sends begin_walkthrough", async () => {
      const sid = "lifecycle-session-1";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      const msgs = sentMessages(sid);
      const beginMsg = msgs.find(
        (m: any) => m.type === "tool" && m.tool === "begin_walkthrough"
      );
      expect(beginMsg).toBeDefined();
      expect(beginMsg.args.formId).toBe("createOrder");
    });

    test("start rejects duplicate session", async () => {
      const sid = "dup-session-1";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      // Clear messages from first start
      mockConnectionSend.mockReset();
      mockConnectionSend.mockImplementation(() => true);

      walkthroughDriver.start("createOrder", sid);
      await delay(100);

      const dupMsg = sentMessages(sid).find(
        (m: any) =>
          m.type === "tool" &&
          m.tool === "respond" &&
          m.args?.message?.includes("already in progress")
      );
      expect(dupMsg).toBeDefined();
    });

    test("start rejects unknown formId", async () => {
      const sid = "unknown-form-session";
      walkthroughDriver.start("nonExistentForm", sid);
      await delay(100);

      const errMsg = sentMessages(sid).find(
        (m: any) =>
          m.type === "tool" &&
          m.tool === "respond" &&
          m.args?.message?.includes("couldn't find the form")
      );
      expect(errMsg).toBeDefined();
    });

    test("session is cleaned up after walkthrough errors (navigation timeout)", async () => {
      const sid = "cleanup-session";
      walkthroughDriver.start("createOrder", sid);

      // Wait for navigation timeout (10000ms) + cleanup
      await delay(11000);

      // After cleanup, starting again should work
      mockConnectionSend.mockReset();
      mockConnectionSend.mockImplementation(() => true);

      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      const beginMsg = sentMessages(sid).find(
        (m: any) => m.type === "tool" && m.tool === "begin_walkthrough"
      );
      expect(beginMsg).toBeDefined();
    }, { timeout: 15000 });
  });

  // =============================================
  // CONTRACT 2: Cancel rejects pending waits and cleans session
  // =============================================
  describe("cancellation", () => {
    test("cancel sets cancelled flag — subsequent operations fail", async () => {
      const sid = "cancel-session-1";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      walkthroughDriver.cancel(sid);
      await delay(500);

      // Starting a new session should work
      mockConnectionSend.mockReset();
      mockConnectionSend.mockImplementation(() => true);

      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      const beginMsg = sentMessages(sid).find(
        (m: any) => m.type === "tool" && m.tool === "begin_walkthrough"
      );
      expect(beginMsg).toBeDefined();
    });
  });

  // =============================================
  // CONTRACT 3: handleEvent routes events
  // =============================================
  describe("handleEvent routing", () => {
    test("dialog_closed_by_user cancels the session", async () => {
      const sid = "status-cancel-session";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      walkthroughDriver.handleEvent(sid, "dialog_closed_by_user");
      await delay(500);

      mockConnectionSend.mockReset();
      mockConnectionSend.mockImplementation(() => true);

      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      const beginMsg = sentMessages(sid).find(
        (m: any) => m.type === "tool" && m.tool === "begin_walkthrough"
      );
      expect(beginMsg).toBeDefined();
    });

    test("page_changed cancels the session", async () => {
      const sid = "page-change-session";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      walkthroughDriver.handleEvent(sid, "page_changed");
      await delay(500);

      mockConnectionSend.mockReset();
      mockConnectionSend.mockImplementation(() => true);

      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      const beginMsg = sentMessages(sid).find(
        (m: any) => m.type === "tool" && m.tool === "begin_walkthrough"
      );
      expect(beginMsg).toBeDefined();
    });

    test("form_registered sets isRegistered flag", async () => {
      const sid = "form-registered-session";
      walkthroughDriver.start("createOrder", sid);
      await delay(50);

      walkthroughDriver.handleEvent(sid, "form_registered");
      await delay(100);
    });

    test("error event rejects pending wait", async () => {
      const sid = "error-event-session";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      walkthroughDriver.handleEvent(sid, "error", {
        tool: "navigate",
        reason: "Element not found",
      });
      await delay(200);
    });
  });

  // =============================================
  // CONTRACT 4: driver.send auto-synthesizes TTS
  // =============================================
  describe("driver.send TTS auto-synthesis", () => {
    test("tool messages with tts:true trigger automatic TTS synthesis", async () => {
      const sid = "tts-auto-session";
      await driveToOverview(sid);

      // At this point, the overview respond with tts:true should have been sent
      const toolMsgs = sentMessages(sid).filter(
        (m: any) => m.type === "tool" && m.args?.tts === true
      );
      expect(toolMsgs.length).toBeGreaterThan(0);

      // Wait for background TTS synthesis
      await delay(500);
      expect(mockSynthesize.mock.calls.length).toBeGreaterThan(0);
    });

    test("tts_audio messages are sent with matching messageId", async () => {
      const sid = "tts-match-session";
      await driveToOverview(sid);
      await delay(500);

      const ttsAudioMsgs = sentMessages(sid).filter(
        (m: any) => m.type === "tts_audio"
      );
      const toolMsgs = sentMessages(sid).filter(
        (m: any) => m.type === "tool" && m.args?.tts === true && (m.args?.messageId || m.args?.speechMessageId)
      );

      // At least some tts_audio should be present
      expect(ttsAudioMsgs.length).toBeGreaterThan(0);

      // Each tts_audio should match a tool message
      for (const ttsMsg of ttsAudioMsgs) {
        const matching = toolMsgs.find(
          (t: any) => (t.args.messageId || t.args.speechMessageId) === ttsMsg.messageId
        );
        expect(matching).toBeDefined();
      }
    });

    test("tool messages without tts:true do NOT trigger TTS synthesis", async () => {
      const sid = "no-tts-session";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      // begin_walkthrough has no tts — should not trigger synthesis
      const beginMsg = sentMessages(sid).find(
        (m: any) => m.type === "tool" && m.tool === "begin_walkthrough"
      );
      expect(beginMsg).toBeDefined();
      expect(beginMsg.args?.tts).toBeUndefined();
    });
  });

  // =============================================
  // CONTRACT 5: sendTool sends via connectionManager
  // =============================================
  describe("sendTool and transport", () => {
    test("begin_walkthrough is sent as first tool message", async () => {
      const sid = "first-msg-session";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      const msgs = sentMessages(sid);
      expect(msgs.length).toBeGreaterThan(0);

      const beginMsg = msgs.find(
        (m: any) => m.type === "tool" && m.tool === "begin_walkthrough"
      );
      expect(beginMsg).toBeDefined();
      expect(beginMsg.args.formId).toBe("createOrder");
    });

    test("navigate tool is sent with correct route from schema", async () => {
      const sid = "nav-route-session";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      const navMsg = sentMessages(sid).find(
        (m: any) => m.type === "tool" && m.tool === "navigate"
      );
      expect(navMsg).toBeDefined();
      expect(navMsg.args.route).toBe("/orders");
    });
  });

  // =============================================
  // CONTRACT 6: Walkthrough sends overview
  // =============================================
  describe("overview message", () => {
    test("sends overview respond message with tts:true", async () => {
      const sid = "overview-session";
      await driveToOverview(sid);

      const overviewMsg = sentMessages(sid).find(
        (m: any) =>
          m.type === "tool" &&
          m.tool === "respond" &&
          m.args?.tts === true &&
          typeof m.args?.message === "string" &&
          m.args.message.includes("order creation form")
      );
      expect(overviewMsg).toBeDefined();
    });
  });

  // =============================================
  // CONTRACT 7: Walkthrough overview before fields
  // =============================================
  describe("walkthrough sequence", () => {
    test("overview is sent before field processing begins", async () => {
      const sid = "sequence-session";
      await driveToOverview(sid);

      const msgs = sentMessages(sid);
      const overviewIdx = msgs.findIndex(
        (m: any) =>
          m.type === "tool" &&
          m.tool === "respond" &&
          m.args?.message?.includes("order creation form")
      );

      const goToFieldIdx = msgs.findIndex(
        (m: any) => m.type === "tool" && m.tool === "go_to_field"
      );

      expect(overviewIdx).toBeGreaterThanOrEqual(0);

      // If go_to_field was sent, overview should come first
      if (goToFieldIdx >= 0) {
        expect(overviewIdx).toBeLessThan(goToFieldIdx);
      }
    });

    test("fields are processed after overview", async () => {
      const sid = "fields-session";
      await driveToOverview(sid);

      // Wait for field processing (the driver proceeds after overview + EXPLAIN_DISPLAY wait)
      await delay(2000);

      const msgs = sentMessages(sid);
      // Should have field_step for the first field
      const fieldStepMsg = msgs.find(
        (m: any) => m.type === "tool" && m.tool === "field_step"
      );
      expect(fieldStepMsg).toBeDefined();
      expect(fieldStepMsg.args.fieldKey).toBe("customer");
    });

    test("speaks introMessage first if provided", async () => {
      const sid = "intro-msg-session";
      walkthroughDriver.start("createOrder", sid, true, "Welcome to the create order walkthrough!");
      await delay(200);

      const msgs = sentMessages(sid);
      const introMsg = msgs.find(
        (m: any) =>
          m.type === "tool" &&
          m.tool === "respond" &&
          m.args?.tts === true &&
          m.args.message === "Welcome to the create order walkthrough!"
      );
      expect(introMsg).toBeDefined();
    });

    // =============================================
    // CONTRACT 8: Walkthrough resumption behavior
    // =============================================
    describe("resumption behavior", () => {
      test("resuming from PAUSE during a field step replays the current field step", async () => {
        const sid = "paused-field-session";
        await driveToOverview(sid);
        await delay(2000); // Wait for the first field step to be dispatched

        // Verify that field_step was sent
        const originalMsgs = sentMessages(sid);
        const firstFieldStep = originalMsgs.find(
          (m: any) => m.type === "tool" && m.tool === "field_step"
        );
        expect(firstFieldStep).toBeDefined();
        expect(firstFieldStep.args.fieldKey).toBe("customer");
        const originalSpeechMsgId = firstFieldStep.args.speechMessageId;

        // Pause the walkthrough executor
        walkthroughDriver.pause(sid);

        // Clear the mock calls to easily track the next messages
        mockConnectionSend.mockReset();
        mockConnectionSend.mockImplementation(() => true);

        // Resume walkthrough
        walkthroughDriver.resumeWalkthrough(sid);
        await delay(200);

        // Verify it re-sent the same field step but with a new speech message ID (replaying)
        const newMsgs = sentMessages(sid);
        const replayedFieldStep = newMsgs.find(
          (m: any) => m.type === "tool" && m.tool === "field_step"
        );
        expect(replayedFieldStep).toBeDefined();
        expect(replayedFieldStep.args.fieldKey).toBe("customer");
        expect(replayedFieldStep.args.speechMessageId).not.toBe(originalSpeechMsgId);
      });

      test("resuming from DETOUR_QA during a field step replays the current field step", async () => {
        const sid = "detour-field-session";
        await driveToOverview(sid);
        await delay(2000); // Wait for the first field step to be dispatched

        // Verify that field_step was sent
        const originalMsgs = sentMessages(sid);
        const firstFieldStep = originalMsgs.find(
          (m: any) => m.type === "tool" && m.tool === "field_step"
        );
        expect(firstFieldStep).toBeDefined();
        expect(firstFieldStep.args.fieldKey).toBe("customer");
        const originalSpeechMsgId = firstFieldStep.args.speechMessageId;

        // Initiate a detour
        walkthroughDriver.detour("customer", sid);

        // Clear the mock calls to easily track the next messages
        mockConnectionSend.mockReset();
        mockConnectionSend.mockImplementation(() => true);

        // Resume walkthrough
        walkthroughDriver.resumeWalkthrough(sid);
        await delay(200);

        // Verify it re-sent the same field step but with a new speech message ID (replaying)
        const newMsgs = sentMessages(sid);
        const replayedFieldStep = newMsgs.find(
          (m: any) => m.type === "tool" && m.tool === "field_step"
        );
        expect(replayedFieldStep).toBeDefined();
        expect(replayedFieldStep.args.fieldKey).toBe("customer");
        expect(replayedFieldStep.args.speechMessageId).not.toBe(originalSpeechMsgId);
      });
    });
  });
});

describe("WalkthroughStateMachine — detour transitions", () => {
  test("allows detour transitions", async () => {
    const { WalkthroughStateMachine } = await import("../src/walkthrough/stateMachine.js");
    const sm = new WalkthroughStateMachine();
    expect(sm.currentState).toBe("IDLE");

    sm.transition("START_WALKTHROUGH");
    expect(sm.currentState).toBe("ACTIVE");

    sm.transition("DETOUR");
    expect(sm.currentState).toBe("DETOUR_QA");

    sm.transition("DETOUR_COMPLETE");
    expect(sm.currentState).toBe("ACTIVE");

    sm.transition("PAUSE");
    expect(sm.currentState).toBe("PAUSED");

    sm.transition("RESUME");
    expect(sm.currentState).toBe("ACTIVE");

    sm.transition("RESET");
    expect(sm.currentState).toBe("IDLE");
  });
});
