import type { ClientData, OutgoingMessage } from "./types";

// ============================================
// Connection Manager
// Tracks all active WebSocket sessions
// ============================================

class ConnectionManager {
  private connections: Map<string, { ws: any; data: ClientData }> = new Map();
  private pendingCleanups: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private voiceAdapterModule: any = null;

  /**
   * Register a new WebSocket connection
   */
  add(sessionId: string, ws: any): void {
    const now = Date.now();
    const pending = this.pendingCleanups.get(sessionId);
    if (pending) {
      clearTimeout(pending);
      this.pendingCleanups.delete(sessionId);
      console.log(`[ConnectionManager] Cancelled pending cleanup for session ${sessionId} due to reconnect`);
    }

    this.connections.set(sessionId, {
      ws,
      data: {
        sessionId,
        connectedAt: now,
        lastActivityAt: now,
      },
    });
    console.log(
      `[ConnectionManager] Client connected: ${sessionId} (total: ${this.connections.size})`
    );
  }

  /**
   * Unregister a WebSocket connection
   */
  remove(sessionId: string): void {
    const removed = this.connections.delete(sessionId);
    if (removed) {
      console.log(
        `[ConnectionManager] Client disconnected: ${sessionId} (total: ${this.connections.size})`
      );

      const timer = setTimeout(() => {
        this.pendingCleanups.delete(sessionId);

        const performCleanup = (mod: any) => {
          if (!this.has(sessionId)) {
            mod.cleanupSession(sessionId);
          } else {
            console.log(`[ConnectionManager] Skipped cleanup for ${sessionId} because it reconnected`);
          }
        };

        if (this.voiceAdapterModule) {
          performCleanup(this.voiceAdapterModule);
        } else {
          import("./adapters/voiceAdapter.js")
            .then((mod) => {
              this.voiceAdapterModule = mod;
              performCleanup(mod);
            })
            .catch((err) => {
              console.warn(`[ConnectionManager] Failed to cleanup session ${sessionId}:`, err);
            });
        }
      }, 3000);

      this.pendingCleanups.set(sessionId, timer);
    }
  }

  /**
   * Get a specific connection by session ID
   */
  get(sessionId: string): { ws: any; data: ClientData } | undefined {
    return this.connections.get(sessionId);
  }

  /**
   * Send a message to a specific client
   */
  send(sessionId: string, message: OutgoingMessage): boolean {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      console.warn(
        `[ConnectionManager] Cannot send to ${sessionId}: not found`
      );
      return false;
    }

    try {
      const payload = JSON.stringify(message);
      connection.ws.send(payload);
      connection.data.lastActivityAt = Date.now();
      return true;
    } catch (error) {
      console.error(
        `[ConnectionManager] Failed to send to ${sessionId}:`,
        error
      );
      this.remove(sessionId);
      return false;
    }
  }



  /**
   * Update last activity timestamp for a session
   */
  touch(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.data.lastActivityAt = Date.now();
    }
  }

  /**
   * Get total number of active connections
   */
  get size(): number {
    return this.connections.size;
  }

  /**
   * Get all active session IDs
   */
  getSessionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Check if a session is connected
   */
  has(sessionId: string): boolean {
    return this.connections.has(sessionId);
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();
