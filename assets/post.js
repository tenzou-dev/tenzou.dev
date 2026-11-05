/* Article page: renders a single post, its tags, likes and comments. */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const slug = new URLSearchParams(location.search).get("slug") || "";

  const loading = $("[data-post-loading]");
  const article = $("[data-post]");
  const missing = $("[data-post-missing]");

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function postTags(value) {
    const list = Array.isArray(value) ? value : String(value || "").split(",");
    return list
      .map((tag) => String(tag || "").trim().replace(/^#+/, ""))
      .filter(Boolean)
      .slice(0, 6);
  }

  function formatDate(value) {
    const raw = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = new Date(raw + "T00:00:00");
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatCommentTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function readingTime(body) {
    const words = String(body || "")
      .replace(/[#>*`[\]-]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
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

  /* ---------- tiny safe markdown ---------- */

  function inline(text, parent) {
    const pattern =
      /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*[^*\n]+\*)/g;
    let last = 0;
    let match;

    while ((match = pattern.exec(text))) {
      if (match.index > last) {
        parent.append(document.createTextNode(text.slice(last, match.index)));
      }

      const token = match[0];

      if (token.startsWith("`")) {
        const code = document.createElement("code");
        code.textContent = token.slice(1, -1);
        parent.append(code);
      } else if (token.startsWith("**")) {
        const strong = document.createElement("strong");
        strong.textContent = token.slice(2, -2);
        parent.append(strong);
      } else if (token.startsWith("[")) {
        const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
        if (link) {
          const a = document.createElement("a");
          a.href = link[2];
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = link[1];
          parent.append(a);
        } else {
          parent.append(document.createTextNode(token));
        }
      } else {
        const em = document.createElement("em");
        em.textContent = token.slice(1, -1);
        parent.append(em);
      }

      last = pattern.lastIndex;
    }

    if (last < text.length) {
      parent.append(document.createTextNode(text.slice(last)));
    }
  }

  function renderBody(container, raw) {
    const lines = String(raw || "").replace(/\r\n/g, "\n").split("\n");
    let paragraph = [];
    let list = null;
    let code = null;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = document.createElement("p");
      inline(paragraph.join(" "), p);
      container.append(p);
      paragraph = [];
    };

    const flushList = () => {
      if (!list) return;
      container.append(list);
      list = null;
    };

    const flushCode = () => {
      if (!code) return;
      const pre = document.createElement("pre");
      const block = document.createElement("code");
      block.textContent = code.join("\n");
      pre.append(block);
      container.append(pre);
      code = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (code) {
        if (trimmed.startsWith("```")) flushCode();
        else code.push(line);
        continue;
      }

      if (!trimmed) {
        flushParagraph();
        flushList();
        continue;
      }

      if (trimmed.startsWith("```")) {
        flushParagraph();
        flushList();
        code = [];
        continue;
      }

      if (trimmed.startsWith("### ")) {
        flushParagraph();
        flushList();
        const h = document.createElement("h3");
        inline(trimmed.slice(4), h);
        container.append(h);
        continue;
      }

      if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
        flushParagraph();
        flushList();
        const h = document.createElement("h2");
        inline(trimmed.replace(/^#{1,2}\s+/, ""), h);
        container.append(h);
        continue;
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        flushParagraph();
        if (list && list.tagName === "OL") flushList();
        if (!list) list = document.createElement("ul");
        const li = document.createElement("li");
        inline(trimmed.slice(2), li);
        list.append(li);
        continue;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        flushParagraph();
        if (list && list.tagName === "UL") flushList();
        if (!list) list = document.createElement("ol");
        const li = document.createElement("li");
        inline(trimmed.replace(/^\d+\.\s+/, ""), li);
        list.append(li);
        continue;
      }

      if (trimmed.startsWith("> ")) {
        flushParagraph();
        flushList();
        const quote = document.createElement("blockquote");
        inline(trimmed.slice(2), quote);
        container.append(quote);
        continue;
      }

      flushList();
      paragraph.push(trimmed);
    }

    flushParagraph();
    flushList();
    flushCode();
  }

  /* ---------- article ---------- */

  function renderTags(container, tags) {
    container.textContent = "";
    if (!tags.length) {
      container.hidden = true;
      return;
    }

    tags.forEach((tag) => {
      const badge = document.createElement("span");
      badge.className = "tag";
      badge.textContent = "#" + tag;
      container.append(badge);
    });
    container.hidden = false;
  }

  function paintPost(post) {
    const title = $("[data-post-title]");
    const meta = $("[data-post-meta]");
    const summary = $("[data-post-summary]");
    const body = $("[data-post-body]");

    title.textContent = post.title;
    meta.textContent = formatDate(post.date) + " · " + readingTime(post.body || post.summary) + " min read";
    renderTags($("[data-post-tags]"), postTags(post.tags));

    if (post.summary) {
      summary.textContent = post.summary;
      summary.hidden = false;
    }

    renderBody(body, post.body || post.summary || "");

    document.title = post.title + " — tenzou.dev";
    const description = document.querySelector('meta[name="description"]');
    if (description && post.summary) description.setAttribute("content", post.summary);

    loading.hidden = true;
    article.hidden = false;
  }

  /* ---------- likes + comments ---------- */

  const likeButton = $("[data-like]");
  const likeIcon = $("[data-like-icon]");
  const likeLabel = $("[data-like-label]");
  const likeCount = $("[data-like-count]");
  const likeStatus = $("[data-like-status]");
  const commentsList = $("[data-comments]");
  const commentsEmpty = $("[data-comments-empty]");
  const commentForm = $("[data-comment-form]");
  const commentName = $("[data-comment-name]");
  const commentBody = $("[data-comment-body]");
  const commentSubmit = $("[data-comment-submit]");
  const commentStatus = $("[data-comment-status]");
  const honeypot = $("[data-comment-website]");

  const likeKey = "tenzou-liked:" + slug;
  const nameKey = "tenzou-comment-name";
  let liked = false;
  let likes = 0;
  let comments = [];

  try {
    liked = localStorage.getItem(likeKey) === "1";
    const savedName = localStorage.getItem(nameKey);
    if (savedName && commentName) commentName.value = savedName;
  } catch (e) {
    /* ignore */
  }

  function paintLikes() {
    if (!likeButton) return;
    likeButton.setAttribute("aria-pressed", liked ? "true" : "false");
    likeIcon.textContent = liked ? "♥" : "♡";
    likeLabel.textContent = liked ? "liked" : "like";
    likeCount.textContent = String(likes);
    likeButton.classList.toggle("is-liked", liked);
  }

  function paintComments() {
    if (!commentsList) return;

    commentsList.textContent = "";
    commentsEmpty.hidden = comments.length > 0;

    comments.forEach((comment) => {
      const li = document.createElement("li");
      li.className = "comment";

      const head = document.createElement("div");
      head.className = "comment-head";

      const name = document.createElement("span");
      name.className = "comment-name";
      name.textContent = comment.name || "anonim";

      const time = document.createElement("time");
      time.className = "comment-time";
      time.dateTime = comment.at || "";
      time.textContent = formatCommentTime(comment.at);

      head.append(name, time);

      const body = document.createElement("p");
      body.className = "comment-body";
      body.textContent = comment.body || "";

      li.append(head, body);
      commentsList.append(li);
    });
  }

  function setStatus(el, text, ok) {
    if (!el) return;
    el.textContent = text;
    el.className = "status" + (ok === true ? " status--ok" : ok === false ? " status--err" : "");
  }

  async function loadEngagement() {
    try {
      const res = await fetch("/api/blog?slug=" + encodeURIComponent(slug), {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = await res.json();
      if (!data || !data.ok) return;

      likes = Number(data.likes) || 0;
      comments = Array.isArray(data.comments) ? data.comments : [];
      paintLikes();
      paintComments();
    } catch (e) {
      /* comments stay empty */
    }
  }

  if (likeButton) {
    likeButton.addEventListener("click", async () => {
      if (likeButton.disabled) return;

      const action = liked ? "unlike" : "like";
      likeButton.disabled = true;
      setStatus(likeStatus, "", null);

      try {
        const res = await fetch("/api/blog", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ slug, action }),
        });
        const data = await res.json();

        if (!res.ok || !data.ok) throw new Error(data.error || "gagal");

        liked = action === "like";
        likes = Number(data.likes) || 0;
        try {
          localStorage.setItem(likeKey, liked ? "1" : "0");
        } catch (e) {
          /* ignore */
        }
        paintLikes();
      } catch (e) {
        setStatus(likeStatus, "gagal, coba lagi.", false);
      } finally {
        likeButton.disabled = false;
      }
    });
  }

  if (commentForm) {
    commentForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = commentName.value.trim();
      const body = commentBody.value.trim();
      if (!name || !body) return;

      commentSubmit.disabled = true;
      setStatus(commentStatus, "mengirim…", null);

      try {
        const res = await fetch("/api/blog", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            slug,
            action: "comment",
            name,
            body,
            website: honeypot ? honeypot.value : "",
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.ok) throw new Error(data.error || "gagal");

        comments = Array.isArray(data.comments) ? data.comments : comments;
        likes = Number(data.likes) || likes;
        if (data.comment) {
          localStorage.setItem(nameKey, name);
          commentBody.value = "";
        }
        paintLikes();
        paintComments();
        setStatus(commentStatus, "terkirim ✓", true);
      } catch (e) {
        setStatus(commentStatus, "gagal mengirim, coba lagi.", false);
      } finally {
        commentSubmit.disabled = false;
      }
    });
  }

  loadContent().then((content) => {
    const posts = content && Array.isArray(content.posts) ? content.posts : [];
    const post = posts.find((item) => {
      if (!item || !String(item.title || "").trim()) return false;
      return (String(item.slug || "").trim() || slugify(item.title)) === slug;
    });

    if (!post) {
      loading.hidden = true;
      missing.hidden = false;
      return;
    }

    paintPost(post);
    paintLikes();
    paintComments();
    loadEngagement();
  });
})();
