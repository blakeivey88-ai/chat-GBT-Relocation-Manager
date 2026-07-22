(function () {
  const cfg = window.RELOCATION_MANAGER_ANALYTICS_CONFIG || {};

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
})();
