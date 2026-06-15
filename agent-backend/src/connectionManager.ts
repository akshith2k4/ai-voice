import type { ClientData, OutgoingMessage } from "./types";

// ============================================
// Connection Manager
// Tracks all active WebSocket sessions
// ============================================

class ConnectionManager {
  private connections: Map<string, { ws: any; data: ClientData }> = new Map();

  /**
   * Register a new WebSocket connection
   */
  add(sessionId: string, ws: any): void {
    const now = Date.now();
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
      // Dynamic import to avoid circular dependency (connectionManager ↔ voicePipeline)
      import("./adapters/voiceAdapter.js")
        .then(({ cleanupSession }) => {
          cleanupSession(sessionId);
        })
        .catch((err) => {
          console.warn(`[ConnectionManager] Failed to cleanup session ${sessionId}:`, err);
        });
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
      return false;
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(message: OutgoingMessage): number {
    const payload = JSON.stringify(message);
    let sentCount = 0;

    for (const [sessionId, connection] of this.connections) {
      try {
        connection.ws.send(payload);
        connection.data.lastActivityAt = Date.now();
        sentCount++;
      } catch (error) {
        console.error(
          `[ConnectionManager] Broadcast failed for ${sessionId}:`,
          error
        );
      }
    }

    return sentCount;
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
