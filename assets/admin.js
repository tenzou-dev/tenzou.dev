/* /admin — GitHub sign-in first, password fallback for local development. */
(() => {
  const TOKEN_KEY = "tenzou-admin";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const loginBox = $("[data-login]");
  const githubLogin = $("[data-github-login]");
  const passwordForm = $("[data-password-login]");
  const usePassword = $("[data-use-password]");
  const editorForm = $("[data-editor]");
  const loginStatus = $("[data-login-status]");
  const statusEl = $("[data-status]");
  const offlineEl = $("[data-offline]");
  const socialsBox = $("[data-socials-editor]");
  const projectsBox = $("[data-projects-editor]");
  const postsBox = $("[data-posts-editor]");
  const signedAs = $("[data-signed-as]");
  const adminTitle = $("[data-admin-title]");
  const adminPage = adminTitle ? adminTitle.closest("main") : null;
  const tabButtons = $$("[data-admin-tab]");
  const tabPanels = $$("[data-tab-panel]");
  const TAB_KEY = "tenzou-admin-tab";

  const SOCIAL_TYPES = [
    ["email", "email"],
    ["github", "github"],
    ["x", "x"],
    ["telegram", "telegram"],
    ["instagram", "instagram"],
    ["facebook", "facebook"],
    ["linkedin", "linkedin"],
    ["youtube", "youtube"],
    ["tiktok", "tiktok"],
    ["whatsapp", "whatsapp"],
    ["discord", "discord"],
    ["reddit", "reddit"],
    ["pinterest", "pinterest"],
    ["twitch", "twitch"],
    ["spotify", "spotify"],
    ["medium", "medium"],
    ["threads", "threads"],
    ["bluesky", "bluesky"],
    ["gitlab", "gitlab"],
    ["stackoverflow", "stackoverflow"],
    ["dribbble", "dribbble"],
    ["behance", "behance"],
    ["mastodon", "mastodon"],
    ["devdotto", "dev.to"],
    ["link", "otomatis (dari URL)"],
  ];

  let mode = "password";
  let hasPassword = true;
  let sessionLogin = "";

  function token() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setToken(value) {
    try {
      if (value) sessionStorage.setItem(TOKEN_KEY, value);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function setStatus(el, message, kind) {
    if (!el) return;
    el.textContent = message || "";
    el.className = "status" + (kind ? " status--" + kind : "");
  }

  function setTitle(text) {
    if (adminTitle) adminTitle.textContent = text;
  }

  function activateTab(name) {
    const valid = tabButtons.some((button) => button.dataset.adminTab === name);
    const active = valid ? name : "profile";

    tabButtons.forEach((button) => {
      const selected = button.dataset.adminTab === active;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });

    tabPanels.forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== active;
    });

    try {
      localStorage.setItem(TAB_KEY, active);
    } catch (e) {
      /* ignore */
    }
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.adminTab));
  });

  let cardSeq = 0;

  function editorCard(kind, label, note) {
    const card = document.createElement("div");
    card.className = "editor-card";
    card.dataset[kind] = "";

    const head = document.createElement("div");
    head.className = "editor-card-head";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "editor-card-toggle";
    toggle.setAttribute("aria-expanded", "false");

    const caret = document.createElement("span");
    caret.className = "editor-card-caret";
    caret.setAttribute("aria-hidden", "true");
    caret.textContent = "▸";

    const name = document.createElement("span");
    name.className = "editor-card-name";
    name.textContent = label;

    const noteEl = document.createElement("span");
    noteEl.className = "editor-card-note";
    noteEl.textContent = note || "";

    toggle.append(caret, name, noteEl);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-btn";
    remove.setAttribute("aria-label", "hapus");
    remove.textContent = "×";
    remove.addEventListener("click", () => card.remove());

    const body = document.createElement("div");
    body.className = "editor-card-body";
    body.id = "editor-card-" + (++cardSeq);
    body.hidden = true;
    toggle.setAttribute("aria-controls", body.id);

    head.append(toggle, remove);
    card.append(head, body);

    const setOpen = (open) => {
      body.hidden = !open;
      card.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      caret.textContent = open ? "▾" : "▸";
    };

    toggle.addEventListener("click", () => setOpen(body.hidden));

    return { card, body, name, note: noteEl, toggle, setOpen };
  }

  async function detectStack(card, force = false) {
    const urlInput = $("[data-project-url]", card);
    const stackInput = $("[data-project-stack]", card);
    const status = $("[data-project-detect]", card);
    if (!urlInput || !stackInput) return;

    const url = urlInput.value.trim();
    if (!/^https?:\/\//i.test(url)) {
      setStatus(status, "");
      return;
    }

    if (!force && stackInput.value.trim() && stackInput.dataset.auto !== "1") return;

    setStatus(status, "menganalisa…");

    try {
      const headers = { accept: "application/json" };
      if (mode === "password") headers.authorization = "Bearer " + token();

      const res = await fetch("/api/project-meta?url=" + encodeURIComponent(url), {
        headers,
        credentials: "same-origin",
        cache: "no-store",
      });

      if (res.status === 401) throw new Error("login");
      const data = await res.json().catch(() => null);

      if (data && data.ok && data.stack) {
        if (force || !stackInput.value.trim() || stackInput.dataset.auto === "1") {
          stackInput.value = data.stack;
          stackInput.dataset.auto = "1";
        }
        setStatus(status, "terdeteksi otomatis", "ok");
      } else {
        setStatus(status, "tidak terdeteksi · isi manual", "err");
      }
    } catch (e) {
      setStatus(
        status,
        e && e.message === "login" ? "login ulang, lalu coba lagi" : "gagal mendeteksi · isi manual",
        "err"
      );
    }
  }

  function autoDetectProjects() {
    const cards = $$("[data-project-row]", projectsBox)
      .filter((card) => {
        const url = $("[data-project-url]", card).value.trim();
        const stack = $("[data-project-stack]", card).value.trim();
        return /^https?:\/\//i.test(url) && !stack;
      })
      .slice(0, 6);

    cards.reduce((previous, card) => previous.then(() => detectStack(card)), Promise.resolve());
  }

  async function checkAuth(password) {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { authorization: "Bearer " + password },
      });
      if (res.status === 200) return { result: "ok" };
      if (res.status === 401) return { result: "bad" };

      const data = await res.json().catch(() => null);
      return { result: "config", message: (data && data.error) || "server error " + res.status };
    } catch (e) {
      return { result: "offline" };
    }
  }

  async function getConfig() {
    try {
      const res = await fetch("/api/auth/config", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("config");
      const data = await res.json();
      return {
        github: Boolean(data && data.github),
        password: Boolean(data && data.password),
      };
    } catch (e) {
      return { github: false, password: true };
    }
  }

  async function getSession() {
    try {
      const res = await fetch("/api/auth/session", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (res.status !== 200) return "";
      const data = await res.json();
      return data && data.ok && data.login ? data.login : "";
    } catch (e) {
      return "";
    }
  }

  function currentError() {
    const params = new URLSearchParams(location.search);
    const error = params.get("error");
    if (!error) return "";

    const rejected = params.get("as") || "";
    const messages = {
      state: "Sesi login kedaluwarsa. Coba lagi.",
      token: "GitHub menolak login. Coba lagi.",
      owner: rejected
        ? "Akun GitHub @" + rejected + " tidak punya akses. Klik logo GitHub untuk pilih akun lain."
        : "Akun GitHub ini tidak punya akses. Klik logo GitHub untuk pilih akun lain.",
      config: "Login GitHub belum dikonfigurasi.",
    };

    try {
      history.replaceState(null, "", location.pathname);
    } catch (e) {
      /* ignore */
    }

    return messages[error] || "Login gagal. Coba lagi.";
  }

  async function apiAvailable() {
    try {
      const res = await fetch("/api/content", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const type = res.headers.get("content-type") || "";
      return type.includes("application/json");
    } catch (e) {
      return false;
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
        if (data && data.content && typeof data.content === "object") return data.content;
      }
    } catch (e) {
      /* fall through */
    }

    try {
      const res = await fetch("content.json", { cache: "no-cache" });
      if (res.ok) return await res.json();
    } catch (e) {
      /* ignore */
    }

    return null;
  }

  /* ---------- editor rows ---------- */

  function socialRow(item) {
    const social = item || {};
    const row = document.createElement("div");
    row.className = "editor-row";
    row.dataset.socialRow = "";

    const select = document.createElement("select");
    select.className = "input select";
    select.dataset.socialType = "";
    select.setAttribute("aria-label", "jenis sosial");
    SOCIAL_TYPES.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    });
    select.value = SOCIAL_TYPES.some(([value]) => value === social.type) ? social.type : "link";

    const input = document.createElement("input");
    input.className = "input";
    input.type = "text";
    input.inputMode = "url";
    input.placeholder = "https://… atau mailto:…";
    input.value = social.url || "";
    input.dataset.socialUrl = "";
    input.setAttribute("aria-label", "url sosial");

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-btn";
    remove.setAttribute("aria-label", "hapus sosial");
    remove.textContent = "×";
    remove.addEventListener("click", () => row.remove());

    row.append(select, input, remove);
    return row;
  }

  function projectRow(item) {
    const project = item || {};
    const ui = editorCard("projectRow", project.title || "project baru", project.meta || "");
    const { card, body } = ui;

    const title = document.createElement("input");
    title.className = "input";
    title.type = "text";
    title.placeholder = "nama project";
    title.value = project.title || "";
    title.dataset.projectTitle = "";
    title.setAttribute("aria-label", "nama project");

    const preview = () => {
      ui.name.textContent = title.value.trim() || "project baru";
    };
    title.addEventListener("input", preview);

    const meta = document.createElement("div");
    meta.className = "editor-card-meta";

    const label = document.createElement("input");
    label.className = "input";
    label.type = "text";
    label.placeholder = "label (mis. 2025 · web)";
    label.value = project.meta || "";
    label.dataset.projectMeta = "";
    label.setAttribute("aria-label", "label project");

    const url = document.createElement("input");
    url.className = "input";
    url.type = "text";
    url.placeholder = "https://… (opsional)";
    url.value = project.url || "";
    url.dataset.projectUrl = "";
    url.setAttribute("aria-label", "url project");

    meta.append(label, url);

    const stackRow = document.createElement("div");
    stackRow.className = "project-stack";

    const stack = document.createElement("input");
    stack.className = "input";
    stack.type = "text";
    stack.placeholder = "bahasa / stack — terisi otomatis dari link";
    stack.value = project.stack || "";
    stack.dataset.projectStack = "";
    stack.setAttribute("aria-label", "bahasa atau stack project");
    stack.addEventListener("input", () => {
      stack.dataset.auto = "";
    });

    const detect = document.createElement("button");
    detect.type = "button";
    detect.className = "btn btn--ghost btn--sm";
    detect.textContent = "deteksi";
    detect.addEventListener("click", () => detectStack(card, true));

    const detectStatus = document.createElement("span");
    detectStatus.className = "status";
    detectStatus.dataset.projectDetect = "";
    detectStatus.setAttribute("role", "status");

    stackRow.append(stack, detect, detectStatus);

    const description = document.createElement("textarea");
    description.className = "input textarea";
    description.rows = 2;
    description.placeholder = "deskripsi singkat";
    description.value = project.description || "";
    description.dataset.projectDescription = "";
    description.setAttribute("aria-label", "deskripsi project");

    const note = () => {
      ui.note.textContent = label.value.trim();
    };
    url.addEventListener("change", () => {
      stack.dataset.auto = "";
      detectStack(card, true);
    });
    label.addEventListener("input", note);

    ui.toggle.addEventListener("click", () => {
      if (!body.hidden) detectStack(card);
    });

    body.append(title, meta, stackRow, description);

    if (!project.title) {
      ui.setOpen(true);
      queueMicrotask(() => title.focus());
    }

    return card;
  }

  function postRow(item) {
    const post = item || {};
    const ui = editorCard("postRow", post.title || "tulisan baru", post.date || "tanpa tanggal");
    const { card, body } = ui;

    const title = document.createElement("input");
    title.className = "input";
    title.type = "text";
    title.placeholder = "judul tulisan";
    title.value = post.title || "";
    title.dataset.postTitle = "";
    title.setAttribute("aria-label", "judul");
    title.addEventListener("input", () => {
      ui.name.textContent = title.value.trim() || "tulisan baru";
    });

    const meta = document.createElement("div");
    meta.className = "editor-card-meta";

    const date = document.createElement("input");
    date.className = "input";
    date.type = "date";
    date.value = /^\d{4}-\d{2}-\d{2}$/.test(post.date || "")
      ? post.date
      : new Date().toISOString().slice(0, 10);
    date.dataset.postDate = "";
    date.setAttribute("aria-label", "tanggal");
    date.addEventListener("change", () => {
      ui.note.textContent = date.value || "tanpa tanggal";
    });

    const tags = document.createElement("input");
    tags.className = "input";
    tags.type = "text";
    tags.placeholder = "tag, dipisah koma (mis. web, catatan)";
    tags.value = Array.isArray(post.tags) ? post.tags.join(", ") : post.tags || "";
    tags.dataset.postTags = "";
    tags.setAttribute("aria-label", "tag tulisan");

    meta.append(date, tags);

    const summary = document.createElement("textarea");
    summary.className = "input textarea";
    summary.rows = 2;
    summary.placeholder = "ringkasan singkat";
    summary.value = post.summary || "";
    summary.dataset.postSummary = "";
    summary.setAttribute("aria-label", "ringkasan");

    const slug = document.createElement("input");
    slug.type = "hidden";
    slug.value = post.slug || "";
    slug.dataset.postSlug = "";

    const bodyInput = document.createElement("textarea");
    bodyInput.className = "input textarea";
    bodyInput.rows = 8;
    bodyInput.placeholder = "isi artikel — markdown sederhana: ## judul, - list, **bold**, `code`";
    bodyInput.value = post.body || "";
    bodyInput.dataset.postBody = "";
    bodyInput.setAttribute("aria-label", "isi artikel");

    body.append(title, meta, summary, slug, bodyInput);

    if (!post.title) {
      ui.setOpen(true);
      queueMicrotask(() => title.focus());
    }

    return card;
  }

  function renderSocialRows(items) {
    socialsBox.textContent = "";
    const list = Array.isArray(items) ? items : [];
    (list.length ? list : [{}]).forEach((item) => socialsBox.append(socialRow(item)));
  }

  function renderProjectRows(items) {
    projectsBox.textContent = "";
    const list = Array.isArray(items) ? items : [];
    (list.length ? list : [{}]).forEach((item) => projectsBox.append(projectRow(item)));
  }

  function renderPostRows(items) {
    postsBox.textContent = "";
    const list = Array.isArray(items) ? items : [];
    (list.length ? list : [{}]).forEach((item) => postsBox.append(postRow(item)));
  }

  /* ---------- form ---------- */

  function syncBackgroundPreview(persist) {
    const style = $('[data-field="background"]');
    const opacity = $('[data-field="backgroundOpacity"]');
    const label = $("[data-bg-opacity-label]");
    if (!style || !opacity) return;

    const percent = Math.min(100, Math.max(0, Math.round(Number(opacity.value) || 0)));
    if (label) label.textContent = percent + "%";

    if (typeof window.tzApplyBackground === "function") {
      window.tzApplyBackground(style.value, percent, persist);
    }
  }

  function fillForm(content) {
    $('[data-field="name"]').value = content.name || "";
    $('[data-field="version"]').value = content.version || "";
    $('[data-field="intro"]').value = content.intro || "";
    $('[data-field="github"]').value = content.github || "";
    const fontField = $('[data-field="font"]');
    if (fontField) {
      fontField.value = content.font || "jetbrains";
      if (typeof window.tzApplyFont === "function") {
        window.tzApplyFont(fontField.value);
      }
    }
    const backgroundField = $('[data-field="background"]');
    const opacityField = $('[data-field="backgroundOpacity"]');
    if (backgroundField) backgroundField.value = content.background || "code";
    if (opacityField) {
      const opacity = Number(content.backgroundOpacity);
      opacityField.value = String(Number.isFinite(opacity) ? Math.min(100, Math.max(0, Math.round(opacity))) : 12);
    }
    syncBackgroundPreview(true);
    renderProjectRows(content.projects);
    renderSocialRows(content.socials);
    renderPostRows(content.posts);
  }

  function collect() {
    return {
      name: $('[data-field="name"]').value.trim(),
      intro: $('[data-field="intro"]').value.trim(),
      version: $('[data-field="version"]').value.trim(),
      github: $('[data-field="github"]').value.trim(),
      font: $('[data-field="font"]') ? $('[data-field="font"]').value : "jetbrains",
      background: $('[data-field="background"]') ? $('[data-field="background"]').value : "code",
      backgroundOpacity: $('[data-field="backgroundOpacity"]')
        ? Number($('[data-field="backgroundOpacity"]').value)
        : 12,
      projects: $$("[data-project-row]", projectsBox)
        .map((card) => ({
          title: $("[data-project-title]", card).value.trim(),
          meta: $("[data-project-meta]", card).value.trim(),
          url: $("[data-project-url]", card).value.trim(),
          stack: $("[data-project-stack]", card).value.trim(),
          description: $("[data-project-description]", card).value.trim(),
        }))
        .filter((project) => project.title),
      socials: $$("[data-social-row]", socialsBox)
        .map((row) => ({
          type: $("[data-social-type]", row).value,
          url: $("[data-social-url]", row).value.trim(),
        }))
        .filter((item) => item.url),
      posts: $$("[data-post-row]", postsBox)
        .map((card) => ({
          title: $("[data-post-title]", card).value.trim(),
          slug: $("[data-post-slug]", card).value.trim(),
          date: $("[data-post-date]", card).value,
          summary: $("[data-post-summary]", card).value.trim(),
          tags: $("[data-post-tags]", card).value.trim(),
          body: $("[data-post-body]", card).value.trim(),
        }))
        .filter((post) => post.title),
    };
  }

  /* ---------- views ---------- */

  function showLogin(message, kind) {
    editorForm.hidden = true;
    loginBox.hidden = false;
    signedAs.textContent = "";
    if (adminPage) adminPage.classList.add("is-signin");
    setTitle("Sign in.");
    setStatus(loginStatus, message || "", kind);

    if (mode === "github") {
      githubLogin.hidden = false;
      passwordForm.hidden = true;
      usePassword.hidden = !hasPassword;
    } else if (mode === "password") {
      githubLogin.hidden = true;
      usePassword.hidden = true;
      passwordForm.hidden = false;
      const input = $("[data-password]");
      if (input) input.focus();
    } else {
      githubLogin.hidden = true;
      passwordForm.hidden = true;
      usePassword.hidden = true;
    }
  }

  async function openEditor(login) {
    sessionLogin = login || "";
    loginBox.hidden = true;
    githubLogin.hidden = true;
    editorForm.hidden = false;
    offlineEl.hidden = true;
    if (adminPage) adminPage.classList.remove("is-signin");
    setTitle("Content.");
    signedAs.textContent = sessionLogin ? "@" + sessionLogin : "";
    setStatus(statusEl, "memuat…");

    const content = await loadContent();
    if (!content) {
      setStatus(statusEl, "gagal memuat konten.", "err");
      return;
    }

    fillForm(content);

    let savedTab = "profile";
    try {
      savedTab = localStorage.getItem(TAB_KEY) || "profile";
    } catch (e) {
      /* ignore */
    }
    activateTab(savedTab);
    autoDetectProjects();

    setStatus(statusEl, "");
  }

  /* ---------- events ---------- */

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = $("[data-password]").value;
    if (!password) return;

    setStatus(loginStatus, "memeriksa…");

    const outcome = await checkAuth(password);
    if (outcome.result === "ok") {
      setToken(password);
      $("[data-password]").value = "";
      await openEditor("");
      return;
    }

    if (outcome.result === "offline") {
      setStatus(loginStatus, "API tidak tersedia di host ini.", "err");
      return;
    }

    if (outcome.result === "config") {
      setStatus(loginStatus, outcome.message, "err");
      return;
    }

    setStatus(loginStatus, "password salah.", "err");
  });

  usePassword.addEventListener("click", () => {
    mode = "password";
    githubLogin.hidden = true;
    usePassword.hidden = true;
    passwordForm.hidden = false;
    setStatus(loginStatus, "");
    $("[data-password]").focus();
  });

  let fontSaveTimer;
  $("[data-field=\"font\"]")?.addEventListener("change", (event) => {
    if (typeof window.tzApplyFont === "function") {
      window.tzApplyFont(event.target.value);
    }

    clearTimeout(fontSaveTimer);
    fontSaveTimer = setTimeout(() => {
      if (!editorForm.hidden) editorForm.requestSubmit();
    }, 350);
  });

  $('[data-field="background"]')?.addEventListener("change", () => {
    syncBackgroundPreview(false);
  });

  $('[data-field="backgroundOpacity"]')?.addEventListener("input", () => {
    syncBackgroundPreview(false);
  });

  editorForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!$('[data-field="name"]').value.trim()) {
      activateTab("profile");
      setStatus(statusEl, "nama wajib diisi.", "err");
      return;
    }

    const headers = { "content-type": "application/json" };

    if (mode === "password") {
      const password = token();
      if (!password) {
        showLogin("Sesi habis, masuk lagi.", "err");
        return;
      }
      headers.authorization = "Bearer " + password;
    }

    setStatus(statusEl, "menyimpan…");

    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        credentials: "same-origin",
        headers,
        body: JSON.stringify(collect()),
      });

      if (res.status === 401) {
        if (mode === "password") setToken("");
        showLogin("Sesi habis, masuk lagi.", "err");
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || "http " + res.status);

      try {
        localStorage.removeItem("tenzou-content-v2");
      } catch (e) {
        /* ignore */
      }

      const fontField = $('[data-field="font"]');
      if (fontField && typeof window.tzApplyFont === "function") {
        window.tzApplyFont(fontField.value);
      }

      syncBackgroundPreview(true);

      setStatus(statusEl, "tersimpan ✓", "ok");
    } catch (e) {
      const message = String(e && e.message ? e.message : e);
      setStatus(statusEl, "gagal menyimpan — " + message, "err");
    }
  });

  $("[data-add-project]").addEventListener("click", () => {
    activateTab("projects");
    projectsBox.append(projectRow({}));
    const cards = $$("[data-project-row]", projectsBox);
    if (cards.length) $("[data-project-title]", cards[cards.length - 1]).focus();
  });

  $("[data-add-social]").addEventListener("click", () => {
    socialsBox.append(socialRow({ type: "link" }));
    const inputs = $$("[data-social-url]", socialsBox);
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  $("[data-add-post]").addEventListener("click", () => {
    activateTab("posts");
    postsBox.append(postRow({}));
    const cards = $$("[data-post-row]", postsBox);
    if (cards.length) $("[data-post-title]", cards[cards.length - 1]).focus();
  });

  $("[data-reload]").addEventListener("click", () => {
    openEditor(sessionLogin);
  });

  $("[data-logout]").addEventListener("click", async () => {
    if (mode === "github") {
      try {
        await fetch("/api/auth/session", { method: "DELETE" });
      } catch (e) {
        /* ignore */
      }
    } else {
      setToken("");
    }

    $("[data-password]").value = "";
    sessionLogin = "";
    showLogin("sudah keluar.", "");
  });

  /* ---------- boot ---------- */

  (async () => {
    const available = await apiAvailable();

    if (!available) {
      loginBox.hidden = true;
      editorForm.hidden = true;
      offlineEl.hidden = false;
      return;
    }

    const config = await getConfig();
    hasPassword = config.password;

    if (config.github) {
      mode = "github";
      const login = await getSession();
      if (login) {
        await openEditor(login);
        return;
      }
      showLogin(currentError());
      return;
    }

    if (config.password) {
      mode = "password";
      const saved = token();
      if (saved) {
        const outcome = await checkAuth(saved);
        if (outcome.result === "ok") {
          await openEditor("");
          return;
        }
        setToken("");
      }
      showLogin(currentError());
      return;
    }

    mode = "none";
    showLogin("Admin belum dikonfigurasi.", "err");
  })();
})();
