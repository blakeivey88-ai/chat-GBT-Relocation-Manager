/**
 * Display ads for public free-tool pages.
 *
 * Edit IDs in /display-ads-config.js only (publisher id + slot map).
 *
 * Markup:
 *   <aside class="rm-ad-slot rm-ad-slot--leaderboard"
 *          data-rm-ad-slot="rate_calc_top"
 *          data-rm-ad-format="horizontal"
 *          aria-label="Advertisement"></aside>
 *
 * Live ads load only after analytics/ad consent (same key as analytics-loader).
 * Without a client id, reserved empty spaces still render for layout readiness.
 */
(function () {
  const CONSENT_KEY = "rm-analytics-consent";
  const cfg = Object.assign(
    {
      adsenseClientId: "",
      enabled: true,
      testMode: false,
      autoAds: true,
      slots: {},
    },
    window.RELOCATION_MANAGER_ADS_CONFIG || {},
  );

  function readConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (e) {
      return null;
    }
  }

  function clientId() {
    return String(cfg.adsenseClientId || "").trim();
  }

  function hasLiveAds() {
    return Boolean(cfg.enabled && /^ca-pub-\d+$/i.test(clientId()));
  }

  function ensureShell(slot) {
    if (slot.dataset.rmAdReady === "1") return;
    slot.dataset.rmAdReady = "1";
    if (!slot.querySelector(".rm-ad-slot__label")) {
      const label = document.createElement("span");
      label.className = "rm-ad-slot__label";
      label.textContent = "Advertisement";
      slot.insertBefore(label, slot.firstChild);
    }
    if (!slot.querySelector(".rm-ad-slot__frame")) {
      const frame = document.createElement("div");
      frame.className = "rm-ad-slot__frame";
      slot.appendChild(frame);
    }
  }

  function setState(slot, state) {
    ensureShell(slot);
    slot.classList.remove("is-empty", "is-pending", "is-blocked", "is-filled");
    slot.classList.add("is-" + state);
  }

  function paintPlaceholders(state) {
    document.querySelectorAll("[data-rm-ad-slot]").forEach(function (slot) {
      if (slot.classList.contains("is-filled")) return;
      setState(slot, state);
    });
  }

  let adsScriptLoading = false;
  let adsScriptLoaded = false;

  function loadAdsenseScript(done) {
    if (adsScriptLoaded) {
      done();
      return;
    }
    if (adsScriptLoading) {
      window.addEventListener(
        "rm-adsense-ready",
        function once() {
          window.removeEventListener("rm-adsense-ready", once);
          done();
        },
        { once: true },
      );
      return;
    }
    adsScriptLoading = true;
    const s = document.createElement("script");
    s.async = true;
    s.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
      encodeURIComponent(clientId());
    s.crossOrigin = "anonymous";
    s.onload = function () {
      adsScriptLoaded = true;
      adsScriptLoading = false;
      window.dispatchEvent(new Event("rm-adsense-ready"));
      done();
    };
    s.onerror = function () {
      adsScriptLoading = false;
      paintPlaceholders("empty");
    };
    document.head.appendChild(s);
  }

  function resolveSlotId(slot) {
    const fromAttr = String(slot.getAttribute("data-rm-ad-slot-id") || "").trim();
    if (/^\d+$/.test(fromAttr)) return fromAttr;
    const name = String(slot.getAttribute("data-rm-ad-slot") || "").trim();
    const fromConfig = String((cfg.slots && cfg.slots[name]) || "").trim();
    if (/^\d+$/.test(fromConfig)) return fromConfig;
    return "";
  }

  function fillSlot(slot) {
    ensureShell(slot);
    const frame = slot.querySelector(".rm-ad-slot__frame");
    if (!frame || slot.dataset.rmAdFilled === "1") return;

    const slotId = resolveSlotId(slot);
    // Without per-slot unit IDs, keep reserved space only (layout ready).
    if (!/^\d+$/.test(slotId)) {
      setState(slot, "empty");
      return;
    }

    frame.innerHTML = "";
    frame.removeAttribute("style");
    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", clientId());
    ins.setAttribute("data-ad-slot", slotId);
    const format = String(slot.getAttribute("data-rm-ad-format") || "auto");
    if (format === "horizontal") {
      ins.setAttribute("data-ad-format", "horizontal");
      ins.setAttribute("data-full-width-responsive", "true");
    } else if (format === "rectangle") {
      ins.style.minWidth = "250px";
      ins.style.minHeight = "250px";
      ins.setAttribute("data-ad-format", "rectangle");
    } else {
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "true");
    }
    if (cfg.testMode) {
      ins.setAttribute("data-adtest", "on");
    }
    frame.appendChild(ins);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      slot.dataset.rmAdFilled = "1";
      setState(slot, "filled");
    } catch (e) {
      setState(slot, "empty");
    }
  }

  function enableAutoAdsIfConfigured() {
    if (!cfg.autoAds || !hasLiveAds()) return;
    // Loading adsbygoogle.js with ?client= is enough for AdSense Auto ads
    // when Auto ads is enabled in the AdSense dashboard for this site.
    try {
      window.adsbygoogle = window.adsbygoogle || [];
    } catch (e) {
      /* noop */
    }
  }

  function tryFillAds() {
    if (!hasLiveAds()) {
      paintPlaceholders("empty");
      return;
    }
    const consent = readConsent();
    if (consent === "denied") {
      paintPlaceholders("blocked");
      return;
    }
    if (consent !== "granted") {
      paintPlaceholders("pending");
      return;
    }
    loadAdsenseScript(function () {
      enableAutoAdsIfConfigured();
      document.querySelectorAll("[data-rm-ad-slot]").forEach(fillSlot);
    });
  }

  function init() {
    if (!cfg.enabled) {
      document.querySelectorAll("[data-rm-ad-slot]").forEach(function (slot) {
        slot.hidden = true;
      });
      return;
    }
    document.querySelectorAll("[data-rm-ad-slot]").forEach(ensureShell);
    tryFillAds();
  }

  window.addEventListener("rm-consent-granted", tryFillAds);
  window.addEventListener("rm-consent-denied", function () {
    paintPlaceholders("blocked");
  });

  // Public helper if Blake pastes a client id later without reload tooling.
  window.rmRefreshDisplayAds = tryFillAds;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
