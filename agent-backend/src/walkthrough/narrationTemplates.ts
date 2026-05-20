// ============================================
// Narration Templates for Form Branching
// ============================================

export const TEMPLATES = {
  controllerIntro: (label: string) => `${label} controls what options appear in the fields below.`,
  deltaSwitch: (option: string) => `Now let’s switch to ${option} and see what changes.`,
  autoLoadEmpty: (fieldLabel: string) => `No ${fieldLabel.toLowerCase()} found for this selection. You can still continue without linking one.`
};
