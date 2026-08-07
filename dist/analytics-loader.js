(function () {
  const cfg = window.RELOCATION_MANAGER_ANALYTICS_CONFIG || { ga4Id: 'G-RK9CJW91EN', clarityId: '' };
  const CONSENT_KEY = 'rm-analytics-consent';
  const ATTRIBUTION_KEY = 'rm-marketing-attribution-v1';
  const ATTRIBUTION_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'ad_campaign_id', 'ad_set_id', 'ad_id', 'fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid'];

  // Funnel event helper. Safe to call anywhere; drops events silently when
  // analytics are not loaded (no consent) so no user is tracked without opting in.
  window.rmTrack = function (eventName, params) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', eventName, params || {});
    } catch (e) { /* never break the page for analytics */ }
  };

  window.rmMarketingAttribution = function () {
    if (readConsent() !== 'granted') return {};
    try {
      const saved = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || '{}');
      const wuid = localStorage.getItem('_wuid');
      return { ...saved, ...(wuid && /^wuid_[A-Za-z0-9_-]+$/.test(wuid) ? { anonymous_id: wuid } : {}), consent: true };
    } catch (e) { return {}; }
  };

  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) { /* private mode */ }
  }

  function loadAnalytics() {
    captureAttribution();

    if (!window.whop) {
      (function (w, d, s, u, n, a, b) {
        if (w[n]) return;
        a = w[n] = { q: [], t: +new Date(), s: [], o: u, track: function () { a.q.push([+new Date()].concat([].slice.call(arguments))); }, setScope: function () { a.s = [].slice.call(arguments).filter(function (x) { return typeof x === 'string'; }); a.q.push([+new Date(), 'setScope'].concat(a.s)); }, scope: function () { var c = [].slice.call(arguments); return { track: function () { a.q.push([+new Date()].concat([].slice.call(arguments)).concat([{ __scope: c }])); } }; } };
        b = d.createElement(s); b.async = 1; b.src = u + '/s.js'; d.getElementsByTagName(s)[0].parentNode.insertBefore(b, d.getElementsByTagName(s)[0]);
      })(window, document, 'script', 'https://t.whop.tw', 'whop');
      window.whop.setScope('biz_xfgfRxrQ5hdHTS');
      window.whop.track('page');
    }

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

  function captureAttribution() {
    try {
      const existing = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || '{}');
      if (existing && existing.captured_at) return;
      const params = new URLSearchParams(location.search);
      const next = { consent: true };
      let found = false;
      ATTRIBUTION_FIELDS.forEach(function (field) {
        const value = String(params.get(field) || '').trim().slice(0, field.endsWith('clid') ? 300 : 160);
        if (value) { next[field] = value; found = true; }
      });
      if (!found) return;
      next.captured_at = new Date().toISOString();
      const landing = new URL(location.href);
      const safeQuery = new URLSearchParams();
      ATTRIBUTION_FIELDS.forEach(function (field) {
        const value = String(landing.searchParams.get(field) || '').trim();
        if (value) safeQuery.set(field, value.slice(0, field.endsWith('clid') ? 300 : 160));
      });
      landing.search = safeQuery.toString();
      landing.hash = '';
      next.landing_url = landing.toString().slice(0, 500);
      if (document.referrer && document.referrer.startsWith('https://')) {
        const referrer = new URL(document.referrer);
        referrer.search = '';
        referrer.hash = '';
        next.referrer_url = referrer.toString().slice(0, 500);
      }
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
    } catch (e) { /* private mode */ }
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
