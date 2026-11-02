/* Theme + toast shared by every page. */
(() => {
  const THEME_KEY = "tenzou-theme";
  const root = document.documentElement;
  const toggle = document.querySelector("[data-theme-toggle]");
  const meta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme, persist) {
    root.dataset.theme = theme;

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (e) {
        /* storage blocked */
      }
    }

    if (meta) {
      meta.setAttribute("content", theme === "light" ? "#f3f1ec" : "#000000");
    }

    if (toggle) {
      const next = theme === "dark" ? "light" : "dark";
      toggle.textContent = next + ".";
      toggle.setAttribute("aria-label", "Switch to " + next + " theme");
      toggle.setAttribute("aria-pressed", String(theme === "light"));
    }
  }

  applyTheme(root.dataset.theme === "light" ? "light" : "dark", false);

  if (toggle) {
    toggle.addEventListener("click", () => {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = (event.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || event.target.isContentEditable) return;
    if (event.key === "t" || event.key === "T") {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
    }
  });

  const toastEl = document.querySelector(".toast");
  let timer;

  window.tzToast = (message) => {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-soon]");
    if (!link) return;
    event.preventDefault();
    window.tzToast(link.dataset.soon || "Coming soon.");
  });
})();
