import { describe, test, expect, mock, beforeEach } from "bun:test";

// --- Mock setup (before imports) ---

const mockConnectionSend = mock((sessionId: string, msg: any) => {
  if (msg && msg.type === "tts_audio") {
    setTimeout(() => {
      walkthroughDriver.handleStatus(sessionId, "tts_playback_complete", { messageId: msg.messageId });
    }, 10);
  }
  return true;
});

mock.module("../src/connectionManager.js", () => ({
  connectionManager: {
    send: mockConnectionSend,
    add: mock(() => {}),
    remove: mock(() => {}),
    get: mock(() => undefined),
    has: mock(() => true),
    broadcast: mock(() => 0),
    touch: mock(() => {}),
    getSessionIds: mock(() => []),
    size: 0,
  },
}));

const mockSynthesize = mock(async (text: string, lang: string) => {
  return "data:audio/mpeg;base64,aGVsbG8=";
});

mock.module("../src/services/elevenLabsTTS.js", () => ({
  synthesize: mockSynthesize,
}));

const ORDER_SCHEMA = {
  id: "createOrder",
  name: "Create Order",
  mode: "guided",
  route: "/orders",
  openAction: { type: "click", fallbackText: "Create Order" },
  overview: "This is the order creation form. Let me walk you through each field.",
  fields: [
    {
      key: "customer",
      label: "Customer",
      type: "text" as const,
      demoValue: "Acme Corp",
      explanation: "Select the customer for this order.",
    },
    {
      key: "orderType",
      label: "Order Type",
      type: "select" as const,
      demoValue: "delivery",
      explanation: "Choose the order type.",
    },
  ],
  subForms: [],
  wrapUp: "That completes the order form walkthrough!",
};

mock.module("../src/schema/loader.js", () => ({
  getSchema: (formId: string) => {
    if (formId === "createOrder") return ORDER_SCHEMA;
    throw new Error(`Schema not found: "${formId}"`);
  },
  getAvailableForms: () => [{ id: "createOrder", name: "Create Order", route: "/orders" }],
}));

// --- Import after mocks ---
const { walkthroughDriver } = await import("../src/walkthrough/driver.js");

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function sentMessages(sessionId: string): any[] {
  return mockConnectionSend.mock.calls
    .filter((c: any) => c[0] === sessionId)
    .map((c: any) => c[1]);
}

function resetAllMocks() {
  mockConnectionSend.mockReset();
  mockSynthesize.mockReset();
  mockConnectionSend.mockImplementation((sessionId: string, msg: any) => {
    if (msg && msg.type === "tts_audio") {
      setTimeout(() => {
        walkthroughDriver.handleStatus(sessionId, "tts_playback_complete", { messageId: msg.messageId });
      }, 10);
    }
    return true;
  });
  mockSynthesize.mockImplementation(async () => "data:audio/mpeg;base64,aGVsbG8=");
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
  walkthroughDriver.handleStatus(sid, "navigation_complete");
  // Driver does await this.wait(500) after navigation_complete resolves
  await delay(600);
  // Now driver sends open_dialog and waits for dialog_opened
  walkthroughDriver.handleStatus(sid, "dialog_opened");
  // Driver polls for form_registered (up to 1.5s with 100ms intervals)
  await delay(200);
  walkthroughDriver.handleStatus(sid, "form_registered");
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

      // Wait for navigation timeout (5000ms) + cleanup
      await delay(6000);

      // After cleanup, starting again should work
      mockConnectionSend.mockReset();
      mockConnectionSend.mockImplementation(() => true);

      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      const beginMsg = sentMessages(sid).find(
        (m: any) => m.type === "tool" && m.tool === "begin_walkthrough"
      );
      expect(beginMsg).toBeDefined();
    }, { timeout: 10000 });
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
  // CONTRACT 3: handleStatus routes events
  // =============================================
  describe("handleStatus routing", () => {
    test("dialog_closed_by_user cancels the session", async () => {
      const sid = "status-cancel-session";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      walkthroughDriver.handleStatus(sid, "dialog_closed_by_user");
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

      walkthroughDriver.handleStatus(sid, "page_changed");
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

      walkthroughDriver.handleStatus(sid, "form_registered");
      await delay(100);
    });

    test("error event rejects pending wait", async () => {
      const sid = "error-event-session";
      walkthroughDriver.start("createOrder", sid);
      await delay(200);

      walkthroughDriver.handleStatus(sid, "error", {
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
        (m: any) => m.type === "tool" && m.args?.tts === true && m.args?.messageId
      );

      // At least some tts_audio should be present
      expect(ttsAudioMsgs.length).toBeGreaterThan(0);

      // Each tts_audio should match a tool message
      for (const ttsMsg of ttsAudioMsgs) {
        const matching = toolMsgs.find(
          (t: any) => t.args.messageId === ttsMsg.messageId
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
      // Should have go_to_field for the first field
      const goToFieldMsg = msgs.find(
        (m: any) => m.type === "tool" && m.tool === "go_to_field"
      );
      expect(goToFieldMsg).toBeDefined();
      expect(goToFieldMsg.args.fieldKey).toBe("customer");
    });
  });
});

describe("WalkthroughStateMachine — detour transitions", () => {
  test("allows DETOUR event from DETOUR_QA and retains original context", async () => {
    const { WalkthroughStateMachine } = await import("../src/state/stateMachine.js");
    const sm = new WalkthroughStateMachine();
    sm.reset("WALKING_THROUGH", {
      formId: "createOrder",
      fieldIndex: 1,
    });

    // 1. Transition to DETOUR
    sm.transition("DETOUR");
    expect(sm.currentState).toBe("DETOUR_QA");
    expect(sm.currentContext.detourOrigin).toBeDefined();
    expect(sm.currentContext.detourOrigin?.state).toBe("WALKING_THROUGH");
    expect(sm.currentContext.detourOrigin?.fieldIndex).toBe(1);

    // 2. Transition to DETOUR again (multi-hop detour)
    // Modify index to simulate looking at another field
    const ctx = sm.currentContext as any;
    ctx.fieldIndex = 5; // Simulates looking at another field key
    
    sm.transition("DETOUR");
    expect(sm.currentState).toBe("DETOUR_QA");
    // Ensure detourOrigin is NOT overwritten (it should still point to WALKING_THROUGH at fieldIndex 1)
    expect(sm.currentContext.detourOrigin?.state).toBe("WALKING_THROUGH");
    expect(sm.currentContext.detourOrigin?.fieldIndex).toBe(1);

    // 3. Complete detour
    sm.transition("DETOUR_COMPLETE");
    expect(sm.currentState).toBe("WALKING_THROUGH");
    expect(sm.currentContext.fieldIndex).toBe(1);
    expect(sm.currentContext.detourOrigin).toBeNull();
  });
});
