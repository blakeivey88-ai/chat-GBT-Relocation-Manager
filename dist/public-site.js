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

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll('.site-footer .footer-col').forEach((column) => {
    if (!column.querySelector('a[href="/share-an-idea.html"]') && /support|trust|help/i.test(column.textContent || '')) {
      column.insertAdjacentHTML('beforeend', '<a href="/share-an-idea.html">Share an idea</a>');
    }
  });

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
