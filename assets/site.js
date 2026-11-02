/* Renders the public pages from content.json / the Cloudflare API. */
(() => {
  const CACHE_KEY = "tenzou-content-v2";
  const page = document.body.dataset.page || "";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const ICONS = {
    email:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3.5 6.5 8.5 6 8.5-6"></path></svg>',
    github:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z"></path></svg>',
    x:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.95 4.57a10 10 0 0 1-2.82.77 4.96 4.96 0 0 0 2.16-2.72c-.95.56-2 .96-3.13 1.19a4.92 4.92 0 0 0-8.38 4.48A13.94 13.94 0 0 1 1.64 3.16a4.82 4.82 0 0 0-.66 2.48c0 1.71.87 3.21 2.19 4.1a4.9 4.9 0 0 1-2.23-.62v.06a4.92 4.92 0 0 0 3.95 4.83 4.99 4.99 0 0 1-2.21.08 4.94 4.94 0 0 0 4.6 3.42A9.87 9.87 0 0 1 .96 19.6c-.39 0-.78-.02-1.17-.07a13.99 13.99 0 0 0 7.56 2.21c9.05 0 14-7.5 14-13.99 0-.21 0-.42-.02-.63a9.94 9.94 0 0 0 2.62-2.55Z"></path></svg>',
    telegram:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.94 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.06 0Zm4.96 7.22c.1 0 .32.03.47.14a.5.5 0 0 1 .17.33c.02.09.04.3.02.47-.18 1.9-.96 6.5-1.36 8.63-.17.9-.5 1.2-.82 1.23-.7.06-1.22-.46-1.9-.9-1.05-.7-1.65-1.13-2.68-1.8-1.18-.79-.41-1.22.26-1.92.18-.18 3.25-2.97 3.31-3.23 0-.03.01-.15-.06-.21s-.17-.04-.25-.02c-.1.02-1.79 1.14-5.06 3.34-.48.33-.91.49-1.3.48-.43 0-1.25-.24-1.87-.44-.75-.25-1.35-.37-1.3-.79.03-.21.33-.44.9-.66 3.5-1.53 5.83-2.53 7-3.02 3.33-1.38 4.02-1.62 4.47-1.63Z"></path></svg>',
    link:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"></path></svg>',
  };

  const SOCIAL_LABEL = {
    email: "Email",
    github: "GitHub",
    x: "X",
    telegram: "Telegram",
    link: "Link",
  };

  function safeUrl(value, allowMail) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (allowMail && /^mailto:/i.test(url)) return url;
    return "";
  }

  function cacheRead() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function cacheWrite(content) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(content));
    } catch (e) {
      /* ignore */
    }
  }

  async function loadContent() {
    try {
      const res = await fetch("/api/content", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.content && typeof data.content === "object") {
          cacheWrite(data.content);
          return data.content;
        }
      }
    } catch (e) {
      /* no API (static hosting or local file) */
    }

    try {
      const res = await fetch("content.json", { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        cacheWrite(data);
        return data;
      }
    } catch (e) {
      /* ignore */
    }

    return cacheRead();
  }

  function fillChrome(content) {
    const name = String(content.name || "").trim();
    $$("[data-brand]").forEach((el) => {
      el.textContent = name ? name + "." : ".";
    });
    $$("[data-version]").forEach((el) => {
      el.textContent = content.version || "";
    });
  }

  function renderName(el, name) {
    const label = String(name || "").trim();
    if (el.getAttribute("aria-label") === label && el.childElementCount > 0) return;

    el.setAttribute("aria-label", label);
    el.textContent = "";

    [...label]
      .filter((char) => char.trim() !== "")
      .forEach((char, index) => {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.setProperty("--i", String(index));
        span.setAttribute("aria-hidden", "true");
        el.append(span);
      });

    const dot = document.createElement("span");
    dot.textContent = ".";
    dot.style.setProperty("--i", String([...label].filter((char) => char.trim() !== "").length));
    dot.setAttribute("aria-hidden", "true");
    el.append(dot);
  }

  function renderSocials(container, socials) {
    if (!container) return;
    container.textContent = "";

    (Array.isArray(socials) ? socials : []).forEach((item) => {
      const url = safeUrl(item && item.url, true);
      if (!url) return;

      const type = String((item && item.type) || "link");
      const label = SOCIAL_LABEL[type] || SOCIAL_LABEL.link;
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("aria-label", label);
      link.title = label.toLowerCase();
      link.innerHTML = ICONS[type] || ICONS.link;

      if (/^https?:/i.test(url)) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      container.append(link);
    });

    container.hidden = container.children.length === 0;
  }

  async function renderWhere(el) {
    if (!el) return;
    try {
      const res = await fetch("/api/where", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("no api");

      const data = await res.json();
      const lat = Number(data && data.lat);
      const lon = Number(data && data.lon);

      if (!data || data.ok === false || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error("no geo");
      }

      const place = [data.city, data.country].filter(Boolean).join(", ");
      el.textContent = lat.toFixed(5) + ", " + lon.toFixed(5);
      el.title = "Your approximate location" + (place ? " — " + place : "");
      el.hidden = false;
    } catch (e) {
      el.hidden = true;
      el.textContent = "";
    }
  }

  function listNote(text) {
    const li = document.createElement("li");
    const p = document.createElement("p");
    p.className = "list-note";
    p.textContent = text;
    li.append(p);
    return li;
  }

  function formatDate(value) {
    const raw = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = new Date(raw + "T00:00:00");
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function renderHome(content) {
    const nameEl = $("[data-name]");
    if (nameEl) renderName(nameEl, content.name);

    const intro = $("[data-intro]");
    if (intro && content.intro) intro.textContent = content.intro;

    renderSocials($("[data-socials]"), content.socials);
    renderWhere($("[data-where]"));
  }

  function renderPosts(content) {
    const list = $("[data-posts]");
    if (!list) return;

    const posts = (Array.isArray(content.posts) ? content.posts : [])
      .filter((post) => post && String(post.title || "").trim())
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    list.textContent = "";

    if (!posts.length) {
      list.append(listNote("nothing published yet."));
      return;
    }

    posts.forEach((post) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      const url = safeUrl(post.url, false);

      link.className = "row";

      if (url) {
        link.href = url;
        if (/^https?:/i.test(url)) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
      } else {
        link.href = "#";
        link.dataset.soon = "Masih ditulis — segera hadir.";
      }

      const title = document.createElement("span");
      title.className = "row-title";
      title.textContent = post.title;

      const meta = document.createElement("span");
      meta.className = "row-meta";
      meta.textContent = formatDate(post.date);

      const arrow = document.createElement("span");
      arrow.className = "row-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";

      link.append(title, meta, arrow);
      li.append(link);

      if (post.summary) {
        const desc = document.createElement("p");
        desc.className = "row-desc";
        desc.textContent = post.summary;
        li.append(desc);
      }

      list.append(li);
    });
  }

  function renderProjects(content) {
    const list = $("[data-projects]");
    const sub = $("[data-projects-sub]");
    if (!list) return;

    const user = String(content.github || "").replace(/[^a-zA-Z0-9-]/g, "");
    const profile = "https://github.com/" + user;

    if (sub && user) {
      sub.textContent = "Public repos only, pulled live from GitHub — ";
      const link = document.createElement("a");
      link.href = profile;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "inline-link";
      link.textContent = "@" + user;
      sub.append(link, ".");
    }

    if (!user) {
      list.textContent = "";
      list.append(listNote("no github username set — add one in /admin."));
      return;
    }

    const repoCacheKey = "tenzou-repos-" + user.toLowerCase();

    const paint = (repos) => {
      list.textContent = "";

      if (!repos.length) {
        list.append(listNote("no public repos yet."));
        return;
      }

      repos.forEach((repo) => {
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.className = "row";
        link.href = repo.html_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        const title = document.createElement("span");
        title.className = "row-title";
        title.textContent = repo.name;

        const metaBits = [];
        if (repo.language) metaBits.push(repo.language);
        if (repo.stargazers_count > 0) metaBits.push("★ " + repo.stargazers_count);
        if (repo.archived) metaBits.push("archived");

        const meta = document.createElement("span");
        meta.className = "row-meta";
        meta.textContent = metaBits.join(" · ");

        const arrow = document.createElement("span");
        arrow.className = "row-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "↗";

        link.append(title, meta, arrow);
        li.append(link);

        if (repo.description) {
          const desc = document.createElement("p");
          desc.className = "row-desc";
          desc.textContent = repo.description;
          li.append(desc);
        }

        list.append(li);
      });
    };

    try {
      const cached = sessionStorage.getItem(repoCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Date.now() - parsed.at < 10 * 60 * 1000 && Array.isArray(parsed.repos)) {
          paint(parsed.repos);
          return;
        }
      }
    } catch (e) {
      /* ignore */
    }

    list.textContent = "";
    list.append(listNote("fetching repos…"));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    fetch(
      "https://api.github.com/users/" +
        encodeURIComponent(user) +
        "/repos?per_page=100&sort=updated&type=owner",
      { headers: { accept: "application/vnd.github+json" }, signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error("github " + res.status);
        return res.json();
      })
      .then((repos) => {
        if (!Array.isArray(repos)) throw new Error("unexpected response");
        const clean = repos
          .filter((repo) => repo && !repo.fork)
          .slice(0, 40)
          .map((repo) => ({
            name: repo.name,
            html_url: repo.html_url,
            description: repo.description,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            archived: repo.archived,
          }));

        try {
          sessionStorage.setItem(repoCacheKey, JSON.stringify({ at: Date.now(), repos: clean }));
        } catch (e) {
          /* ignore */
        }

        paint(clean);
      })
      .catch(() => {
        try {
          const cached = sessionStorage.getItem(repoCacheKey);
          const parsed = cached ? JSON.parse(cached) : null;
          if (parsed && Array.isArray(parsed.repos) && parsed.repos.length) {
            paint(parsed.repos);
            return;
          }
        } catch (e) {
          /* ignore */
        }

        list.textContent = "";
        const li = listNote("gagal memuat repo dari GitHub.");
        const link = document.createElement("a");
        link.className = "inline-link";
        link.href = profile;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "buka profil GitHub ↗";
        li.querySelector(".list-note").append(" ", link);
        list.append(li);
      })
      .finally(() => clearTimeout(timer));
  }

  loadContent().then((content) => {
    if (!content || typeof content !== "object") return;
    fillChrome(content);

    if (page === "home") renderHome(content);
    else if (page === "blog") renderPosts(content);
    else if (page === "projects") renderProjects(content);

    document.body.classList.add("content-ready");
  });
})();
