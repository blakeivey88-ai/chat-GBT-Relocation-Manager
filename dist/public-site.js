(() => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-site-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        document.body.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
      });
    });
  }

  // Ensure public pages surface free tools in the main nav when missing.
  if (nav && !nav.querySelector('a[href="/tools/"], a[href="/tools"], a[href="/tools/index.html"]')) {
    const pricing = nav.querySelector('a[href*="pricing"]');
    const toolsLink = document.createElement("a");
    toolsLink.href = "/tools/";
    toolsLink.textContent = "Free tools";
    toolsLink.setAttribute("data-free-tools-nav", "");
    if (pricing) pricing.insertAdjacentElement("beforebegin", toolsLink);
    else nav.insertBefore(toolsLink, nav.querySelector(".nav-cta") || null);
  }

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll('.site-footer .footer-col').forEach((column) => {
    if (!column.querySelector('a[href="/share-an-idea.html"]') && /support|trust|help/i.test(column.textContent || '')) {
      column.insertAdjacentHTML('beforeend', '<a href="/share-an-idea.html">Share an idea</a>');
    }
  });

  // Add a Free tools column to footers that only list Marketplace / Trust / Legal.
  const footerGrid = document.querySelector(".site-footer .footer-grid");
  if (
    footerGrid &&
    !footerGrid.querySelector('a[href="/tools/"], a[href="/tools"]') &&
    !footerGrid.querySelector("[data-free-tools-footer]")
  ) {
    const col = document.createElement("nav");
    col.className = "footer-col";
    col.setAttribute("aria-label", "Free tools links");
    col.setAttribute("data-free-tools-footer", "");
    col.innerHTML =
      "<strong>Free tools</strong>" +
      '<a href="/tools/">All free tools</a>' +
      '<a href="/rate-calculator">Rate calculator</a>' +
      '<a href="/tools/cube-fit">Cube fit</a>' +
      '<a href="/tools/wait-cost">Wait cost</a>' +
      '<a href="/tools/before-you-call">Before you call</a>';
    const brand = footerGrid.querySelector(".footer-brand");
    if (brand && brand.nextElementSibling) {
      brand.nextElementSibling.insertAdjacentElement("beforebegin", col);
    } else {
      footerGrid.appendChild(col);
    }
  }

  fetch("/api/account", { credentials: "include" })
    .then((response) => (response.ok ? response.json() : null))
    .then((account) => {
      if (!account?.session?.authenticated) return;
      document
        .querySelectorAll('.site-nav a[href^="/signin"]')
        .forEach((link) => {
          link.textContent = "Sign out";
          link.href = "/";
          link.setAttribute("data-signout", "");
          link.addEventListener("click", async (event) => {
            event.preventDefault();
            link.setAttribute("aria-disabled", "true");
            try {
              await fetch("/api/account", {
                method: "DELETE",
                credentials: "include",
              });
            } finally {
              location.assign("/");
            }
          });
        });
      const cta = document.querySelector("[data-member-cta]");
      if (cta) { cta.textContent = "Member workspace"; cta.href = "/member.html#workbench"; }
      const nav = document.querySelector("[data-site-nav]");
      if (nav && !nav.querySelector('[data-member-tools]')) nav.insertAdjacentHTML("beforeend", '<span data-member-tools class="member-tools"><a href="/member.html#post">Post a load</a><a href="/member.html#loads">Find loads</a></span>');
    })
    .catch(() => {});
})();
