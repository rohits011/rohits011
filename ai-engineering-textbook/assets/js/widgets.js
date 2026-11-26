/*
 * widgets.js — interactive visualisations used across the book.
 * Usage in a chapter: <div class="widget" data-widget="kafka-consumer-group"></div>
 * book.js calls BookWidgets.mount(el) for each one.
 * Part 1/3: shared helpers + distributed-systems widgets.
 * (widgets-algo.js and widgets-ml.js are loaded on demand by this file.)
 */
(function () {
  "use strict";
  var W = window.BookWidgets = window.BookWidgets || { registry: {} };

  // ------------------------------------------------------------- utilities
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888"; }
  function palette() { return [cssVar("--c1"), cssVar("--c2"), cssVar("--c3"), cssVar("--c4"), cssVar("--c5"), cssVar("--c6")]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function slider(label, min, max, step, value, onInput) {
    var out = h("b", { text: String(value) });
    var inp = h("input", { type: "range", min: min, max: max, step: step, value: value, "aria-label": label });
    inp.addEventListener("input", function () { out.textContent = inp.value; onInput && onInput(+inp.value); });
    var wrap = h("label", null, [label + " ", inp, out]);
    return { el: wrap, input: inp, get: function () { return +inp.value; }, set: function (v) { inp.value = v; out.textContent = v; } };
  }
  function select(label, options, value, onChange) {
    var s = h("select", { "aria-label": label });
    options.forEach(function (o) {
      var opt = h("option", { value: o[0], text: o[1] });
      if (o[0] === value) opt.selected = true;
      s.appendChild(opt);
    });
    s.addEventListener("change", function () { onChange && onChange(s.value); });
    return { el: h("label", null, [label + " ", s]), input: s, get: function () { return s.value; } };
  }
  function button(text, onClick, primary) {
    return h("button", { type: "button", class: primary ? "primary" : "", onclick: onClick, text: text });
  }
  function controls(kids) { return h("div", { class: "w-controls" }, kids); }

  // HiDPI canvas that tracks its container width.
  function canvas(parent, height, draw) {
    var stage = h("div", { class: "w-stage" });
    var cv = h("canvas");
    stage.appendChild(cv);
    parent.appendChild(stage);
    var ctx = cv.getContext("2d");
    var api = { cv: cv, ctx: ctx, w: 0, h: height, stage: stage };
    function resize() {
      var w = Math.max(240, stage.clientWidth || 600);
      var dpr = window.devicePixelRatio || 1;
      api.w = w;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(height * dpr);
      cv.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw && draw();
    }
    api.resize = resize;
    api.w = Math.max(240, stage.clientWidth || 600); // usable before the first async resize
    if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(stage);
    document.addEventListener("book:theme", function () { draw && draw(); });
    setTimeout(resize, 0);
    return api;
  }
  // Deterministic PRNG so diagrams are reproducible.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { // FNV-1a 32-bit
    var x = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193); }
    return x >>> 0;
  }
  function bars(container, rows, opts) {
    // rows: [{label, value, color, text}]
    opts = opts || {};
    var max = opts.max || Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1e-9]));
    container.innerHTML = "";
    var wrap = h("div", { class: "bars" });
    rows.forEach(function (r) {
      var pct = Math.max(0, Math.min(100, r.value * 100 / max));
      wrap.appendChild(h("div", { class: "barrow" }, [
        h("span", { text: r.label }),
        h("div", { class: "track" }, [h("div", { class: "fill", style: "width:" + pct + "%;background:" + (r.color || cssVar("--c1")) })]),
        h("span", { class: "num", text: r.text != null ? r.text : String(r.value) })
      ]));
    });
    container.appendChild(wrap);
  }
  function title(el, text) { el.appendChild(h("p", { class: "w-title", text: text })); }

  W.util = { h: h, cssVar: cssVar, palette: palette, esc: esc, slider: slider, select: select, button: button, controls: controls, canvas: canvas, rng: rng, hashStr: hashStr, bars: bars, title: title };
  W.register = function (name, fn) { W.registry[name] = fn; };

  // Lazy-load companion widget bundles the first time one of their widgets is needed.
  var BUNDLES = {
    "widgets-algo.js": ["big-o", "sorting", "graph-traversal", "btree"],
    "widgets-ml.js": ["gradient-descent", "bias-variance", "kmeans", "neural-net", "attention", "tokenizer", "sampling", "rag-retrieval"]
  };
  var bundlePromises = {};
  function scriptBase() {
    var s = document.querySelector('script[src*="widgets.js"]');
    return s ? s.getAttribute("src").replace(/widgets\.js.*$/, "") : "";
  }
  W.mount = function (el) {
    var name = el.getAttribute("data-widget");
    if (W.registry[name]) { el.innerHTML = ""; W.registry[name](el, W.util); return; }
    var file = null;
    for (var f in BUNDLES) if (BUNDLES[f].indexOf(name) >= 0) file = f;
    if (!file) { el.innerHTML = '<p class="w-fallback">Unknown widget: ' + esc(name) + "</p>"; return; }
    el.innerHTML = '<p class="w-fallback">Loading interactive widget…</p>';
    if (!bundlePromises[file]) {
      bundlePromises[file] = new Promise(function (res, rej) {
        var s = h("script", { src: scriptBase() + file });
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    bundlePromises[file].then(function () {
      if (!W.registry[name]) throw new Error("not registered");
      el.innerHTML = "";
      W.registry[name](el, W.util);
    }).catch(function () { el.innerHTML = '<p class="w-fallback">Could not load widget “' + esc(name) + "”.</p>"; });
  };

  // ======================================================= load-balancer
  W.register("load-balancer", function (el) {
    title(el, "Load balancer simulator — heterogeneous backends");
    var speeds = [1.0, 1.0, 2.0, 0.5];
    var algo = select("Algorithm", [["rr", "Round robin"], ["wrr", "Weighted round robin"], ["lc", "Least connections"], ["p2c", "Power of two choices"], ["random", "Random"], ["hash", "Client-IP hash"]], "rr", reset);
    var rate = slider("Arrival rate (req/tick)", 1, 8, 0.5, 4, null);
    var runBtn = button("Start", toggle, true);
    el.appendChild(controls([algo.el, rate.el, runBtn, button("Reset", reset)]));
    var info = h("p", { class: "w-out", html: "Backends have capacities <b>1×, 1×, 2×, 0.5×</b> (requests completed per tick). Total capacity = 4.5 req/tick." });
    el.appendChild(info);
    var grid = h("div", { class: "w-grid" });
    el.appendChild(grid);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var r = rng(7), timer = null, state;
    function reset() {
      state = { q: speeds.map(function () { return 0; }), served: speeds.map(function () { return 0; }), rr: 0, wrrCur: speeds.map(function () { return 0; }), tick: 0, latSum: 0, latN: 0, dropped: 0 };
      render();
    }
    function pick(clientId) {
      var n = speeds.length, a = algo.get(), i;
      if (a === "rr") { i = state.rr % n; state.rr++; return i; }
      if (a === "wrr") { // smooth weighted round robin (as used by NGINX)
        var total = 0, best = 0;
        for (i = 0; i < n; i++) { state.wrrCur[i] += speeds[i]; total += speeds[i]; if (state.wrrCur[i] > state.wrrCur[best]) best = i; }
        state.wrrCur[best] -= total; return best;
      }
      if (a === "lc") { var b = 0; for (i = 1; i < n; i++) if (state.q[i] / speeds[i] < state.q[b] / speeds[b]) b = i; return b; }
      if (a === "p2c") { var x = Math.floor(r() * n), y = Math.floor(r() * n); return state.q[x] <= state.q[y] ? x : y; }
      if (a === "hash") return clientId % n;
      return Math.floor(r() * n);
    }
    function step() {
      state.tick++;
      // Poisson arrivals
      var lambda = rate.get(), L = Math.exp(-lambda), k = 0, p = 1;
      do { k++; p *= r(); } while (p > L);
      var arrivals = k - 1;
      for (var j = 0; j < arrivals; j++) {
        var client = Math.floor(Math.pow(r(), 2.2) * 50); // skewed client population for hash
        var i = pick(client);
        if (state.q[i] > 60) { state.dropped++; continue; }
        state.latSum += (state.q[i] + 1) / speeds[i]; state.latN++;
        state.q[i]++;
      }
      speeds.forEach(function (s, i) {
        var done = Math.min(state.q[i], Math.floor(s) + (r() < s - Math.floor(s) ? 1 : 0));
        state.q[i] -= done; state.served[i] += done;
      });
      render();
    }
    function render() {
      var pal = palette();
      grid.innerHTML = "";
      speeds.forEach(function (s, i) {
        var card = h("div", { class: "w-card" }, [h("h5", { text: "Server " + (i + 1) + " · " + s + "×" })]);
        var b = h("div");
        bars(b, [
          { label: "in flight", value: state.q[i], color: state.q[i] > 20 ? cssVar("--danger") : pal[i], text: String(state.q[i]) },
          { label: "served", value: state.served[i], color: pal[i], text: String(state.served[i]) }
        ], { max: Math.max(30, Math.max.apply(null, state.served)) });
        card.appendChild(b);
        grid.appendChild(card);
      });
      var lat = state.latN ? (state.latSum / state.latN).toFixed(2) : "–";
      out.innerHTML = "Tick <b>" + state.tick + "</b> · mean queueing delay ≈ <b>" + lat + " ticks</b> · rejected (queue &gt; 60): <b>" + state.dropped + "</b>. " +
        "Try round robin at 4 req/tick: the 0.5× server's queue explodes. Least-connections and P2C adapt to capacity without knowing it; weighted RR needs the weights configured.";
    }
    function toggle() {
      if (timer) { clearInterval(timer); timer = null; runBtn.textContent = "Start"; }
      else { timer = setInterval(step, 120); runBtn.textContent = "Pause"; }
    }
    reset();
  });

  // ========================================================= rate-limiter
  W.register("rate-limiter", function (el) {
    title(el, "Rate limiting algorithms under bursty traffic (limit: 5 requests / second)");
    var auto = slider("Background traffic (req/s)", 0, 15, 1, 3, null);
    el.appendChild(controls([button("Send 1 request", function () { send(1); }), button("Burst of 10", function () { send(10); }, true), auto.el, button("Clear", clear)]));
    var cv = canvas(el, 230, draw);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var LIMIT = 5, WINDOW = 1000, SPAN = 10000;
    var algos = [
      { key: "tb", name: "Token bucket (cap 5, +5/s)" },
      { key: "fw", name: "Fixed window (5 per wall-clock second)" },
      { key: "sl", name: "Sliding window log (5 in any 1 s)" },
      { key: "sc", name: "Sliding window counter (weighted)" }
    ];
    var events, st;
    function clear() {
      events = [];
      st = { tokens: LIMIT, last: performance.now(), fwStart: 0, fwCount: 0, log: [], scPrev: 0, scCur: 0, scStart: 0 };
      draw();
    }
    function decide(now) {
      var res = {};
      // token bucket
      st.tokens = Math.min(LIMIT, st.tokens + (now - st.last) * LIMIT / WINDOW); st.last = now;
      if (st.tokens >= 1) { st.tokens -= 1; res.tb = true; } else res.tb = false;
      // fixed window
      var ws = Math.floor(now / WINDOW) * WINDOW;
      if (ws !== st.fwStart) { st.fwStart = ws; st.fwCount = 0; }
      res.fw = st.fwCount < LIMIT; if (res.fw) st.fwCount++;
      // sliding log
      st.log = st.log.filter(function (t) { return t > now - WINDOW; });
      res.sl = st.log.length < LIMIT; if (res.sl) st.log.push(now);
      // sliding counter
      var cs = Math.floor(now / WINDOW) * WINDOW;
      if (cs !== st.scStart) { st.scPrev = cs - st.scStart === WINDOW ? st.scCur : 0; st.scCur = 0; st.scStart = cs; }
      var weight = 1 - (now - cs) / WINDOW;
      var est = st.scPrev * weight + st.scCur;
      res.sc = est < LIMIT; if (res.sc) st.scCur++;
      return res;
    }
    function send(n) {
      for (var i = 0; i < n; i++) {
        var now = performance.now() + i * 2;
        events.push({ t: now, r: decide(now) });
      }
      draw();
    }
    var lastAuto = performance.now();
    function loop() {
      if (!el.isConnected) return;
      var now = performance.now();
      var rps = auto.get();
      if (rps > 0 && now - lastAuto > 1000 / rps) { lastAuto = now; send(1); }
      draw();
      requestAnimationFrame(loop);
    }
    function draw() {
      if (!events) return;
      var ctx = cv.ctx, w = cv.w, hh = cv.h, now = performance.now();
      ctx.clearRect(0, 0, w, hh);
      var left = 10, top = 10, rowH = 52, plotW = w - 20;
      ctx.font = "12px ui-sans-serif, system-ui";
      for (var s = 0; s <= 10; s++) {
        var x = left + plotW - (now % WINDOW) / SPAN * plotW - s * plotW / 10;
        ctx.strokeStyle = cssVar("--border"); ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, hh - 4); ctx.stroke();
      }
      var stats = {};
      algos.forEach(function (a, i) {
        var y = top + i * rowH;
        ctx.fillStyle = cssVar("--fg-muted"); ctx.fillText(a.name, left, y + 12);
        var acc = 0, rej = 0;
        events.forEach(function (e) {
          var age = now - e.t; if (age > SPAN) return;
          var x = left + plotW - age / SPAN * plotW;
          var ok = e.r[a.key];
          if (age < 1000) { if (ok) acc++; else rej++; }
          ctx.fillStyle = ok ? cssVar("--ok") : cssVar("--danger");
          ctx.beginPath(); ctx.arc(x, y + 30, 4, 0, 7); ctx.fill();
        });
        stats[a.key] = [acc, rej];
      });
      events = events.filter(function (e) { return now - e.t < SPAN; });
      out.innerHTML = "Last 10 s shown, newest on the right. <span style='color:var(--ok)'>●</span> allowed <span style='color:var(--danger)'>●</span> rejected. " +
        "Tokens available now: <b>" + Math.min(LIMIT, st.tokens + (now - st.last) * LIMIT / WINDOW).toFixed(1) + "</b>. " +
        "Fire two bursts straddling a second boundary: the fixed window can admit up to 10 in ~1 s, the sliding log never more than 5.";
    }
    clear();
    requestAnimationFrame(loop);
  });

  // ==================================================== consistent-hashing
  W.register("consistent-hashing", function (el) {
    title(el, "Consistent hashing ring vs. hash-mod-N");
    var vn = slider("Virtual nodes per server", 1, 64, 1, 8, rebuild);
    var nodeNames = ["A", "B", "C"];
    var next = 4;
    var addBtn = button("Add server", function () { nodeNames.push(String.fromCharCode(64 + next++)); rebuild(true); }, true);
    var rmBtn = button("Remove a server", function () { if (nodeNames.length > 1) { nodeNames.splice(Math.floor(nodeNames.length / 2), 1); rebuild(true); } });
    el.appendChild(controls([vn.el, addBtn, rmBtn]));
    var cv = canvas(el, 330, draw);
    var dist = h("div", { class: "w-out" });
    var out = h("p", { class: "w-out" });
    el.appendChild(dist); el.appendChild(out);
    var keys = []; for (var i = 0; i < 120; i++) keys.push("user:" + (i * 7919 % 10007));
    var ring = [], owner = {}, prevOwner = null, prevMod = null, moved = null, movedMod = null, prevN = 3;
    var M = 4294967296;
    function lookup(hv) {
      for (var i = 0; i < ring.length; i++) if (ring[i].h >= hv) return ring[i].node;
      return ring[0].node;
    }
    function rebuild(track) {
      var old = owner, oldMod = {};
      keys.forEach(function (k) { oldMod[k] = hashStr(k) % prevN; });
      ring = [];
      nodeNames.forEach(function (n) { for (var v = 0; v < vn.get(); v++) ring.push({ h: hashStr(n + "#" + v), node: n }); });
      ring.sort(function (a, b) { return a.h - b.h; });
      owner = {};
      keys.forEach(function (k) { owner[k] = lookup(hashStr(k)); });
      if (track) {
        moved = keys.filter(function (k) { return old[k] !== owner[k]; }).length;
        movedMod = keys.filter(function (k) { return oldMod[k] !== hashStr(k) % nodeNames.length; }).length;
      } else { moved = null; movedMod = null; }
      prevN = nodeNames.length;
      draw();
    }
    function color(n) { var pal = palette(); return pal[(n.charCodeAt(0) - 65) % pal.length]; }
    function draw() {
      var ctx = cv.ctx, w = cv.w, hh = cv.h;
      ctx.clearRect(0, 0, w, hh);
      var cx = w / 2, cy = hh / 2, R = Math.min(w, hh) / 2 - 30;
      ctx.strokeStyle = cssVar("--border-strong"); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      function pos(hv, rr) { var a = hv / M * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }
      keys.forEach(function (k) {
        var p = pos(hashStr(k), R - 12);
        ctx.fillStyle = color(owner[k]); ctx.globalAlpha = .75;
        ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      });
      ring.forEach(function (t) {
        var p = pos(t.h, R), q = pos(t.h, R + 14);
        ctx.fillStyle = color(t.node);
        ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 7); ctx.fill();
        if (vn.get() <= 8) { ctx.font = "bold 11px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t.node, q[0], q[1]); }
      });
      ctx.fillStyle = cssVar("--fg-muted"); ctx.font = "12px ui-sans-serif"; ctx.textAlign = "center";
      ctx.fillText(keys.length + " keys · " + ring.length + " ring tokens", cx, cy);
      var counts = {}; nodeNames.forEach(function (n) { counts[n] = 0; });
      keys.forEach(function (k) { counts[owner[k]]++; });
      bars(dist, nodeNames.map(function (n) { return { label: "Server " + n, value: counts[n], color: color(n), text: counts[n] + " keys" }; }), { max: keys.length / nodeNames.length * 2 });
      var ideal = (keys.length / nodeNames.length).toFixed(0);
      out.innerHTML = "Ideal share ≈ <b>" + ideal + "</b> keys per server. " + (moved == null ? "Add or remove a server to see how many keys move." :
        "Last change moved <b>" + moved + "</b> of " + keys.length + " keys on the ring vs <b>" + movedMod + "</b> with <code>hash(key) % N</code>.") +
        " More virtual nodes → smoother distribution.";
    }
    rebuild(false);
  });

  // ======================================================== cache-eviction
  W.register("cache-eviction", function (el) {
    title(el, "Cache eviction policies on a Zipf-distributed workload");
    var size = slider("Cache size (items)", 5, 300, 5, 50, run);
    var skew = slider("Zipf skew s", 0, 1.6, 0.1, 0.9, run);
    var shift = select("Workload", [["static", "Stable popularity"], ["shift", "Popularity shifts halfway"], ["scan", "Hot set + periodic full scans"]], "static", run);
    el.appendChild(controls([size.el, skew.el, shift.el]));
    var out = h("div", { class: "w-out" });
    el.appendChild(out);
    var note = h("p", { class: "w-out" });
    el.appendChild(note);
    function zipfSampler(n, s, r) {
      var cdf = [], sum = 0;
      for (var i = 1; i <= n; i++) { sum += 1 / Math.pow(i, s); cdf.push(sum); }
      return function () {
        var u = r() * sum, lo = 0, hi = n - 1;
        while (lo < hi) { var m = (lo + hi) >> 1; if (cdf[m] < u) lo = m + 1; else hi = m; }
        return lo;
      };
    }
    function workload() {
      var r = rng(42), N = 1000, reqs = 30000, z = zipfSampler(N, skew.get(), r), arr = [];
      for (var i = 0; i < reqs; i++) {
        var k = z();
        if (shift.get() === "shift" && i > reqs / 2) k = (k + 500) % N;
        if (shift.get() === "scan" && i % 5000 < 1000) k = 1000 + (i % 1000);
        arr.push(k);
      }
      return arr;
    }
    function lru(trace, cap) {
      var m = new Map(), hits = 0;
      trace.forEach(function (k) {
        if (m.has(k)) { hits++; m.delete(k); m.set(k, 1); }
        else { m.set(k, 1); if (m.size > cap) m.delete(m.keys().next().value); }
      });
      return hits / trace.length;
    }
    function fifo(trace, cap) {
      var s = new Set(), q = [], head = 0, hits = 0;
      trace.forEach(function (k) {
        if (s.has(k)) { hits++; return; }
        s.add(k); q.push(k);
        if (s.size > cap) s.delete(q[head++]);
      });
      return hits / trace.length;
    }
    function lfu(trace, cap) { // O(n) eviction scan is fine at this size
      var f = new Map(), hits = 0, age = new Map(), t = 0;
      trace.forEach(function (k) {
        t++;
        if (f.has(k)) { hits++; f.set(k, f.get(k) + 1); age.set(k, t); return; }
        if (f.size >= cap) {
          var victim = null, vf = Infinity, va = Infinity;
          f.forEach(function (c, key) { var a = age.get(key); if (c < vf || (c === vf && a < va)) { vf = c; va = a; victim = key; } });
          f.delete(victim); age.delete(victim);
        }
        f.set(k, 1); age.set(k, t);
      });
      return hits / trace.length;
    }
    function random(trace, cap) {
      var r = rng(3), arr = [], idx = new Map(), hits = 0;
      trace.forEach(function (k) {
        if (idx.has(k)) { hits++; return; }
        if (arr.length >= cap) {
          var j = Math.floor(r() * arr.length), victim = arr[j], last = arr.pop();
          idx.delete(victim);
          if (j < arr.length) { arr[j] = last; idx.set(last, j); }
        }
        idx.set(k, arr.length); arr.push(k);
      });
      return hits / trace.length;
    }
    function run() {
      var t = workload(), c = size.get(), pal = palette();
      var res = [["LRU", lru(t, c)], ["LFU", lfu(t, c)], ["FIFO", fifo(t, c)], ["Random", random(t, c)]];
      bars(out, res.map(function (r, i) { return { label: r[0], value: r[1], color: pal[i], text: (r[1] * 100).toFixed(1) + "%" }; }), { max: 1 });
      note.innerHTML = "Hit ratio over 30,000 requests to 1,000 keys. Cache holds <b>" + c + "</b> items (" + (c / 10).toFixed(1) + "% of keys). " +
        "Notice how a modest cache already catches most traffic when skew is high, how LFU suffers when popularity shifts (stale counts), and how scans pollute LRU.";
    }
    run();
  });

  // ================================================================= quorum
  W.register("quorum", function (el) {
    title(el, "Leaderless replication: N / W / R quorums");
    var N = slider("N replicas", 1, 7, 1, 3, sync);
    var Wq = slider("W (write acks)", 1, 7, 1, 2, sync);
    var R = slider("R (read replies)", 1, 7, 1, 2, sync);
    el.appendChild(controls([N.el, Wq.el, R.el]));
    el.appendChild(controls([button("Write new value", write, true), button("Read", read), button("Anti-entropy repair", repair), button("Reset", reset)]));
    var grid = h("div", { class: "w-grid" });
    el.appendChild(grid);
    var out = h("p", { class: "w-out" });
    var log = h("div", { class: "log", "aria-live": "polite" });
    el.appendChild(out); el.appendChild(log);
    var reps, version, r = rng(11);
    function reset() { reps = []; for (var i = 0; i < 7; i++) reps.push({ v: 0, up: true }); version = 0; log.textContent = ""; sync(); }
    function sync() {
      if (Wq.get() > N.get()) Wq.set(N.get());
      if (R.get() > N.get()) R.set(N.get());
      render();
    }
    function alive() { var a = []; for (var i = 0; i < N.get(); i++) if (reps[i].up) a.push(i); return a; }
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function say(s) { log.textContent = s + "\n" + log.textContent; }
    function write() {
      var a = alive();
      if (a.length < Wq.get()) { say("✗ write v" + (version + 1) + " FAILED: only " + a.length + " replicas up, need W=" + Wq.get()); return; }
      version++;
      var targets = shuffle(a).slice(0, Wq.get()); // the rest are modelled as lagging (async / sloppy)
      targets.forEach(function (i) { reps[i].v = version; });
      say("✓ write v" + version + " acknowledged by replicas " + targets.map(function (i) { return i + 1; }).join(", ") + " (others lag)");
      render();
    }
    function read() {
      var a = alive();
      if (a.length < R.get()) { say("✗ read FAILED: only " + a.length + " up, need R=" + R.get()); return; }
      var asked = shuffle(a).slice(0, R.get());
      var best = Math.max.apply(null, asked.map(function (i) { return reps[i].v; }));
      var fresh = best === version;
      say((fresh ? "✓" : "⚠") + " read asked " + asked.map(function (i) { return i + 1; }).join(", ") + " → v" + best + (fresh ? " (latest)" : " STALE, latest is v" + version));
      asked.forEach(function (i) { if (reps[i].v < best) reps[i].v = best; }); // read repair
      render();
    }
    function repair() { alive().forEach(function (i) { reps[i].v = version; }); say("anti-entropy: all live replicas synced to v" + version); render(); }
    function render() {
      grid.innerHTML = "";
      for (var i = 0; i < N.get(); i++) {
        (function (i) {
          var rep = reps[i];
          var c = h("div", { class: "w-card" }, [
            h("h5", { text: "Replica " + (i + 1) }),
            h("div", { html: rep.up ? "<span class='state' style='background:var(--ok-soft);color:var(--ok)'>UP</span>" : "<span class='state' style='background:var(--danger-soft);color:var(--danger)'>DOWN</span>" }),
            h("p", { html: "value <b>v" + rep.v + "</b>" + (rep.v < version ? " <span style='color:var(--warn)'>(stale)</span>" : "") }),
            button(rep.up ? "Crash" : "Recover", function () { rep.up = !rep.up; render(); })
          ]);
          grid.appendChild(c);
        })(i);
      }
      var n = N.get(), w = Wq.get(), rr = R.get(), up = alive().length;
      var overlap = w + rr > n;
      out.innerHTML = "W + R = <b>" + (w + rr) + "</b> " + (overlap ? "&gt;" : "≤") + " N = <b>" + n + "</b> → " +
        (overlap ? "<b style='color:var(--ok)'>every read set overlaps the latest write set</b> (strict quorum)" : "<b style='color:var(--warn)'>reads can miss the latest write</b>") +
        ". Writes tolerate <b>" + (n - w) + "</b> failures, reads <b>" + (n - rr) + "</b>. Currently up: <b>" + up + "/" + n + "</b>.";
    }
    reset();
  });

  // ================================================================== saga
  W.register("saga", function (el) {
    title(el, "Saga (orchestrated) vs Two-Phase Commit");
    var mode = select("Protocol", [["saga", "Orchestrated saga"], ["2pc", "Two-phase commit"]], "saga", reset);
    var fail = select("Inject failure", [["0", "No failure"], ["1", "Inventory fails"], ["2", "Payment fails"], ["3", "Shipping fails"], ["crash", "Coordinator crashes mid-protocol"]], "2", reset);
    el.appendChild(controls([mode.el, fail.el, button("Run", run, true), button("Step", step), button("Reset", reset)]));
    var grid = h("div", { class: "w-grid" });
    el.appendChild(grid);
    var log = h("div", { class: "log", "aria-live": "polite" });
    el.appendChild(log);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var svc = ["Order", "Inventory", "Payment", "Shipping"];
    var states, script, pc, timer;
    var COLORS = { idle: "--fg-faint", pending: "--warn", done: "--ok", prepared: "--accent", committed: "--ok", failed: "--danger", compensated: "--insight", aborted: "--danger", blocked: "--warn" };
    function reset() {
      clearInterval(timer); timer = null;
      states = svc.map(function () { return "idle"; });
      script = build(); pc = 0; log.textContent = ""; render();
      out.innerHTML = mode.get() === "saga"
        ? "A saga is a sequence of <b>local</b> transactions. Each step commits immediately; on failure the orchestrator runs <b>compensating transactions</b> in reverse. No locks are held across services, so intermediate states are visible (no isolation)."
        : "2PC holds locks on every participant from <b>prepare</b> until the coordinator's decision arrives. It is atomic, but a coordinator crash after prepare leaves participants <b>blocked</b> holding locks.";
    }
    function build() {
      var f = fail.get(), s = [];
      if (mode.get() === "saga") {
        var failAt = f === "crash" ? 2 : +f;
        for (var i = 0; i < svc.length; i++) {
          if (failAt && i === failAt) {
            s.push([i, "failed", "T" + (i + 1) + " " + svc[i] + ": local transaction FAILED"]);
            for (var j = i - 1; j >= 0; j--) s.push([j, "compensated", "C" + (j + 1) + " " + svc[j] + ": compensation committed (" + ["cancel order", "release stock", "refund payment"][j] + ")"]);
            s.push([-1, "", f === "crash" ? "(orchestrator state is persisted, so after restart it resumes compensation)" : "Saga ended: COMPENSATED — system is consistent again"]);
            return s;
          }
          s.push([i, "done", "T" + (i + 1) + " " + svc[i] + ": local transaction committed" + (i < 3 ? "; event published" : "")]);
        }
        s.push([-1, "", "Saga ended: COMPLETED"]);
      } else {
        var no = f === "crash" ? -1 : +f;
        for (var k = 0; k < svc.length; k++) s.push([k, no === k ? "failed" : "prepared", "PREPARE → " + svc[k] + (no === k ? ": votes NO" : ": votes YES (locks held, WAL forced)")]);
        if (f === "crash") {
          s.push([-1, "", "Coordinator CRASHES before sending the decision"]);
          for (var b = 0; b < svc.length; b++) s.push([b, "blocked", svc[b] + ": in-doubt, still holding locks, cannot decide alone"]);
          return s;
        }
        var abort = no > 0;
        for (var m = 0; m < svc.length; m++) s.push([m, abort ? "aborted" : "committed", (abort ? "ABORT" : "COMMIT") + " → " + svc[m]]);
        s.push([-1, "", abort ? "Global transaction ABORTED atomically" : "Global transaction COMMITTED atomically"]);
      }
      return s;
    }
    function step() {
      if (pc >= script.length) { clearInterval(timer); timer = null; return; }
      var st = script[pc++];
      if (st[0] >= 0) states[st[0]] = st[1];
      log.textContent += st[2] + "\n";
      log.scrollTop = log.scrollHeight;
      render();
    }
    function run() { if (pc >= script.length) reset(); clearInterval(timer); timer = setInterval(step, 650); }
    function render() {
      grid.innerHTML = "";
      svc.forEach(function (s, i) {
        var c = states[i];
        grid.appendChild(h("div", { class: "w-card" }, [
          h("h5", { text: s + " service" }),
          h("span", { class: "state", style: "background:color-mix(in srgb, var(" + COLORS[c] + ") 18%, transparent);color:var(" + COLORS[c] + ")", text: c.toUpperCase() })
        ]));
      });
    }
    reset();
  });

  // ================================================== kafka-consumer-group
  W.register("kafka-consumer-group", function (el) {
    title(el, "Kafka consumer group partition assignment & rebalancing");
    var topics = select("Topics", [["1", "1 topic"], ["2", "2 topics (same partition count)"]], "1", update);
    var parts = slider("Partitions per topic", 1, 12, 1, 6, update);
    var cons = slider("Consumers in group", 1, 10, 1, 3, update);
    var strat = select("Assignor", [["range", "RangeAssignor"], ["rr", "RoundRobinAssignor"], ["sticky", "Sticky / CooperativeSticky"]], "range", function () { prev = null; update(); });
    el.appendChild(controls([topics.el, parts.el, cons.el, strat.el]));
    var grid = h("div", { class: "w-grid" });
    el.appendChild(grid);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var prev = null;
    function partitions() {
      var t = +topics.get(), p = parts.get(), list = [];
      for (var i = 0; i < t; i++) for (var j = 0; j < p; j++) list.push({ topic: "t" + i, p: j, id: "t" + i + "-" + j });
      return list;
    }
    function assign(list, cs) {
      var a = {}; cs.forEach(function (c) { a[c] = []; });
      var s = strat.get();
      if (s === "range") {
        var byTopic = {};
        list.forEach(function (x) { (byTopic[x.topic] = byTopic[x.topic] || []).push(x); });
        Object.keys(byTopic).forEach(function (t) {
          var ps = byTopic[t], n = cs.length, per = Math.floor(ps.length / n), extra = ps.length % n, idx = 0;
          cs.forEach(function (c, ci) { var take = per + (ci < extra ? 1 : 0); for (var k = 0; k < take; k++) a[c].push(ps[idx++].id); });
        });
      } else if (s === "rr") {
        list.forEach(function (x, i) { a[cs[i % cs.length]].push(x.id); });
      } else {
        // sticky: keep previous owners where possible, then balance
        var owner = {};
        if (prev) Object.keys(prev).forEach(function (c) { if (a[c]) prev[c].forEach(function (pid) { owner[pid] = c; }); });
        var total = list.length, n2 = cs.length, maxPer = Math.ceil(total / n2), minPer = Math.floor(total / n2);
        var orphan = [];
        list.forEach(function (x) { var o = owner[x.id]; if (o && a[o].length < maxPer) a[o].push(x.id); else orphan.push(x.id); });
        // trim consumers above the fair share so that others can reach minPer
        cs.forEach(function (c) {
          var countAtMax = cs.filter(function (cc) { return a[cc].length === maxPer; }).length;
          var allowedAtMax = total - minPer * n2;
          if (a[c].length === maxPer && countAtMax > allowedAtMax) orphan.push(a[c].pop());
        });
        orphan.forEach(function (pid) {
          var target = cs.slice().sort(function (x, y) { return a[x].length - a[y].length; })[0];
          a[target].push(pid);
        });
      }
      return a;
    }
    function update() {
      var cs = []; for (var i = 0; i < cons.get(); i++) cs.push("C" + (i + 1));
      var list = partitions();
      var a = assign(list, cs);
      var moved = 0;
      if (prev) {
        var prevOwner = {};
        Object.keys(prev).forEach(function (c) { prev[c].forEach(function (p) { prevOwner[p] = c; }); });
        list.forEach(function (x) { var now = null; cs.forEach(function (c) { if (a[c].indexOf(x.id) >= 0) now = c; }); if (prevOwner[x.id] && prevOwner[x.id] !== now) moved++; });
      }
      prev = a;
      var pal = palette();
      grid.innerHTML = "";
      cs.forEach(function (c, i) {
        var card = h("div", { class: "w-card" }, [h("h5", { text: "Consumer " + c + " · " + a[c].length + " partitions" })]);
        if (!a[c].length) card.appendChild(h("p", { html: "<span style='color:var(--warn)'>idle — no partition</span>" }));
        a[c].forEach(function (pid) { card.appendChild(h("span", { class: "pill", style: "background:" + (pid[1] === "0" ? pal[0] : pal[1]), text: pid })); });
        grid.appendChild(card);
      });
      var idle = cs.filter(function (c) { return !a[c].length; }).length;
      var counts = cs.map(function (c) { return a[c].length; });
      out.innerHTML = "Max/min load: <b>" + Math.max.apply(null, counts) + "/" + Math.min.apply(null, counts) + "</b> · idle consumers: <b>" + idle + "</b>" +
        (moved ? " · partitions that changed owner in this rebalance: <b>" + moved + "</b>" : "") +
        ". Each partition is consumed by exactly one member of the group, so consumers beyond the partition count sit idle. " +
        "With 2 topics, RangeAssignor piles the remainders onto the first consumers; sticky assignment minimises movement when members join or leave.";
    }
    update();
  });

  // ======================================================= circuit-breaker
  W.register("circuit-breaker", function (el) {
    title(el, "Circuit breaker state machine (Resilience4j-style, count-based window)");
    var fr = slider("Downstream failure rate %", 0, 100, 5, 10, null);
    var thr = slider("Failure threshold %", 10, 90, 5, 50, null);
    var runBtn = button("Start traffic", toggle, true);
    el.appendChild(controls([fr.el, thr.el, runBtn, button("Reset", reset)]));
    var stateEl = h("p", { class: "w-out" });
    el.appendChild(stateEl);
    var cv = canvas(el, 90, draw);
    var log = h("div", { class: "log", "aria-live": "polite" });
    el.appendChild(log);
    var WINDOW = 10, OPEN_MS = 3000, HALF = 3;
    var st, timer, r = rng(5);
    function reset() {
      clearInterval(timer); timer = null; runBtn.textContent = "Start traffic";
      st = { state: "CLOSED", window: [], openedAt: 0, half: [], history: [] };
      log.textContent = ""; render();
    }
    function say(s) { log.textContent = new Date().toLocaleTimeString() + "  " + s + "\n" + log.textContent; }
    function call() {
      var now = Date.now();
      if (st.state === "OPEN") {
        if (now - st.openedAt >= OPEN_MS) { st.state = "HALF_OPEN"; st.half = []; say("wait duration elapsed → HALF_OPEN (permit " + HALF + " trial calls)"); }
        else { st.history.push("x"); render(); return; }
      }
      var ok = r() * 100 >= fr.get();
      st.history.push(ok ? "s" : "f");
      if (st.state === "HALF_OPEN") {
        st.half.push(ok);
        if (st.half.length >= HALF) {
          var fails = st.half.filter(function (x) { return !x; }).length;
          if (fails * 100 / HALF >= thr.get()) { st.state = "OPEN"; st.openedAt = now; say("trial calls failed " + fails + "/" + HALF + " → OPEN again"); }
          else { st.state = "CLOSED"; st.window = []; say("trial calls succeeded → CLOSED"); }
        }
      } else {
        st.window.push(ok); if (st.window.length > WINDOW) st.window.shift();
        if (st.window.length >= WINDOW) {
          var f = st.window.filter(function (x) { return !x; }).length;
          if (f * 100 / WINDOW >= thr.get()) { st.state = "OPEN"; st.openedAt = now; say("failure rate " + (f * 10) + "% ≥ " + thr.get() + "% → OPEN (fail fast for 3 s)"); }
        }
      }
      if (st.history.length > 120) st.history.shift();
      render();
    }
    function toggle() {
      if (timer) { clearInterval(timer); timer = null; runBtn.textContent = "Start traffic"; }
      else { timer = setInterval(call, 200); runBtn.textContent = "Stop traffic"; }
    }
    function render() {
      var c = { CLOSED: "--ok", OPEN: "--danger", HALF_OPEN: "--warn" }[st.state];
      var f = st.window.filter(function (x) { return !x; }).length;
      stateEl.innerHTML = "State: <span class='state' style='background:color-mix(in srgb, var(" + c + ") 18%, transparent);color:var(" + c + ")'>" + st.state + "</span> · window failure rate <b>" + (st.window.length ? Math.round(f * 100 / st.window.length) : 0) + "%</b> over last " + st.window.length + " calls";
      draw();
    }
    function draw() {
      if (!st) return;
      var ctx = cv.ctx, w = cv.w; ctx.clearRect(0, 0, w, cv.h);
      var n = 60, bw = w / n, hist = st.history.slice(-n);
      hist.forEach(function (x, i) {
        ctx.fillStyle = x === "s" ? cssVar("--ok") : x === "f" ? cssVar("--danger") : cssVar("--fg-faint");
        ctx.fillRect(i * bw + 1, x === "x" ? 50 : 15, bw - 2, x === "x" ? 20 : 55);
      });
      ctx.fillStyle = cssVar("--fg-muted"); ctx.font = "11px ui-sans-serif";
      ctx.fillText("green = success · red = failure · grey = rejected without calling downstream", 4, 86);
    }
    reset();
  });
})();
