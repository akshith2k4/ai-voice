import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAgent } from "./AgentBridge";
import { STATUS_EVENTS } from "./protocol";
import { sendStatus, sendError } from "./wsConnection";

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
  const { pendingNavigation, clearPendingNavigation, isWalkthroughActive } = useAgent();
  const targetRef = useRef(null);

  // Kick off navigation when pendingNavigation changes
  useEffect(() => {
    if (!pendingNavigation) return;

    // Already on the target route → complete immediately
    if (pendingNavigation === location.pathname) {
      console.log(`[NavigationHandler] Already on ${location.pathname} — sending navigation_complete`);
      sendStatus(STATUS_EVENTS.NAVIGATION_COMPLETE, { route: location.pathname, newRoute: location.pathname });
      clearPendingNavigation();
      return;
    }

    targetRef.current = pendingNavigation;
    console.log(`[NavigationHandler] Navigating to: ${pendingNavigation}`);
    try {
      navigate(pendingNavigation);
    } catch (err) {
      console.error("[NavigationHandler] Route failed:", err);
      sendError("navigate", `Invalid route: ${pendingNavigation}`);
      clearPendingNavigation();
      targetRef.current = null;
    }
  }, [pendingNavigation, navigate, location.pathname, clearPendingNavigation]);

  // Report completion after location actually changes to the target
  useEffect(() => {
    if (!targetRef.current) return;
    if (location.pathname !== targetRef.current) return;

    // Wait one frame for DOM to mount after the route change
    const id = requestAnimationFrame(() => {
      console.log(`[NavigationHandler] Route confirmed: ${location.pathname} — sending navigation_complete`);
      sendStatus(STATUS_EVENTS.NAVIGATION_COMPLETE, { route: location.pathname, newRoute: location.pathname });
      clearPendingNavigation();
      targetRef.current = null;
    });

    return () => cancelAnimationFrame(id);
  }, [location.pathname, clearPendingNavigation]);

  // Listen for user-initiated navigation while a walkthrough is active
  const lastPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (isWalkthroughActive) {
      const pathChanged = location.pathname !== lastPathnameRef.current;
      if (pathChanged) {
        // If it was not initiated by the agent (i.e. targetRef.current doesn't match location.pathname)
        if (targetRef.current !== location.pathname) {
          console.warn(`[NavigationHandler] User manually navigated from ${lastPathnameRef.current} to ${location.pathname}. Sending navigation_complete.`);
          sendStatus(STATUS_EVENTS.NAVIGATION_COMPLETE, { route: location.pathname, newRoute: location.pathname });
        }
      }
    }
    lastPathnameRef.current = location.pathname;
  }, [location.pathname, isWalkthroughActive]);

  return null;
}
