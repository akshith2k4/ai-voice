import { TIMING } from "./protocol";

let cursorEl = null;
let lastX = window.innerWidth - 100; // Start near the bottom-right, near the overlay
let lastY = window.innerHeight - 100;
let inactivityTimeout = null;

function getOrCreateCursor() {
  if (cursorEl) return cursorEl;

  cursorEl = document.createElement("div");
  cursorEl.className = "agent-virtual-cursor";
  cursorEl.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <path d="M0 0V15.5L4.5 11H13L0 0Z" fill="#0f172a" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  `;
  document.body.appendChild(cursorEl);

  // Set initial position
  cursorEl.style.transform = `translate3d(${lastX}px, ${lastY}px, 0)`;
  cursorEl.style.opacity = "0";
  return cursorEl;
}

function playRipple(x, y) {
  const ripple = document.createElement("div");
  ripple.className = "agent-click-ripple";
  ripple.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  document.body.appendChild(ripple);

  // Remove ripple element after animation finishes
  setTimeout(() => {
    ripple.remove();
  }, 500);
}

export const CursorManager = {
  async animateToAndClick(element) {
    if (!element) return;

    const cursor = getOrCreateCursor();

    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = null;
    }

    // Scroll into view if needed
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // Wait for the scroll to settle (MUI components sometimes transition too)
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Recalculate rect in case scrolling moved it
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    // Show the cursor (fade in)
    cursor.style.opacity = "1";

    // Set translation to animate position
    cursor.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;

    // Save position
    lastX = targetX;
    lastY = targetY;

    // Wait for travel animation (matches transition time in spotlight.css)
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Play click ripple
    playRipple(targetX, targetY);

    // Wait for click visual feedback before proceeding (400ms)
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Set inactivity timeout to hide the cursor if no actions happen for 3s
    inactivityTimeout = setTimeout(() => {
      if (cursorEl) {
        cursorEl.style.opacity = "0";
      }
    }, 3000);
  },

  hide() {
    if (cursorEl) {
      cursorEl.style.opacity = "0";
    }
  }
};
