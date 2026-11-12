/* Theme + toast shared by every page. */
(() => {
  const THEME_KEY = "tenzou-theme";
  const FONT_KEY = "tenzou-font";
  const FONTS = ["jetbrains", "ibm", "space", "fira", "system"];
  const ACCENT_KEY = "tenzou-accent";
  const ACCENTS = ["hijau", "kuning", "biru", "ungu", "oranye", "merah", "mono"];
  const BG_KEY = "tenzou-bg";
  const BG_OPACITY_KEY = "tenzou-bg-opacity";
  const BACKGROUNDS = ["none", "code", "grid"];
  const root = document.documentElement;
  const toggle = document.querySelector("[data-theme-toggle]");
  const meta = document.querySelector('meta[name="theme-color"]');

  window.tzApplyFont = (name) => {
    const font = FONTS.includes(name) ? name : "jetbrains";
    root.dataset.font = font;
    try {
      localStorage.setItem(FONT_KEY, font);
    } catch (e) {
      /* storage blocked */
    }
  };

  window.tzApplyAccent = (name) => {
    const accent = ACCENTS.includes(name) ? name : "hijau";
    root.dataset.accent = accent;
    try {
      localStorage.setItem(ACCENT_KEY, accent);
    } catch (e) {
      /* storage blocked */
    }
  };

  window.tzApplyBackground = (style, opacity, persist = true) => {
    const bg = BACKGROUNDS.includes(style) ? style : "code";
    const value = Number(opacity);
    const percent = Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 12;

    root.dataset.bg = bg;
    root.style.setProperty("--bg-art-opacity", String(percent / 100));

    if (!persist) return;
    try {
      localStorage.setItem(BG_KEY, bg);
      localStorage.setItem(BG_OPACITY_KEY, String(percent));
    } catch (e) {
      /* storage blocked */
    }
  };

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
