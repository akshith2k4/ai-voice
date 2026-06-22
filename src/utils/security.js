/*
 * Production security utilities - temporarily disabled.
 *
 * Original implementation kept below for reference.
 *
 * const GUARD_INTERVAL_MS = 3000;
 *
 * function disableConsoleOutput() {
 *   const noop = () => {};
 *   const methods = ['log', 'debug', 'info', 'warn', 'table', 'dir', 'dirxml', 'trace', 'group', 'groupCollapsed', 'groupEnd', 'clear', 'count', 'countReset', 'assert', 'profile', 'profileEnd', 'time', 'timeLog', 'timeEnd', 'timeStamp'];
 *   methods.forEach((method) => {
 *     if (typeof console[method] === 'function') {
 *       console[method] = noop;
 *     }
 *   });
 * }
 *
 * function showWarningBanner() {
 *   try {
 *     console.clear();
 *     console.log(
 *       '%c STOP!',
 *       'color:red;font-size:48px;font-weight:bold;'
 *     );
 *     console.log(
 *       '%cThis is a restricted application. Unauthorized access or reverse-engineering is prohibited.',
 *       'color:red;font-size:16px;'
 *     );
 *   } catch {
 *   }
 * }
 *
 * function startDebuggerTraps() {
 *   setInterval(() => {
 *     const start = performance.now();
 *     debugger;
 *     const elapsed = performance.now() - start;
 *     if (elapsed > 100) {
 *       document.body.innerHTML = '';
 *     }
 *   }, GUARD_INTERVAL_MS);
 * }
 *
 * function blockKeyboardShortcuts() {
 *   document.addEventListener('keydown', (e) => {
 *     if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
 *       e.preventDefault();
 *     }
 *     if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
 *       e.preventDefault();
 *     }
 *     if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
 *       e.preventDefault();
 *     }
 *     if (e.key === 'F12') {
 *       e.preventDefault();
 *     }
 *     if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
 *       e.preventDefault();
 *     }
 *   }, true);
 * }
 *
 * function disableRightClick() {
 *   document.addEventListener('contextmenu', (e) => {
 *     e.preventDefault();
 *   });
 * }
 *
 * export function initSecurity() {
 *   if (!import.meta.env.PROD) return;
 *
 *   showWarningBanner();
 *   disableConsoleOutput();
 *   startDebuggerTraps();
 *   blockKeyboardShortcuts();
 *   disableRightClick();
 * }
 */

export function initSecurity() {}
