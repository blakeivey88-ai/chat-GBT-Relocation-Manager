(function () {
  const cfg = window.RELOCATION_MANAGER_ANALYTICS_CONFIG || { ga4Id: 'G-RK9CJW91EN', clarityId: '' };
  const CONSENT_KEY = 'rm-analytics-consent';

  // Funnel event helper. Safe to call anywhere; drops events silently when
  // analytics are not loaded (no consent) so no user is tracked without opting in.
  window.rmTrack = function (eventName, params) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', eventName, params || {});
    } catch (e) { /* never break the page for analytics */ }
  };

  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) { /* private mode */ }
  }

  function loadAnalytics() {
    if (cfg.ga4Id) {
      const gtagSrc = document.createElement('script');
      gtagSrc.async = true;
      gtagSrc.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4Id)}`;
      document.head.appendChild(gtagSrc);

      const inline = document.createElement('script');
      inline.textContent = `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${String(cfg.ga4Id).replace(/'/g, "\\'")}');`;
      document.head.appendChild(inline);
    }

    if (cfg.clarityId) {
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r);
        t.async = 1;
        t.src = `https://www.clarity.ms/tag/${encodeURIComponent(i)}`;
        y = l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t, y);
      })(window, document, 'clarity', 'script', cfg.clarityId);
    }
  }

  function removeBanner() {
    const el = document.getElementById('rmConsentBanner');
    if (el) el.remove();
  }

  function showBanner() {
    if (document.getElementById('rmConsentBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'rmConsentBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie and analytics choices');
    banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#14335c;color:#fff;padding:16px;box-shadow:0 -4px 20px rgba(0,0,0,.25);font-size:16px;line-height:1.5';
    banner.innerHTML =
      '<div style="max-width:960px;margin:0 auto;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">' +
      '<span style="flex:1 1 320px">We use optional analytics cookies to understand how the site is used. No analytics run unless you allow them. <a href="/privacy.html" style="color:#9ec5ff">Privacy Policy</a></span>' +
      '<span style="display:flex;gap:10px">' +
      '<button type="button" id="rmConsentDecline" style="background:transparent;border:2px solid #9ec5ff;color:#fff;border-radius:10px;padding:10px 18px;font-size:16px;font-weight:700;cursor:pointer">Decline</button>' +
      '<button type="button" id="rmConsentAccept" style="background:#2f7ef7;border:2px solid #2f7ef7;color:#fff;border-radius:10px;padding:10px 18px;font-size:16px;font-weight:700;cursor:pointer">Allow analytics</button>' +
      '</span></div>';
    document.body.appendChild(banner);
    document.getElementById('rmConsentAccept').addEventListener('click', function () {
      saveConsent('granted');
      removeBanner();
      loadAnalytics();
    });
    document.getElementById('rmConsentDecline').addEventListener('click', function () {
      saveConsent('denied');
      removeBanner();
    });
  }

  function addFooterLink() {
    const footer = document.querySelector('.site-footer .footer-bottom');
    if (!footer || document.getElementById('rmPrivacyChoicesLink')) return;
    const link = document.createElement('a');
    link.id = 'rmPrivacyChoicesLink';
    link.href = '#';
    link.textContent = 'Privacy choices';
    link.style.cssText = 'color:inherit;text-decoration:underline';
    link.addEventListener('click', function (event) {
      event.preventDefault();
      try { localStorage.removeItem(CONSENT_KEY); } catch (e) { /* noop */ }
      showBanner();
    });
    footer.appendChild(link);
  }

  // Expose for other pages/scripts.
  window.rmOpenPrivacyChoices = showBanner;

  function init() {
    addFooterLink();
    const consent = readConsent();
    if (consent === 'granted') loadAnalytics();
    else if (consent !== 'denied') showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
