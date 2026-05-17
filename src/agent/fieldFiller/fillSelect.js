export async function fillSelectField(element, value) {
  const selectTrigger = element.querySelector('[role="combobox"], .MuiSelect-select');
  if (!selectTrigger) {
    return { success: false, reason: "Select trigger not found" };
  }

  // Get the specific menu ID this select controls
  const menuId = selectTrigger.getAttribute("aria-controls");

  // Open the dropdown
  selectTrigger.click();

  return new Promise((resolve) => {
    const timeout = 3000;
    const start = Date.now();
    const poll = () => {
      // Find THIS select's specific menu by ID
      const menu = menuId ? document.getElementById(menuId) : null;
      if (menu) {
        const options = menu.querySelectorAll('[role="option"], .MuiMenuItem-root');
        const match = Array.from(options).find(o => {
          const text = o.textContent.trim();
          return text.toUpperCase() === String(value).toUpperCase() ||
                 text.replace(/\s+/g, '').toUpperCase() === String(value).replace(/\s+/g, '').toUpperCase();
        });
        if (match) {
          match.click();
          element.setAttribute("data-agent-filled", "select");
          return resolve({ success: true });
        }
      }
      if (Date.now() - start < timeout) {
        setTimeout(poll, 100);
      } else {
        document.body.click();
        resolve({ success: false, reason: `Option "${value}" not found` });
      }
    };
    setTimeout(poll, 150);
  });
}
