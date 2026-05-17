import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAgent } from "./AgentBridge";

// ============================================
// Navigation Handler
// Lives inside the Router so it can use useNavigate.
// Watches pendingNavigation from AgentBridge
// and executes navigation when it changes.
//
// Fix: Sends navigation_complete only AFTER
// location.pathname actually matches the target,
// plus one animation frame for the DOM to mount.
// ============================================

export default function NavigationHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingNavigation, sendMessage, clearPendingNavigation } = useAgent();
  const targetRef = useRef(null);

  // Kick off navigation when pendingNavigation changes
  useEffect(() => {
    if (!pendingNavigation) return;

    // Already on the target route → complete immediately
    if (pendingNavigation === location.pathname) {
      console.log(`[NavigationHandler] Already on ${location.pathname} — sending navigation_complete`);
      sendMessage({
        type: "status",
        event: "navigation_complete",
        route: location.pathname,
      });
      clearPendingNavigation();
      return;
    }

    targetRef.current = pendingNavigation;
    console.log(`[NavigationHandler] Navigating to: ${pendingNavigation}`);
    navigate(pendingNavigation);
  }, [pendingNavigation, navigate, location.pathname, sendMessage, clearPendingNavigation]);

  // Report completion after location actually changes to the target
  useEffect(() => {
    if (!targetRef.current) return;
    if (location.pathname !== targetRef.current) return;

    // Wait one frame for DOM to mount after the route change
    const id = requestAnimationFrame(() => {
      console.log(`[NavigationHandler] Route confirmed: ${location.pathname} — sending navigation_complete`);
      sendMessage({
        type: "status",
        event: "navigation_complete",
        route: location.pathname,
      });
      clearPendingNavigation();
      targetRef.current = null;
    });

    return () => cancelAnimationFrame(id);
  }, [location.pathname, sendMessage, clearPendingNavigation]);

  return null;
}
