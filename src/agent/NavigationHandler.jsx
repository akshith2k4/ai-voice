import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAgent } from "./AgentBridge";

// ============================================
// Navigation Handler
// Lives inside the Router so it can use useNavigate.
// Watches pendingNavigation from AgentBridge
// and executes navigation when it changes.
// ============================================

export default function NavigationHandler() {
  const navigate = useNavigate();
  const { pendingNavigation, sendMessage, clearPendingNavigation } = useAgent();
  const lastNavigatedRef = useRef(null);

  useEffect(() => {
    if (!pendingNavigation) return;
    if (pendingNavigation === lastNavigatedRef.current) return;

    lastNavigatedRef.current = pendingNavigation;
    console.log(`[NavigationHandler] Navigating to: ${pendingNavigation}`);
    navigate(pendingNavigation);

    sendMessage({
      type: "status",
      event: "navigation_complete",
      route: pendingNavigation,
    });

    // Reset so the same route can be navigated to again later
    clearPendingNavigation();
  }, [pendingNavigation, navigate, sendMessage, clearPendingNavigation]);

  return null;
}
