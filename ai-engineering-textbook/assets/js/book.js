/*
 * book.js — the textbook shell.
 * Builds header, sidebar, search, on-page TOC, prev/next, progress tracking,
 * bookmarks, quizzes, code tabs, copy buttons; lazy-loads the vendored
 * highlight.js, Mermaid and KaTeX only when a page needs them.
 * No build step: works from file:// and any static host.
 */
(function () {
  "use strict";

  var body = document.body;
  var ROOT = body.getAttribute("data-root") || ".";
  var CURRENT = body.getAttribute("data-chapter") || "";
  var IS_HOME = body.getAttribute("data-page") === "home";
  var TOC = window.BOOK_TOC || [];
  // Third-party renderers are vendored under assets/vendor so the book works offline.
  var V = ROOT + "/assets/vendor/";
  var CDN = {
    hljs: V + "highlight/highlight.min.js",
    hljsLangs: ["dockerfile", "protobuf", "properties", "nginx", "groovy", "kotlin", "scala"].map(function (l) { return V + "highlight/languages/" + l + ".min.js"; }),
    mermaid: V + "mermaid/mermaid.min.js",
    katexCss: V + "katex/katex.min.css",
    katex: V + "katex/katex.min.js",
    katexAuto: V + "katex/contrib/auto-render.min.js"
  };

  // ---------------------------------------------------------------- storage
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  // ------------------------------------------------------------- toc helpers
  var flat = [];
  TOC.forEach(function (part, pi) {
    part.chapters.forEach(function (c) { flat.push({ id: c.id, title: c.title, mins: c.mins, part: part, pi: pi }); });
  });
  function chapterHref(id) { return ROOT + "/chapters/" + id + ".html"; }
  function findIdx(id) { for (var i = 0; i < flat.length; i++) if (flat[i].id === id) return i; return -1; }
  var curIdx = findIdx(CURRENT);

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var ICON = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m5 12 5 5 9-10"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m7 10 5 5 5-5"/></svg>'
  };

  // ------------------------------------------------------------------ theme
  function effectiveTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("book-theme", t); } catch (e) { /* ignore */ }
    updateThemeIcon();
    rerenderMermaid();
    document.dispatchEvent(new CustomEvent("book:theme", { detail: t }));
  }

  // ------------------------------------------------------------------ shell
  var progress = el("div", { class: "book-progress", role: "progressbar", "aria-label": "Reading progress" });
  var header = el("header", { class: "book-header" });
  header.innerHTML =
    '<button class="icon-btn nav-toggle" aria-label="Toggle navigation" aria-expanded="false">' + ICON.menu + '</button>' +
    '<a class="book-brand" href="' + ROOT + '/index.html"><span class="logo">AI</span><span>AI-Era Engineering <span class="brand-sub">· Textbook</span></span></a>' +
    '<span class="header-spacer"></span>' +
    '<button class="search-trigger" aria-label="Search the book">' + ICON.search + '<span>Search chapters…</span><kbd>/</kbd></button>' +
    '<button class="icon-btn theme-toggle" aria-label="Toggle dark mode"></button>';
  var themeBtn = header.querySelector(".theme-toggle");
  function updateThemeIcon() {
    var dark = effectiveTheme() === "dark";
    themeBtn.innerHTML = dark ? ICON.sun : ICON.moon;
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
  updateThemeIcon();
  themeBtn.addEventListener("click", function () { setTheme(effectiveTheme() === "dark" ? "light" : "dark"); });

  var sidebar = el("nav", { class: "book-sidebar", "aria-label": "Table of contents" });
  var scrim = el("div", { class: "sidebar-scrim" });
  var navToggle = header.querySelector(".nav-toggle");
  function setNav(open) {
    body.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  }
  navToggle.addEventListener("click", function () { setNav(!body.classList.contains("nav-open")); });
  scrim.addEventListener("click", function () { setNav(false); });

  function doneSet() { return store.get("book-done", {}); }

  function renderSidebar() {
    var done = doneSet();
    var count = flat.filter(function (c) { return done[c.id]; }).length;
    var pct = flat.length ? Math.round(count * 100 / flat.length) : 0;
    var html = '<div class="sidebar-progress">' + count + ' of ' + flat.length + ' chapters complete (' + pct + '%)<div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    TOC.forEach(function (part, pi) {
      var hasCurrent = part.chapters.some(function (c) { return c.id === CURRENT; });
      var openKey = store.get("book-open-parts", {});
      var open = hasCurrent || openKey[pi] || (IS_HOME && pi === 0);
      html += '<div class="toc-part' + (open ? " open" : "") + '" data-pi="' + pi + '"><button aria-expanded="' + open + '">' + ICON.chev + '<span>' + esc(part.part) + '</span>' + (part.priority ? '<span class="prio">Priority</span>' : "") + '</button><ol>';
      part.chapters.forEach(function (c) {
        var cur = c.id === CURRENT;
        html += '<li><a href="' + chapterHref(c.id) + '"' + (cur ? ' class="current" aria-current="page"' : "") + '><span>' + esc(c.title) + '</span>' + (done[c.id] ? '<span class="done" title="Completed">✓</span>' : "") + '</a></li>';
      });
      html += "</ol></div>";
    });
    sidebar.innerHTML = html;
    sidebar.querySelectorAll(".toc-part > button").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.parentNode, open = !p.classList.contains("open");
        p.classList.toggle("open", open);
        b.setAttribute("aria-expanded", String(open));
        var o = store.get("book-open-parts", {}); o[p.getAttribute("data-pi")] = open; store.set("book-open-parts", o);
      });
    });
    var cur = sidebar.querySelector("a.current");
    if (cur) cur.scrollIntoView({ block: "center" });
  }

  // wrap content
  var content = document.getElementById("content") || document.querySelector("article, main");
  var main = el("main", { class: "book-main", id: "main" });
  var inner = el("div", { class: "book-main-inner" });
  var onpage = el("aside", { class: "onpage", "aria-label": "On this page" });
  if (content) {
    content.parentNode.insertBefore(main, content);
    inner.appendChild(content);
    inner.appendChild(onpage);
    main.appendChild(inner);
  }
  body.insertBefore(scrim, body.firstChild);
  body.insertBefore(sidebar, body.firstChild);
  body.insertBefore(header, body.firstChild);
  body.insertBefore(progress, body.firstChild);
  renderSidebar();

  // ---------------------------------------------------------- reading progress
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(100, Math.max(0, window.scrollY * 100 / h)) : 0;
      progress.style.width = p + "%";
      progress.setAttribute("aria-valuenow", String(Math.round(p)));
      spy();
      if (CURRENT) saveLastRead(p);
    });
  }
  var lastSave = 0;
  function saveLastRead(p) {
    var now = Date.now();
    if (now - lastSave < 1500) return;
    lastSave = now;
    var c = flat[curIdx];
    store.set("book-last", { id: CURRENT, title: c ? c.title : document.title, y: Math.round(window.scrollY), pct: Math.round(p), ts: now });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  // ------------------------------------------------- headings, anchors, on-page
  var sections = [];
  function slug(s) { return s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }
  if (content) {
    var used = {};
    content.querySelectorAll("h2, h3").forEach(function (h) {
      if (!h.id) {
        var parentSec = h.parentNode && h.parentNode.tagName === "SECTION" && h.parentNode.querySelector("h2") === h ? h.parentNode : null;
        if (!parentSec) {
          var base = slug(h.textContent) || "h";
          var id = base, n = 2;
          while (used[id] || document.getElementById(id)) id = base + "-" + n++;
          h.id = id;
        }
      }
      used[h.id] = true;
      var target = h.id || (h.parentNode && h.parentNode.id);
      if (target) {
        var a = el("a", { class: "heading-anchor", href: "#" + target, "aria-label": "Link to this heading" }, "#");
        h.appendChild(a);
      }
    });
    content.querySelectorAll("section[id] > h2").forEach(function (h) {
      sections.push({ id: h.parentNode.id, el: h.parentNode, title: h.textContent.replace(/#$/, "").trim() });
    });
    if (sections.length) {
      var oh = '<h2>On this page</h2>';
      sections.forEach(function (s) { oh += '<a href="#' + s.id + '" data-id="' + s.id + '">' + esc(s.title) + "</a>"; });
      onpage.innerHTML = oh;
    }
  }
  var activeSec = null;
  function currentSection() {
    var y = window.scrollY + 120, cur = null;
    for (var i = 0; i < sections.length; i++) { if (sections[i].el.offsetTop <= y) cur = sections[i]; }
    return cur;
  }
  function spy() {
    if (!sections.length) return;
    var cur = currentSection();
    var id = cur ? cur.id : null;
    if (id === activeSec) return;
    activeSec = id;
    onpage.querySelectorAll("a").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-id") === id); });
  }

  // ---------------------------------------------------------- chapter tools
  function isDone() { return !!doneSet()[CURRENT]; }
  function setDone(v) {
    var d = doneSet();
    if (v) d[CURRENT] = Date.now(); else delete d[CURRENT];
    store.set("book-done", d);
    renderSidebar();
    syncDoneButtons();
  }
  var doneButtons = [];
  function syncDoneButtons() {
    doneButtons.forEach(function (b) {
      var d = isDone();
      b.setAttribute("aria-pressed", String(d));
      b.innerHTML = ICON.check + (d ? "Completed" : "Mark chapter complete");
      if (b.classList.contains("btn")) b.classList.toggle("done", d);
    });
  }

  function bookmarks() { return store.get("book-bookmarks", []); }
  function addBookmark() {
    var s = currentSection();
    var c = flat[curIdx];
    var list = bookmarks();
    var entry = { id: CURRENT, sec: s ? s.id : "", chapter: c ? c.title : document.title, section: s ? s.title : "Top", ts: Date.now() };
    list = list.filter(function (b) { return !(b.id === entry.id && b.sec === entry.sec); });
    list.unshift(entry);
    store.set("book-bookmarks", list.slice(0, 100));
    toast("Bookmarked: " + entry.section);
  }
  function toast(msg) {
    var t = el("div", { role: "status" }, esc(msg));
    t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:120;padding:10px 16px;border-radius:8px;background:var(--fg);color:var(--bg);font:600 14px var(--font-sans);box-shadow:var(--shadow)";
    body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }

  var head = content && content.querySelector(".chapter-head");
  if (head && CURRENT) {
    var tools = el("div", { class: "chapter-tools" });
    var meta = flat[curIdx];
    if (meta && meta.mins) tools.appendChild(el("span", { class: "chip-btn", "aria-hidden": "true" }, "⏱ ~" + meta.mins + " min read"));
    var doneBtn = el("button", { class: "chip-btn", type: "button" });
    doneBtn.addEventListener("click", function () { setDone(!isDone()); });
    doneButtons.push(doneBtn);
    var bmBtn = el("button", { class: "chip-btn", type: "button" }, ICON.bookmark + "Bookmark current section");
    bmBtn.addEventListener("click", addBookmark);
    var expBtn = el("button", { class: "chip-btn", type: "button" }, ICON.expand + "Expand all answers");
    expBtn.addEventListener("click", function () {
      var all = content.querySelectorAll("details");
      var anyClosed = Array.prototype.some.call(all, function (d) { return !d.open; });
      all.forEach(function (d) { d.open = anyClosed; });
      expBtn.innerHTML = ICON.expand + (anyClosed ? "Collapse all answers" : "Expand all answers");
    });
    var prBtn = el("button", { class: "chip-btn", type: "button" }, ICON.print + "Print / PDF");
    prBtn.addEventListener("click", function () { window.print(); });
    [doneBtn, bmBtn, expBtn, prBtn].forEach(function (b) { tools.appendChild(b); });
    head.appendChild(tools);
  }

  // ------------------------------------------------------------- prev / next
  if (content && curIdx >= 0) {
    var nav = el("nav", { class: "chapter-nav", "aria-label": "Chapter navigation" });
    var prev = flat[curIdx - 1], next = flat[curIdx + 1];
    if (prev) nav.appendChild(el("a", { class: "prev", href: chapterHref(prev.id) }, "<small>← Previous</small>" + esc(prev.title)));
    if (next) nav.appendChild(el("a", { class: "next", href: chapterHref(next.id) }, "<small>Next →</small>" + esc(next.title)));
    var box = el("div", { class: "complete-box" }, "<p>Finished the chapter, exercises and knowledge check?</p>");
    var bigDone = el("button", { class: "btn", type: "button" });
    bigDone.addEventListener("click", function () { setDone(!isDone()); });
    doneButtons.push(bigDone);
    box.appendChild(bigDone);
    content.appendChild(box);
    content.appendChild(nav);
  }
  syncDoneButtons();

  // ---------------------------------------------------------- code blocks
  function enhanceCode() {
    if (!content) return;
    // tabs
    content.querySelectorAll(".code-tabs").forEach(function (tabs, ti) {
      var pres = Array.prototype.filter.call(tabs.children, function (c) { return c.tagName === "PRE"; });
      if (!pres.length) return;
      var bar = el("div", { class: "tab-bar", role: "tablist" });
      var pref = store.get("book-lang", null);
      var initial = 0;
      pres.forEach(function (p, i) { if (pref && p.getAttribute("data-lang") === pref) initial = i; });
      pres.forEach(function (p, i) {
        var lang = p.getAttribute("data-lang") || ("Tab " + (i + 1));
        var b = el("button", { role: "tab", type: "button", "aria-selected": String(i === initial), id: "tab-" + ti + "-" + i }, esc(lang));
        p.setAttribute("role", "tabpanel");
        p.hidden = i !== initial;
        b.addEventListener("click", function () { selectLang(lang); });
        bar.appendChild(b);
      });
      tabs.insertBefore(bar, tabs.firstChild);
    });
    // copy buttons
    content.querySelectorAll("pre > code").forEach(function (code) {
      var pre = code.parentNode;
      if (pre.classList.contains("mermaid")) return;
      var b = el("button", { class: "copy-btn", type: "button", "aria-label": "Copy code" }, "Copy");
      b.addEventListener("click", function () {
        var text = code.innerText;
        var ok = function () { b.textContent = "Copied"; b.classList.add("copied"); setTimeout(function () { b.textContent = "Copy"; b.classList.remove("copied"); }, 1400); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback);
        else fallback();
        function fallback() {
          var ta = el("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
          body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); ok(); } catch (e) { b.textContent = "Select & copy"; }
          ta.remove();
        }
      });
      pre.appendChild(b);
    });
  }
  function selectLang(lang) {
    store.set("book-lang", lang);
    document.querySelectorAll(".code-tabs").forEach(function (tabs) {
      var pres = Array.prototype.filter.call(tabs.children, function (c) { return c.tagName === "PRE"; });
      var has = pres.some(function (p) { return p.getAttribute("data-lang") === lang; });
      if (!has) return;
      var btns = tabs.querySelectorAll(".tab-bar button");
      pres.forEach(function (p, i) {
        var on = p.getAttribute("data-lang") === lang;
        p.hidden = !on;
        if (btns[i]) btns[i].setAttribute("aria-selected", String(on));
      });
    });
  }
  enhanceCode();

  // ----------------------------------------------------------------- quizzes
  function enhanceQuizzes() {
    if (!content) return;
    var quizzes = content.querySelectorAll(".quiz");
    if (!quizzes.length) return;
    var saved = store.get("book-quiz-" + CURRENT, {});
    var score = el("p", { class: "quiz-score", "aria-live": "polite" });
    quizzes[quizzes.length - 1].parentNode.insertBefore(score, quizzes[quizzes.length - 1].nextSibling);
    function updateScore() {
      var answered = 0, correct = 0;
      quizzes.forEach(function (q) { if (q.classList.contains("answered")) { answered++; if (q.getAttribute("data-correct") === "1") correct++; } });
      score.textContent = "Knowledge check: " + correct + " / " + quizzes.length + " correct" + (answered < quizzes.length ? " (" + (quizzes.length - answered) + " unanswered)" : "");
      var reset = el("button", { class: "chip-btn", type: "button" }, "Reset quiz");
      reset.style.marginLeft = "10px";
      reset.addEventListener("click", function () { store.set("book-quiz-" + CURRENT, {}); location.reload(); });
      if (answered) score.appendChild(reset);
    }
    quizzes.forEach(function (q, qi) {
      var answer = q.getAttribute("data-answer");
      var lis = q.querySelectorAll("li[data-k]");
      lis.forEach(function (li) {
        var k = li.getAttribute("data-k");
        var b = el("button", { type: "button" });
        b.innerHTML = '<span class="k">' + esc(k) + ".</span><span>" + li.innerHTML + "</span>";
        li.innerHTML = "";
        li.appendChild(b);
        b.addEventListener("click", function () { choose(k, true); });
      });
      function choose(k, persist) {
        if (q.classList.contains("answered")) return;
        q.classList.add("answered");
        var right = k === answer;
        q.setAttribute("data-correct", right ? "1" : "0");
        lis.forEach(function (li) {
          var lk = li.getAttribute("data-k");
          if (lk === answer) li.classList.add("correct");
          else if (lk === k) li.classList.add("wrong");
          li.querySelector("button").setAttribute("aria-disabled", "true");
        });
        var ex = q.querySelector(".explain");
        if (ex && !ex.querySelector(".result")) ex.insertAdjacentHTML("afterbegin", '<span class="result" style="color:var(--' + (right ? "ok" : "danger") + ')">' + (right ? "Correct." : "Not quite.") + "</span>");
        if (persist) { saved[qi] = k; store.set("book-quiz-" + CURRENT, saved); }
        updateScore();
      }
      if (saved[qi]) choose(saved[qi], false);
    });
    updateScore();
  }
  enhanceQuizzes();

  // ------------------------------------------------------------- lazy loaders
  var loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (res, rej) {
      var s = el("script", { src: src });
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error("failed " + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function loadCss(href) {
    if (loaded[href]) return;
    loaded[href] = true;
    document.head.appendChild(el("link", { rel: "stylesheet", href: href }));
  }

  // syntax highlighting
  function highlight() {
    if (!content) return;
    var blocks = content.querySelectorAll("pre > code");
    if (!blocks.length) return;
    loadScript(CDN.hljs).then(function () {
      return Promise.all(CDN.hljsLangs.map(function (u) { return loadScript(u).catch(function () {}); }));
    }).then(function () {
      var alias = { hcl: "plaintext", terraform: "plaintext", promql: "plaintext", text: "plaintext", console: "bash", shell: "bash", sh: "bash", jsonc: "json", proto: "protobuf", gradle: "groovy", toml: "ini", mermaid: "plaintext" };
      blocks.forEach(function (code) {
        var m = /language-([\w-]+)/.exec(code.className);
        var lang = m ? m[1] : null;
        if (lang && !window.hljs.getLanguage(lang)) {
          var a = alias[lang] || "plaintext";
          code.classList.remove("language-" + lang);
          code.classList.add("language-" + a);
          lang = a;
        }
        if (lang === "plaintext") return;
        try { window.hljs.highlightElement(code); } catch (e) { /* leave plain */ }
      });
    }).catch(function () { /* renderer missing: plain code is fine */ });
  }

  // mermaid
  var mermaidNodes = [];
  var mermaidReady = null;
  function mermaidConfig() {
    var dark = effectiveTheme() === "dark";
    return {
      startOnLoad: false,
      securityLevel: "strict",
      theme: dark ? "dark" : "default",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      flowchart: { htmlLabels: true, curve: "basis" },
      sequence: { mirrorActors: false },
      themeVariables: dark ? { background: "#1a1d23" } : {}
    };
  }
  function renderMermaid() {
    if (!content) return;
    mermaidNodes = Array.prototype.slice.call(content.querySelectorAll("pre.mermaid"));
    if (!mermaidNodes.length) return;
    mermaidNodes.forEach(function (n) { if (!n.hasAttribute("data-src")) n.setAttribute("data-src", n.textContent); });
    mermaidReady = loadScript(CDN.mermaid).then(function () {
      window.mermaid.initialize(mermaidConfig());
      return runMermaid();
    }).catch(function () {
      mermaidNodes.forEach(function (n) { n.insertAdjacentHTML("beforebegin", '<p class="diagram-error">Diagram renderer failed to load — showing diagram source.</p>'); });
    });
  }
  function runMermaid() {
    // render sequentially so one bad diagram never blocks the rest
    return mermaidNodes.reduce(function (p, n) {
      return p.then(function () {
        return window.mermaid.run({ nodes: [n] }).catch(function (err) {
          n.removeAttribute("data-processed");
          n.textContent = n.getAttribute("data-src");
          if (!n.previousElementSibling || !n.previousElementSibling.classList.contains("diagram-error")) {
            n.insertAdjacentHTML("beforebegin", '<p class="diagram-error">Diagram failed to render; source shown. ' + esc((err && err.message || "").slice(0, 160)) + "</p>");
          }
        });
      });
    }, Promise.resolve());
  }
  function rerenderMermaid() {
    if (!mermaidReady || !window.mermaid) return;
    mermaidReady.then(function () {
      window.mermaid.initialize(mermaidConfig());
      mermaidNodes.forEach(function (n) { n.removeAttribute("data-processed"); n.textContent = n.getAttribute("data-src"); });
      runMermaid();
    });
  }

  // KaTeX
  function renderMath() {
    if (!content) return;
    var txt = content.textContent;
    if (txt.indexOf("\\(") < 0 && txt.indexOf("\\[") < 0 && txt.indexOf("$$") < 0) return;
    loadCss(CDN.katexCss);
    loadScript(CDN.katex).then(function () { return loadScript(CDN.katexAuto); }).then(function () {
      window.renderMathInElement(content, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
        ignoredClasses: ["widget", "mermaid"],
        throwOnError: false
      });
    }).catch(function () { /* renderer missing: raw TeX remains readable */ });
  }

  // widgets
  function mountWidgets() {
    if (!content || !window.BookWidgets) return;
    content.querySelectorAll(".widget[data-widget]").forEach(function (w) {
      try { window.BookWidgets.mount(w); }
      catch (e) { w.innerHTML = '<p class="w-fallback">Interactive widget failed to load: ' + esc(e.message) + "</p>"; }
    });
  }

  highlight();
  renderMermaid();
  renderMath();
  mountWidgets();

  // ------------------------------------------------------------------ search
  var dialog = el("div", { class: "search-dialog", role: "dialog", "aria-modal": "true", "aria-label": "Search" });
  dialog.innerHTML = '<div class="search-panel"><header>' + ICON.search + '<input type="search" placeholder="Search every chapter — e.g. ISR, saga, LoRA, keyset pagination" aria-label="Search query" autocomplete="off"><button class="icon-btn s-close" aria-label="Close search">✕</button></header><div class="search-results" role="listbox"></div><div class="search-foot">↑ ↓ to move · Enter to open · Esc to close · all terms must match</div></div>';
  body.appendChild(dialog);
  var sInput = dialog.querySelector("input"), sResults = dialog.querySelector(".search-results");
  var sel = -1, results = [];
  function openSearch() {
    dialog.classList.add("open");
    sInput.focus();
    sInput.select();
    if (!window.BOOK_SEARCH_INDEX) {
      sResults.innerHTML = '<div class="search-empty">Loading index…</div>';
      loadScript(ROOT + "/assets/js/search-index.js").then(runSearch).catch(function () {
        sResults.innerHTML = '<div class="search-empty">Search index not found. Run <code>python3 tools/build.py</code>.</div>';
      });
    } else runSearch();
  }
  function closeSearch() { dialog.classList.remove("open"); }
  header.querySelector(".search-trigger").addEventListener("click", openSearch);
  dialog.querySelector(".s-close").addEventListener("click", closeSearch);
  dialog.addEventListener("click", function (e) { if (e.target === dialog) closeSearch(); });
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); openSearch(); }
    else if (e.key === "Escape") { closeSearch(); setNav(false); }
  });
  var debounce;
  sInput.addEventListener("input", function () { clearTimeout(debounce); debounce = setTimeout(runSearch, 90); });
  sInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter" && results[sel]) { location.href = results[sel].href; closeSearch(); }
  });
  function move(d) {
    var links = sResults.querySelectorAll("a");
    if (!links.length) return;
    sel = (sel + d + links.length) % links.length;
    links.forEach(function (a, i) { a.classList.toggle("sel", i === sel); });
    links[sel].scrollIntoView({ block: "nearest" });
  }
  function runSearch() {
    var idx = window.BOOK_SEARCH_INDEX;
    if (!idx) return;
    var q = sInput.value.trim().toLowerCase();
    sel = -1;
    if (q.length < 2) {
      sResults.innerHTML = '<div class="search-empty">Type at least two characters. ' + idx.length + " pages indexed.</div>";
      results = [];
      return;
    }
    var terms = q.split(/\s+/).filter(Boolean);
    results = [];
    idx.forEach(function (page) {
      var tl = page.title.toLowerCase();
      page.s.forEach(function (s) {
        var hl = s.h.toLowerCase(), txl = s.t.toLowerCase();
        var score = 0;
        for (var i = 0; i < terms.length; i++) {
          var t = terms[i];
          var inT = tl.indexOf(t) >= 0, inH = hl.indexOf(t) >= 0, pos = txl.indexOf(t);
          if (!inT && !inH && pos < 0) return;
          if (inT) score += 6;
          if (inH) score += 10;
          if (pos >= 0) {
            var c = 0, p = pos;
            while (p >= 0 && c < 12) { c++; p = txl.indexOf(t, p + t.length); }
            score += c;
          }
        }
        if (txl.indexOf(q) >= 0) score += 8;
        var first = txl.indexOf(terms[0]);
        results.push({ score: score, page: page, sec: s, pos: first, href: ROOT + "/chapters/" + page.id + ".html#" + s.id });
      });
    });
    results.sort(function (a, b) { return b.score - a.score; });
    results = results.slice(0, 40);
    if (!results.length) { sResults.innerHTML = '<div class="search-empty">No matches for “' + esc(q) + "”.</div>"; return; }
    var re = new RegExp("(" + terms.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "gi");
    sResults.innerHTML = results.map(function (r) {
      var t = r.sec.t, start = Math.max(0, r.pos - 60);
      var snip = (start > 0 ? "…" : "") + t.slice(start, start + 220) + (t.length > start + 220 ? "…" : "");
      return '<a href="' + r.href + '" role="option"><div class="r-ch">' + esc(r.page.title) + '</div><div class="r-h">' + esc(r.sec.h).replace(re, "<mark>$1</mark>") + '</div><div class="r-t">' + esc(snip).replace(re, "<mark>$1</mark>") + "</div></a>";
    }).join("");
    sResults.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeSearch); });
  }

  // ------------------------------------------------------------------- home
  if (IS_HOME) {
    var done = doneSet();
    var grid = document.getElementById("parts-grid");
    if (grid) {
      grid.innerHTML = TOC.map(function (part, pi) {
        var n = part.chapters.length, d = part.chapters.filter(function (c) { return done[c.id]; }).length;
        var mins = part.chapters.reduce(function (a, c) { return a + (c.mins || 0); }, 0);
        return '<a class="part-card" href="' + chapterHref(part.chapters[0].id) + '"><span class="pc-num"><span>' + esc(part.short) + "</span>" + (part.priority ? "<span>★ priority</span>" : "") + '</span><span class="pc-title">' + esc(part.part.replace(/^Part \d+ — /, "")) + '</span><span class="pc-meta">' + n + " chapter" + (n > 1 ? "s" : "") + " · ~" + Math.round(mins / 60) + " h reading · " + d + "/" + n + ' done<span class="bar"><i style="width:' + (n ? d * 100 / n : 0) + '%"></i></span></span></a>';
      }).join("");
    }
    var stats = document.getElementById("book-stats");
    if (stats) {
      var totalMins = flat.reduce(function (a, c) { return a + (c.mins || 0); }, 0);
      var dn = flat.filter(function (c) { return done[c.id]; }).length;
      stats.innerHTML =
        '<div class="stat"><b>' + TOC.length + '</b><span>parts incl. front matter</span></div>' +
        '<div class="stat"><b>' + flat.length + '</b><span>chapters</span></div>' +
        '<div class="stat"><b>~' + Math.round(totalMins / 60) + ' h</b><span>core reading time</span></div>' +
        '<div class="stat"><b>' + dn + '</b><span>chapters you have completed</span></div>';
    }
    var cont = document.getElementById("continue");
    var last = store.get("book-last", null);
    if (cont && last && findIdx(last.id) >= 0) {
      cont.innerHTML = '<a class="btn" href="' + chapterHref(last.id) + '#resume">Continue reading: ' + esc(last.title) + " (" + (last.pct || 0) + "%)</a>";
    }
    var bm = document.getElementById("bookmarks");
    if (bm) {
      var list = bookmarks();
      if (!list.length) bm.innerHTML = "<p>No bookmarks yet. Use <em>Bookmark current section</em> at the top of any chapter.</p>";
      else {
        bm.innerHTML = '<ul class="bookmark-list">' + list.map(function (b, i) {
          return '<li><a href="' + chapterHref(b.id) + (b.sec ? "#" + b.sec : "") + '">' + esc(b.chapter) + " — " + esc(b.section) + '</a><button data-i="' + i + '" aria-label="Remove bookmark">remove</button></li>';
        }).join("") + "</ul>";
        bm.querySelectorAll("button").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var l = bookmarks(); l.splice(+btn.getAttribute("data-i"), 1); store.set("book-bookmarks", l); btn.parentNode.remove();
          });
        });
      }
    }
  }

  // resume position
  if (location.hash === "#resume") {
    var lr = store.get("book-last", null);
    if (lr && lr.id === CURRENT) setTimeout(function () { window.scrollTo(0, lr.y || 0); }, 60);
  }

  // ------------------------------------------------------------------ print
  var openedForPrint = [];
  window.addEventListener("beforeprint", function () {
    openedForPrint = [];
    document.querySelectorAll("details:not([open])").forEach(function (d) { d.open = true; openedForPrint.push(d); });
  });
  window.addEventListener("afterprint", function () { openedForPrint.forEach(function (d) { d.open = false; }); });

  // Roadmap checklists persist per checkbox id
  document.querySelectorAll(".check-list input[type=checkbox][id]").forEach(function (cb) {
    var st = store.get("book-checks", {});
    cb.checked = !!st[cb.id];
    cb.addEventListener("change", function () { var s = store.get("book-checks", {}); s[cb.id] = cb.checked; store.set("book-checks", s); });
  });

  onScroll();
})();
