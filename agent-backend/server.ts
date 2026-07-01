import { connectionManager } from "./src/connectionManager.js";
import { db, sessions } from "./src/services/db.js";
import { fireAndForget } from "./src/services/observability.js";
import { eq } from "drizzle-orm";
import { startTracking } from "./src/services/latencyTracker.js";
import { routeMessage, parseMessage } from "./src/messageRouter.js";
import type { ClientData, OutgoingMessage } from "./src/types.js";
import { preloadStaticAudio } from "./src/services/preloader.js";

// Track pending session-close timers so reconnects can cancel them
const pendingSessionClose = new Map<string, ReturnType<typeof setTimeout>>();



// ============================================
// Agent Backend — Bun WebSocket Server
// ============================================
import { loadAllSchemas, getAvailableForms } from "./src/schema/loader";
import { resolve } from "path";
import { initializeFillers } from "./src/services/fillerService.js";

loadAllSchemas(resolve(import.meta.dir, "src/schema/forms"));
console.log("Available forms:", getAvailableForms());
await initializeFillers();
preloadStaticAudio().catch(err => console.error("[Preloader] Pre-upload failed:", err));
const PORT = parseInt(process.env.PORT || "3001");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173,https://krishai.linengrass.com,https://linengrass.com";

console.log(`[Config] PORT: ${PORT}`);
console.log(`[Config] CORS_ORIGIN: ${CORS_ORIGIN}`);

const server = Bun.serve<ClientData>({
  port: PORT,

  fetch(req, server) {
    const origin = req.headers.get("origin") || "";

    // Handle WebSocket upgrade
    const upgradeHeader = req.headers.get("upgrade");
    if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
      const isDev = process.env.NODE_ENV !== "production";
      const allowedOrigins = CORS_ORIGIN.split(',').map(o => o.trim());
      if (origin && !allowedOrigins.includes('*') && !allowedOrigins.includes(origin)) {
        console.warn(
          `[Server] Rejected WebSocket upgrade from origin: ${origin} (Allowed: ${CORS_ORIGIN})`
        );
        return new Response("Forbidden", { status: 403 });
      }
      if (!origin && !isDev) {
        console.warn(`[Server] Rejected WebSocket upgrade: missing origin in production`);
        return new Response("Forbidden", { status: 403 });
      }

      // Use client-supplied sessionId if present (enables reconnect continuity),
      // otherwise generate a fresh one.
      const url = new URL(req.url, `http://localhost`);
      const sessionId = url.searchParams.get("sessionId") || crypto.randomUUID();
      const userName = url.searchParams.get("username") || undefined;
      const success = server.upgrade(req, {
        data: {
          sessionId,
          userName,
          connectedAt: Date.now(),
          lastActivityAt: Date.now(),
        },
      });

      if (success) {
        console.log(
          `[Server] WebSocket upgrade accepted: ${sessionId} from ${origin}`
        );
        return; // Bun handles the response
      }

      console.error(`[Server] WebSocket upgrade failed for ${sessionId}`);
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    // Health check endpoint
    if (req.url.endsWith("/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          connections: connectionManager.size,
          sessions: connectionManager.getSessionIds(),
          uptime: process.uptime(),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": CORS_ORIGIN,
          },
        }
      );
    }

    // Default response for non-WebSocket requests
    return new Response("Agent Backend — use WebSocket to connect", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": CORS_ORIGIN,
      },
    });
  },

  websocket: {
    open(ws) {
      const { sessionId } = ws.data;
      // Cancel any pending close for this sessionId (reconnect scenario)
      const pending = pendingSessionClose.get(sessionId);
      if (pending) {
        clearTimeout(pending);
        pendingSessionClose.delete(sessionId);
        console.log(`[Server] Reconnect detected for ${sessionId}, cancelled pending close`);
      }
      connectionManager.add(sessionId, ws);
    },

    // Called when a message is received from a client
    message(ws, message) {
      const { sessionId, userName } = ws.data;

      // Update activity timestamp
      connectionManager.touch(sessionId);



      // Parse the message
      const parsed = parseMessage(message);
      if (!parsed) {
        console.warn(`[Server] Invalid message from ${sessionId}, ignoring`);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format. Expected JSON with 'type' field.",
            code: "INVALID_FORMAT",
          })
        );
        return;
      }

      // Log message type only (not content)
      console.log(
        `[Server] Message received: type="${parsed.type}" from ${sessionId}`
      );

      // Create handler context
      const context = {
        sessionId,
        userName,
        send: (msg: OutgoingMessage) => {
          connectionManager.send(sessionId, msg);
        },
      };

      // Route to the appropriate handler
      startTracking(sessionId, userName, () => {
        routeMessage(parsed, context);
      });
    },

    // Called when a WebSocket connection is closed
    close(ws, code, reason) {
      const { sessionId } = ws.data;
      console.log(
        `[Server] Connection closed: ${sessionId} (code: ${code}, reason: ${reason || "none"})`
      );
      connectionManager.remove(sessionId);

      // Defer DB update — cancelled if the same sessionId reconnects within 3 seconds
      const timer = setTimeout(() => {
        pendingSessionClose.delete(sessionId);
        fireAndForget(
          db.update(sessions)
            .set({ status: "completed", endedAt: new Date() })
            .where(eq(sessions.id, sessionId))
        );
      }, 3000);
      pendingSessionClose.set(sessionId, timer);
    },

    // Close connection if inactive for 16 minutes to prevent timeouts during long walkthroughs (Bug #11/12, max allowed by Bun is 960s)
    idleTimeout: 960,
  },
});

// Clean up stale active sessions on startup
fireAndForget(
  db.update(sessions)
    .set({ status: "completed", endedAt: new Date() })
    .where(eq(sessions.status, "active"))
);

console.log(`\n🚀 Agent backend running on ws://localhost:${PORT}`);
console.log(`   Health check: http://localhost:${PORT}/health`);
console.log(`   Allowed origin: ${CORS_ORIGIN}`);
console.log(`   Press Ctrl+C to stop\n`);

const shutdown = async () => {
  console.log("\n[Server] Shutting down gracefully...");
  
  const activeSessionIds = connectionManager.getSessionIds();
  
  for (const sessionId of activeSessionIds) {
    try {
      const conn = connectionManager.get(sessionId);
      if (conn && conn.ws) {
        conn.ws.send(JSON.stringify({
          type: "error",
          message: "Server is restarting. Please reconnect.",
          code: "SERVER_SHUTDOWN"
        }));
        conn.ws.close();
      }
    } catch (e) {
      console.error(`[Server] Error notifying client ${sessionId} during shutdown:`, e);
    }
  }

  if (activeSessionIds.length > 0) {
    try {
      await db.update(sessions)
        .set({ status: "completed", endedAt: new Date() })
        .where(eq(sessions.status, "active"));
      console.log(`[Server] Marked active sessions as completed in DB.`);
    } catch (e) {
      console.error("[Server] Error updating sessions in DB during shutdown:", e);
    }
  }

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
