import { scannerService } from "../../services/scannerService";
import { scannerSocketService } from "../../services/scannerSocketService";

const mapQuantityTypeToBackend = (quantityType) => {
  switch (quantityType) {
    case "WASHED":
      return "WASHED";
    case "DAMAGED":
      return "DAMAGED";
    case "SOILED":
      return "SOILED";
    case "HEAVY_SOILED":
      return "HEAVY_SOILED";
    default:
      return "OVERALL";
  }
};

class ScannerController {
  sessionId = null;
  readerId = null;
  isActive = false;
  isStarting = false;

  isActiveSessionConflictError(error) {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || error?.message || "").toLowerCase();

    return (
      status === 500 &&
      message.includes("active scan session") &&
      message.includes("reader")
    );
  }

  async start({
    readerId,
    referenceId,
    quantityType,
    scanType,
    userId,
    onMachineMessage,
    onSessionMessage,
  }) {
    console.log("🚀 ScannerController.start() called");
    console.log("   Reader ID:", readerId);
    console.log("   Session ID:", this.sessionId);
    console.log("   Callback present:", !!onSessionMessage);

    if (!readerId) {
      throw new Error("readerId is required");
    }

    if (this.isStarting) {
      console.log("⏳ Already starting, returning existing session");
      return this.sessionId;
    }

    if (this.isActive && this.sessionId && this.readerId === readerId) {
      console.log("✅ Already active with same reader, returning session");
      return this.sessionId;
    }

    this.isStarting = true;

    try {
      if (this.isActive && this.sessionId && this.readerId !== readerId) {
        console.log("🔄 Switching readers, stopping current session");
        try {
          await scannerService.stopScan(this.sessionId);
        } catch (e) { }
        scannerSocketService.disconnect();
        this.sessionId = null;
        this.readerId = null;
        this.isActive = false;
      }

      console.log("🆕 Creating new scan session...");
      const payload = {
        readerId,
        referenceId,
        scanType: scanType,
        quantityType: mapQuantityTypeToBackend(quantityType),
      };

      if (userId) {
        payload.userId = userId;
      }

      let response;

      try {
        response = await scannerService.startScan(payload);
      } catch (startError) {
        if (!this.isActiveSessionConflictError(startError)) {
          throw startError;
        }

        console.warn(
          "⚠️ Active session already exists for reader. Cancelling stale session and retrying start.",
          startError
        );

        const activeSession = await scannerService.getActiveSessionByReader(readerId);
        const existingSessionId = activeSession?.sessionId || activeSession?.id;

        if (!existingSessionId) {
          throw startError;
        }

        try {
          await scannerService.stopScan(existingSessionId);
        } catch (stopErr) {
          console.warn("Stop stale session failed before cancel:", stopErr);
        }

        await scannerService.cancelScan(existingSessionId);
        response = await scannerService.startScan(payload);
      }

      const newSessionId = response?.sessionId;
      if (!newSessionId) {
        throw new Error("Invalid scan session response");
      }

      console.log("✅ Session created:", newSessionId);
      this.sessionId = newSessionId;
      this.readerId = readerId;
      this.isActive = true;

      console.log("🔌 Connecting WebSocket with callback...");
      scannerSocketService.connect({
        sessionId: this.sessionId,
        onMachineMessage,
        onSessionMessage,
      });

      return this.sessionId;
    } finally {
      this.isStarting = false;
    }
  }

  async stop() {
    if (!this.sessionId) return;

    try {
      await scannerService.stopScan(this.sessionId);
    } catch (e) {
    } finally {
      scannerSocketService.disconnect();
      this.sessionId = null;
      this.readerId = null;
      this.isActive = false;
    }
  }

  async cancel() {
    let sessionIdToCancel = this.sessionId;

    if (!sessionIdToCancel) {
      if (this.readerId) {
        try {
          const activeSession = await scannerService.getActiveSessionByReader(this.readerId);
          sessionIdToCancel = activeSession?.sessionId || activeSession?.id || null;
        } catch (lookupError) {
          console.warn("Failed to fetch active scanner session for reader", lookupError);
        }
      }
    }

    if (!sessionIdToCancel) {
      console.warn("Cancel requested, but no active sessionId found.");
      scannerSocketService.disconnect();
      this.sessionId = null;
      this.readerId = null;
      this.isActive = false;
      return;
    }

    try {
      // 1. stop scan session
      try {
        await scannerService.stopScan(sessionIdToCancel);
      } catch (stopErr) {
        console.warn("Stop scan failed before cancel:", stopErr);
      }
      // 2. cancel scan session
      await scannerService.cancelScan(sessionIdToCancel);
    } catch (e) {
    } finally {
      scannerSocketService.disconnect();
      this.sessionId = null;
      this.readerId = null;
      this.isActive = false;
    }
  }

  hasActiveSession() {
    return this.isActive && !!this.sessionId;
  }

  getSessionId() {
    return this.sessionId;
  }

  getReaderId() {
    return this.readerId;
  }
}

export const scannerController = new ScannerController();
