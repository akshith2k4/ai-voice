import { describe, it, expect, mock, beforeEach } from "bun:test";
import { WalkthroughExecutor } from "../src/walkthrough/executor.js";

// Mock instances (local to test file, no global mock.module)
const mockSessionManagerInstance = {
  get: mock(() => null),
  has: mock(() => false),
  create: mock(() => null),
  delete: mock(() => {}),
};

const mockToolMessengerInstance = {
  send: mock(() => {}),
};

describe("WalkthroughExecutor", () => {
    let executor: any;
    let mockSession: any;

    beforeEach(() => {
        executor = new WalkthroughExecutor();
        mockSession = {
            sessionId: "test-session",
            stateMachine: { 
                currentState: "ACTIVE", 
                transition: mock(() => {}) 
            },
            waitingFor: "field_done",
            skipCount: 0,
            isRegistered: true,
            filledValues: new Map(),
            eventWaiters: [],
            cancelled: false,
        };
        
        // Reset call history on shared mocks
        mockSessionManagerInstance.get.mockClear();
        mockSessionManagerInstance.has.mockClear();
        mockSessionManagerInstance.delete.mockClear();
        mockToolMessengerInstance.send.mockClear();

        // Inject mock session & spy overrides
        (executor as any).sessionManager = mockSessionManagerInstance;
        (executor as any).toolMessenger = mockToolMessengerInstance;
        mockSessionManagerInstance.get.mockImplementation(() => mockSession);
        mockSessionManagerInstance.has.mockImplementation(() => true);
        (executor as any).clearStepTimeout = mock(() => {});
        (executor as any).sendNext = mock(() => {});
    });

    it("should cancel session and send walkthrough_cancelled tool on cancel()", () => {
        executor.cancel("test-session");

        expect(mockToolMessengerInstance.send).toHaveBeenCalledWith("test-session", {
            type: "tool",
            tool: "walkthrough_cancelled",
            args: { reason: "cancelled_by_system" }
        });
        expect(mockSession.cancelled).toBe(true);
    });

    it("should pause session on tts_playback_interrupted only if waiting for audio", () => {
        // Scenario 1: Actively waiting for audio -> PAUSE
        mockSession.waitingFor = "field_done";
        executor.handleEvent("test-session", "tts_playback_interrupted");
        expect(mockSession.stateMachine.transition).toHaveBeenCalledWith("PAUSE");

        // Scenario 2: Not waiting for audio (e.g., user already resumed) -> IGNORE
        mockSession.stateMachine.transition.mockClear();
        mockSession.waitingFor = null;
        executor.handleEvent("test-session", "tts_playback_interrupted");
        expect(mockSession.stateMachine.transition).not.toHaveBeenCalled();
    });

    it("should advance and mark isRegistered=false on form_registration_timeout", () => {
        mockSession.waitingFor = "form_registered";
        executor.handleEvent("test-session", "form_registration_timeout");

        expect(mockSession.isRegistered).toBe(false);
        expect((executor as any).sendNext).toHaveBeenCalled();
    });

    it("should skip step on field_not_found and increment skipCount", () => {
        executor.handleEvent("test-session", "field_not_found", { fieldKey: "test" });
        expect(mockSession.skipCount).toBe(1);
        expect((executor as any).sendNext).toHaveBeenCalled();
    });

    it("should cancel walkthrough on 3 consecutive field_not_found events", () => {
        const mockCancel = mock(() => {});
        (executor as any).cancel = mockCancel;

        executor.handleEvent("test-session", "field_not_found", { fieldKey: "1" });
        executor.handleEvent("test-session", "field_not_found", { fieldKey: "2" });
        executor.handleEvent("test-session", "field_not_found", { fieldKey: "3" });

        expect(mockCancel).toHaveBeenCalled();
    });

    it("should reset skipCount to 0 on successful event", () => {
        mockSession.skipCount = 2;
        mockSession.waitingFor = "field_done";
        
        executor.handleEvent("test-session", "field_done");
        
        expect(mockSession.skipCount).toBe(0);
    });
});
