// ============================================
// WalkthroughHandler (v2 — registry-first)
// Processes tool calls from the agent backend.
// Uses form registry when available, falls back
// to DOM manipulation for unregistered forms.
//
// TESTING REQUIREMENT (Two-path design):
// Every form type must be tested in BOTH modes:
// 1. With the form registered (useAgentForm hook)
// 2. Unregistered (DOM fallback path)
// ============================================

import { useEffect, useRef } from "react";
import { useAgent } from "./AgentBridge";
import { agentFormRegistry } from "./agentFormRegistry";
import { executeTool } from "./toolRegistry";
import { TOOL_TYPES } from "./protocol";
import { SpotlightManager } from "./SpotlightManager";
import { wait } from "./utils";
import "./toolHandlers/index";


export default function WalkthroughHandler() {
  const { pendingTool, sendMessage, clearPendingTool, addMessage, setIsPaused, clearMessages, stopAudio, audioQueueFinishedEvent } = useAgent();

  // Stable refs — always current, never stale in async closures
  const sendRef = useRef(sendMessage);
  const addRef = useRef(addMessage);
  sendRef.current = sendMessage;
  addRef.current = addMessage;

  // Tool queue — prevents lost tools when two arrive in the same tick
  const queueRef = useRef([]);
  const executingRef = useRef(false);
  const lastEnqueuedRef = useRef(null);

  // Active form tracking
  const activeFormIdRef = useRef(null);

  // Control flow state
  const isPausedRef = useRef(false);
  const isDetourActiveRef = useRef(false);

  // AUTOMATIC RECOVERY HOOK: Snaps back the split second audio finishing playing
  useEffect(() => {
    if (audioQueueFinishedEvent && isDetourActiveRef.current) {
      console.log("[WalkthroughHandler] Detour speech concluded. Emitting automatic resumption frame.");
      sendMessage({ type: "status", event: "resume_walkthrough" });
    }
  }, [audioQueueFinishedEvent, sendMessage]);

  // ---- Enqueue incoming tools ----
  useEffect(() => {
    if (!pendingTool) return;

    // Deduplicate (React can re-fire effect with same value)
    const toolId = pendingTool.uuid || pendingTool.type + JSON.stringify(pendingTool.args || {});
    if (toolId === lastEnqueuedRef.current) return;
    lastEnqueuedRef.current = toolId;

    // Execute control flow tools immediately (bypass queue)
    const { type } = pendingTool;
    if (type === TOOL_TYPES.PAUSE_WALKTHROUGH) {
      isPausedRef.current = true;
      setIsPaused(true);
      clearPendingTool();
      return;
    }
    if (type === TOOL_TYPES.RESUME_WALKTHROUGH) {
      isPausedRef.current = false;
      setIsPaused(false);
      clearPendingTool();
      drain();
      return;
    }
    if (type === TOOL_TYPES.CANCEL_WALKTHROUGH) {
      queueRef.current = [];
      executingRef.current = false;
      isPausedRef.current = false;
      setIsPaused(false);
      isDetourActiveRef.current = false;
      SpotlightManager.clearSpotlight();
      stopAudio();
      clearMessages();
      executeTool(TOOL_TYPES.CLEAR_ALL_FIELDS, {}, {
        send: sendRef.current,
        add: addRef.current,
        formId: activeFormIdRef.current,
        setActiveFormId: (id) => { activeFormIdRef.current = id; }
      });
      clearPendingTool();
      return;
    }
    if (type === "detour_start") {
      isDetourActiveRef.current = true;
      clearPendingTool();
      return;
    }
    if (type === "detour_end") {
      isDetourActiveRef.current = false;
      clearPendingTool();
      drain();
      return;
    }

    queueRef.current.push(pendingTool);
    clearPendingTool();
    drain();
  }, [pendingTool, clearPendingTool]);

  function drain() {
    if (executingRef.current || queueRef.current.length === 0) return;
    if (isPausedRef.current) return;

    executingRef.current = true;

    const tool = queueRef.current.shift();
    execute(tool)
      .catch((err) => console.error("[WalkthroughHandler] Uncaught:", err))
      .finally(() => {
        executingRef.current = false;
        if (queueRef.current.length > 0) drain();
      });
  }

  // ---- Execute a single tool ----
  async function execute(tool) {
    const { type, args } = tool;
    const send = sendRef.current;
    const add = addRef.current;
    const formId = activeFormIdRef.current;

    const context = {
      send,
      add,
      formId,
      setActiveFormId: (id) => { activeFormIdRef.current = id; }
    };

    try {
      await executeTool(type, args, context);
    } catch (error) {
      if (error.message.startsWith("Unknown tool")) {
        console.log(`[WalkthroughHandler] ${error.message}`, args);
      } else {
        console.error(`[WalkthroughHandler] Execution failed for ${type}:`, error);
      }
    }
  }

  return null;
}
