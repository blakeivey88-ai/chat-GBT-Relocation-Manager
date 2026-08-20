/**
 * ONE FILE Blake edits for Google AdSense.
 *
 * How to finish hookup:
 * 1. Open Google AdSense → Account → Account information → copy Publisher ID (ca-pub-…).
 * 2. Create ad units (or Auto ads later). Copy each ad unit's number (data-ad-slot).
 * 3. Paste below. Save. Ask Grok/Codex to deploy.
 *
 * Leave a slot id as "" to keep that space reserved but empty (no broken ads).
 */
window.RELOCATION_MANAGER_ADS_CONFIG = {
  // Master switch
  enabled: true,

  // From AdSense: Account → Account information → Publisher ID
  // Example: "ca-pub-1234567890123456"
  adsenseClientId: "ca-pub-9768509838353886",

  // true = Google test ads (use only while verifying; turn false for real ads)
  testMode: false,

  // When true and Auto ads is turned on in AdSense for this site, Google may
  // place ads automatically (in addition to our reserved slots when slot IDs exist).
  autoAds: true,

  // Map page slot names → AdSense ad unit IDs (numbers only)
  // Create units in AdSense → Ads → By ad unit → Display ads
  slots: {
    // Rate calculator: https://relocationmanagerusa.com/rate-calculator
    rate_calc_top: "", // Display · Horizontal / responsive
    rate_calc_sidebar: "", // Display · Medium rectangle 300x250
    rate_calc_mid: "", // Display · In-article or responsive
    rate_calc_footer: "", // Display · Horizontal / responsive

    // Free tools hub: https://relocationmanagerusa.com/tools/
    tools_hub_top: "",
    tools_hub_mid: "",
    tools_hub_footer: "",

    // Cube fit
    cube_fit_top: "",
    cube_fit_sidebar: "",
    cube_fit_mid: "",
    cube_fit_footer: "",

    // Wait cost
    wait_cost_top: "",
    wait_cost_sidebar: "",
    wait_cost_mid: "",
    wait_cost_footer: "",

    // Before you call
    before_call_top: "",
    before_call_mid: "",
    before_call_footer: "",
  },
};
