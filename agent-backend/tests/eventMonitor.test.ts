import { describe, it, expect, beforeEach } from "bun:test";
import { EventMonitor, CancellationError } from "../src/walkthrough/eventMonitor.js";

describe("EventMonitor", () => {
    let monitor: EventMonitor;
    let mockSession: any;

    beforeEach(() => {
        monitor = new EventMonitor();
        mockSession = { eventWaiters: [] };
    });

    it("should resolve waitForEvent when notify is called with matching event", async () => {
        const promise = monitor.waitForEvent(mockSession, "field_done", 5000);
        monitor.notify(mockSession, "field_done", { fieldKey: "test" });
        
        const result = await promise;
        expect(result.fieldKey).toBe("test");
    });

    it("should reject waitForEvent on timeout", async () => {
        const promise = monitor.waitForEvent(mockSession, "field_done", 10);
        
        await expect(promise).rejects.toThrow(/Timeout waiting for "field_done"/);
    });

    it("should reject pending waiters with CancellationError on rejectPending", async () => {
        const promise = monitor.waitForEvent(mockSession, "field_done", 5000);
        
        monitor.rejectPending(mockSession, new CancellationError("User barged in"));
        
        await expect(promise).rejects.toThrow(CancellationError);
    });
});
