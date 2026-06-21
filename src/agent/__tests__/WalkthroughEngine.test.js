import { describe, it, expect, vi, beforeEach } from "vitest";
import WalkthroughEngine from "../WalkthroughEngine.js";

// Mock dependencies
vi.mock("../AudioQueue.js", () => {
  const mockAudioQueue = {
    onPlaybackChange: vi.fn(() => vi.fn()),
    onMessageEnded: null,
    onCleared: null,
    enqueueUrl: vi.fn(),
    enqueue: vi.fn(),
    clear: vi.fn(),
  };
  return {
    default: vi.fn(),
    AudioQueue: vi.fn(() => mockAudioQueue),
    audioQueue: mockAudioQueue,
  };
});
vi.mock("../CursorManager.js", () => ({ default: vi.fn() }));
vi.mock("../SpotlightManager.js", () => ({ 
  SpotlightManager: { clearSpotlight: vi.fn(), setSpotlight: vi.fn() }
}));
vi.mock("../wsConnection.js", () => ({ 
  sendMessage: vi.fn(),
  sendStatus: vi.fn(),
  sendError: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  onStatusChange: vi.fn(() => vi.fn()),
  onMessage: vi.fn(() => vi.fn()),
}));
vi.mock("../toolRegistry.js", () => ({
  registerTool: vi.fn(),
  executeTool: vi.fn(() => Promise.resolve()),
}));
vi.mock("../toolHandlers/index.js", () => ({}));

describe("WalkthroughEngine", () => {
    let engine;
    let mockSendStatus;
    let mockSetIsWalkthroughActive;

    beforeEach(() => {
        mockSendStatus = vi.fn();
        mockSetIsWalkthroughActive = vi.fn();
        engine = new WalkthroughEngine();
        engine.init({
            setIsPaused: vi.fn(),
            setIsWalkthroughActive: mockSetIsWalkthroughActive,
            addMessage: vi.fn(),
            clearMessages: vi.fn(),
            stopAudio: vi.fn(),
        });
    });

    it("should resolve pending onAudioComplete promises with false when cancelled", async () => {
        engine.activeFormId = "testForm";
        const promise = engine.onAudioComplete("msg-123", 5000);
        
        // Simulate cancellation
        engine.dispatch("walkthrough_cancelled", {});
        
        const result = await promise;
        expect(result).toBe(false); 
        expect(engine.activeFormId).toBeNull();
    });

    it("should increment generation ID on cancel, invalidating stale executions", () => {
        const genBefore = engine._generationId;
        engine.dispatch("walkthrough_cancelled", {});
        expect(engine._generationId).toBe(genBefore + 1);
    });

    it("onAudioComplete should resolve true on normal completion", async () => {
        const promise = engine.onAudioComplete("msg-123", 5000);
        
        // Simulate audio finishing
        engine._completedAudioMessages.add("msg-123");
        engine._audioCompletionHandlers.get("msg-123")?.resolve();
        
        const result = await promise;
        expect(result).toBe(true);
    });

    it("onAudioComplete should resolve false on timeout", async () => {
        vi.useFakeTimers();
        const promise = engine.onAudioComplete("msg-123", 1000);
        
        vi.advanceTimersByTime(1500);
        
        const result = await promise;
        expect(result).toBe(false);
        vi.useRealTimers();
    });

    it("reset() should clear all walkthrough state", () => {
        engine.queue = [{ tool: "test", args: {} }];
        engine.activeFormId = "testForm";
        engine.isDetourActive = true;
        
        engine.reset();
        
        expect(engine.queue).toEqual([]);
        expect(engine.activeFormId).toBeNull();
        expect(engine.isDetourActive).toBe(false);
    });
});
