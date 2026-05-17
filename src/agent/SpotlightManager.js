const SPOTLIGHT_CLASS = "agent-spotlight";

export const SpotlightManager = {
  setSpotlight: (element) => {
    if (!element) return;
    SpotlightManager.clearSpotlight();
    element.classList.add(SPOTLIGHT_CLASS);
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  },

  clearSpotlight: () => {
    document
      .querySelectorAll(`.${SPOTLIGHT_CLASS}`)
      .forEach((el) => el.classList.remove(SPOTLIGHT_CLASS));
  }
};
