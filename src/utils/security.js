/**
 * Production security utilities — anti-debugging, DevTools detection,
 * console protection, and source-view prevention.
 * Only active when import.meta.env.PROD is true.
 */

const GUARD_INTERVAL_MS = 3000;

function disableConsoleOutput() {
  const noop = () => {};
  const methods = ['log', 'debug', 'info', 'warn', 'table', 'dir', 'dirxml', 'trace', 'group', 'groupCollapsed', 'groupEnd', 'clear', 'count', 'countReset', 'assert', 'profile', 'profileEnd', 'time', 'timeLog', 'timeEnd', 'timeStamp'];
  methods.forEach((method) => {
    if (typeof console[method] === 'function') {
      console[method] = noop;
    }
  });
  // Leave console.error functional for critical runtime errors
}

function showWarningBanner() {
  try {
    console.clear();
    console.log(
      '%c⛔ STOP!',
      'color:red;font-size:48px;font-weight:bold;'
    );
    console.log(
      '%cThis is a restricted application. Unauthorized access or reverse-engineering is prohibited.',
      'color:red;font-size:16px;'
    );
  } catch {
    // ignore
  }
}

function startDebuggerTraps() {
  setInterval(() => {
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const elapsed = performance.now() - start;
    // If debugger paused execution for >100ms, DevTools is likely open
    if (elapsed > 100) {
      document.body.innerHTML = '';
    }
  }, GUARD_INTERVAL_MS);
}

function blockKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+I / Cmd+Opt+I — DevTools
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
    }
    // Ctrl+Shift+J / Cmd+Opt+J — Console
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
      e.preventDefault();
    }
    // Ctrl+U / Cmd+U — View Source
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
    }
    // F12 — DevTools
    if (e.key === 'F12') {
      e.preventDefault();
    }
    // Ctrl+Shift+C — Element picker
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
    }
  }, true);
}

function disableRightClick() {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

export function initSecurity() {
  if (!import.meta.env.PROD) return;

  showWarningBanner();
  disableConsoleOutput();
  startDebuggerTraps();
  blockKeyboardShortcuts();
  disableRightClick();
}
