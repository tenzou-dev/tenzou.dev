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

  const SOCIAL_TYPES = [
    ["email", "email"],
    ["github", "github"],
    ["x", "x"],
    ["telegram", "telegram"],
    ["link", "link lain"],
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
    const error = new URLSearchParams(location.search).get("error");
    if (!error) return "";

    const messages = {
      state: "Sesi login kedaluwarsa. Coba lagi.",
      token: "GitHub menolak login. Coba lagi.",
      owner: "Akun GitHub ini tidak punya akses.",
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
    const card = document.createElement("div");
    card.className = "editor-card";
    card.dataset.projectRow = "";

    const head = document.createElement("div");
    head.className = "editor-card-head";

    const title = document.createElement("input");
    title.className = "input";
    title.type = "text";
    title.placeholder = "nama project";
    title.value = project.title || "";
    title.dataset.projectTitle = "";
    title.setAttribute("aria-label", "nama project");

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-btn";
    remove.setAttribute("aria-label", "hapus project");
    remove.textContent = "×";
    remove.addEventListener("click", () => card.remove());

    head.append(title, remove);

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

    const description = document.createElement("textarea");
    description.className = "input textarea";
    description.rows = 2;
    description.placeholder = "deskripsi singkat";
    description.value = project.description || "";
    description.dataset.projectDescription = "";
    description.setAttribute("aria-label", "deskripsi project");

    card.append(head, meta, description);
    return card;
  }

  function postRow(item) {
    const post = item || {};
    const card = document.createElement("div");
    card.className = "editor-card";
    card.dataset.postRow = "";

    const head = document.createElement("div");
    head.className = "editor-card-head";

    const title = document.createElement("input");
    title.className = "input";
    title.type = "text";
    title.placeholder = "judul tulisan";
    title.value = post.title || "";
    title.dataset.postTitle = "";
    title.setAttribute("aria-label", "judul");

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-btn";
    remove.setAttribute("aria-label", "hapus tulisan");
    remove.textContent = "×";
    remove.addEventListener("click", () => card.remove());

    head.append(title, remove);

    const meta = document.createElement("div");
    meta.className = "editor-card-meta";

    const date = document.createElement("input");
    date.className = "input";
    date.type = "date";
    date.value = /^\d{4}-\d{2}-\d{2}$/.test(post.date || "") ? post.date : "";
    date.dataset.postDate = "";
    date.setAttribute("aria-label", "tanggal");

    const url = document.createElement("input");
    url.className = "input";
    url.type = "text";
    url.placeholder = "url (kosongkan = coming soon)";
    url.value = post.url || "";
    url.dataset.postUrl = "";
    url.setAttribute("aria-label", "url tulisan");

    meta.append(date, url);

    const summary = document.createElement("textarea");
    summary.className = "input textarea";
    summary.rows = 2;
    summary.placeholder = "ringkasan singkat";
    summary.value = post.summary || "";
    summary.dataset.postSummary = "";
    summary.setAttribute("aria-label", "ringkasan");

    card.append(head, meta, summary);
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

  function fillForm(content) {
    $('[data-field="name"]').value = content.name || "";
    $('[data-field="version"]').value = content.version || "";
    $('[data-field="intro"]').value = content.intro || "";
    $('[data-field="github"]').value = content.github || "";
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
      projects: $$("[data-project-row]", projectsBox)
        .map((card) => ({
          title: $("[data-project-title]", card).value.trim(),
          meta: $("[data-project-meta]", card).value.trim(),
          url: $("[data-project-url]", card).value.trim(),
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
          date: $("[data-post-date]", card).value,
          summary: $("[data-post-summary]", card).value.trim(),
          url: $("[data-post-url]", card).value.trim(),
        }))
        .filter((post) => post.title),
    };
  }

  /* ---------- views ---------- */

  function showLogin(message, kind) {
    editorForm.hidden = true;
    loginBox.hidden = false;
    signedAs.textContent = "";
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
    editorForm.hidden = false;
    offlineEl.hidden = true;
    setTitle("Content.");
    signedAs.textContent = sessionLogin ? "@" + sessionLogin : "";
    setStatus(statusEl, "memuat…");

    const content = await loadContent();
    if (!content) {
      setStatus(statusEl, "gagal memuat konten.", "err");
      return;
    }

    fillForm(content);
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

  editorForm.addEventListener("submit", async (event) => {
    event.preventDefault();

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

      setStatus(statusEl, "tersimpan ✓", "ok");
    } catch (e) {
      const message = String(e && e.message ? e.message : e);
      setStatus(statusEl, "gagal menyimpan — " + message, "err");
    }
  });

  $("[data-add-project]").addEventListener("click", () => {
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
