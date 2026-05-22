import { CursorManager } from "../CursorManager";

export async function closeDialog() {
  const closeBtn = document.querySelector(
    '.MuiDialog-root [aria-label="close"], .MuiDialog-root [aria-label="Close"]'
  );
  if (closeBtn) {
    await CursorManager.animateToAndClick(closeBtn);
    closeBtn.click();
    return { success: true };
  }

  const cancelBtn = Array.from(
    document.querySelectorAll(".MuiDialog-root button")
  ).find((b) => b.textContent.trim() === "Cancel");

  if (cancelBtn) {
    await CursorManager.animateToAndClick(cancelBtn);
    cancelBtn.click();
    return { success: true };
  }

  return { success: false, reason: "No dialog close control found" };
}

