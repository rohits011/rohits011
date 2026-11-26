/* widgets-algo.js — Part 2/3: algorithm & data-structure widgets. Loaded on demand by widgets.js. */
(function () {
  "use strict";
  var W = window.BookWidgets, U = W.util, h = U.h, cssVar = U.cssVar;

  // ================================================================ big-o
  W.register("big-o", function (el) {
    U.title(el, "How complexity classes grow");
    var n = U.slider("n", 2, 64, 1, 16, draw);
    var scale = U.select("Y axis", [["lin", "Linear"], ["log", "Logarithmic"]], "lin", draw);
    el.appendChild(U.controls([n.el, scale.el]));
    var cv = U.canvas(el, 280, draw);
    var tbl = h("div", { class: "table-wrap" });
    el.appendChild(tbl);
    function fact(k) { var r = 1; for (var i = 2; i <= k; i++) r *= i; return r; }
    var fns = [
      ["O(1)", function () { return 1; }],
      ["O(log n)", function (x) { return Math.max(1, Math.log2(x)); }],
      ["O(n)", function (x) { return x; }],
      ["O(n log n)", function (x) { return x * Math.max(1, Math.log2(x)); }],
      ["O(n²)", function (x) { return x * x; }],
      ["O(2ⁿ)", function (x) { return Math.pow(2, x); }],
      ["O(n!)", function (x) { return fact(Math.min(x, 170)); }]
    ];
    function draw() {
      var ctx = cv.ctx, w = cv.w, H = cv.h, N = n.get(), log = scale.get() === "log";
      ctx.clearRect(0, 0, w, H);
      var pad = 36, pw = w - pad - 10, ph = H - 30;
      var ymax = log ? Math.log10(fns[6][1](N) + 1) : N * N * 1.1;
      ctx.strokeStyle = cssVar("--border"); ctx.beginPath(); ctx.moveTo(pad, 10); ctx.lineTo(pad, 10 + ph); ctx.lineTo(pad + pw, 10 + ph); ctx.stroke();
      ctx.fillStyle = cssVar("--fg-faint"); ctx.font = "11px ui-sans-serif";
      ctx.fillText(log ? "log₁₀(ops)" : "ops (clipped at 1.1·n²)", pad + 4, 20);
      ctx.fillText("n →", pad + pw - 24, 10 + ph + 16);
      var pal = U.palette().concat([cssVar("--danger")]);
      fns.forEach(function (f, i) {
        ctx.strokeStyle = pal[i % pal.length]; ctx.lineWidth = 2; ctx.beginPath();
        for (var x = 1; x <= N; x += Math.max(0.05, N / 200)) {
          var v = f[1](x); var y = log ? Math.log10(v + 1) : v;
          var py = 10 + ph - Math.min(1, y / ymax) * ph, px = pad + (x - 1) / Math.max(1, N - 1) * pw;
          if (x === 1) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.fillStyle = pal[i % pal.length]; ctx.fillText(f[0], pad + 8 + (i % 4) * 90, 34 + Math.floor(i / 4) * 14);
      });
      var rows = fns.map(function (f) {
        var v = f[1](N);
        var txt = v > 1e15 ? v.toExponential(2) : Math.round(v).toLocaleString();
        var secs = v / 1e9; // at ~1e9 simple ops/second
        var t = secs < 1e-6 ? "< 1 µs" : secs < 1e-3 ? (secs * 1e6).toFixed(1) + " µs" : secs < 1 ? (secs * 1e3).toFixed(1) + " ms" : secs < 3600 ? secs.toFixed(1) + " s" : secs < 3.15e7 * 1e3 ? (secs / 3.15e7).toFixed(1) + " years" : "≫ age of universe";
        return "<tr><td>" + f[0] + "</td><td>" + txt + "</td><td>" + t + "</td></tr>";
      }).join("");
      tbl.innerHTML = "<table><thead><tr><th>Class</th><th>Operations at n = " + N + "</th><th>Time at ~10⁹ ops/s</th></tr></thead><tbody>" + rows + "</tbody></table>";
    }
  });

  // ============================================================== sorting
  W.register("sorting", function (el) {
    U.title(el, "Sorting algorithm step visualiser");
    var algo = U.select("Algorithm", [["insertion", "Insertion sort"], ["merge", "Merge sort"], ["quick", "Quicksort (Lomuto)"], ["heap", "Heapsort"]], "quick", reset);
    var size = U.slider("Size", 6, 48, 1, 24, reset);
    var input = U.select("Input", [["random", "Random"], ["sorted", "Already sorted"], ["reversed", "Reversed"], ["few", "Few unique"]], "random", reset);
    var speed = U.slider("Speed", 1, 60, 1, 20, null);
    var playBtn = U.button("Play", toggle, true);
    el.appendChild(U.controls([algo.el, size.el, input.el, speed.el, playBtn, U.button("Step", step), U.button("Shuffle", function () { seed++; reset(); })]));
    var cv = U.canvas(el, 220, draw);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var seed = 1, arr, steps, pc, cmp, wr, hi, timer, sortedFrom;
    function gen() {
      var r = U.rng(seed), n = size.get(), a = [];
      for (var i = 0; i < n; i++) a.push(input.get() === "few" ? 1 + Math.floor(r() * 4) * 25 : 5 + Math.floor(r() * 95));
      if (input.get() === "sorted") a.sort(function (x, y) { return x - y; });
      if (input.get() === "reversed") a.sort(function (x, y) { return y - x; });
      return a;
    }
    function record(a0) { // produce a list of events by running the algorithm on a copy
      var a = a0.slice(), ev = [];
      function C(i, j) { ev.push(["c", i, j]); return a[i] - a[j]; }
      function S(i, j) { ev.push(["s", i, j]); var t = a[i]; a[i] = a[j]; a[j] = t; }
      function Wr(i, v) { ev.push(["w", i, v]); a[i] = v; }
      var k = algo.get();
      if (k === "insertion") {
        for (var i = 1; i < a.length; i++) for (var j = i; j > 0 && C(j - 1, j) > 0; j--) S(j - 1, j);
      } else if (k === "merge") {
        (function ms(lo, hi2) {
          if (hi2 - lo < 1) return;
          var mid = (lo + hi2) >> 1; ms(lo, mid); ms(mid + 1, hi2);
          var tmp = [], p = lo, q = mid + 1;
          while (p <= mid && q <= hi2) tmp.push(C(p, q) <= 0 ? a[p++] : a[q++]);
          while (p <= mid) tmp.push(a[p++]);
          while (q <= hi2) tmp.push(a[q++]);
          for (var t = 0; t < tmp.length; t++) Wr(lo + t, tmp[t]);
        })(0, a.length - 1);
      } else if (k === "quick") {
        (function qs(lo, hi2) {
          if (lo >= hi2) return;
          var p = lo;
          for (var j = lo; j < hi2; j++) if (C(j, hi2) < 0) { S(p, j); p++; }
          S(p, hi2); qs(lo, p - 1); qs(p + 1, hi2);
        })(0, a.length - 1);
      } else {
        var n = a.length;
        var sift = function (i, m) {
          for (;;) {
            var l = 2 * i + 1, r = l + 1, big = i;
            if (l < m && C(l, big) > 0) big = l;
            if (r < m && C(r, big) > 0) big = r;
            if (big === i) return; S(i, big); i = big;
          }
        };
        for (var s = (n >> 1) - 1; s >= 0; s--) sift(s, n);
        for (var e = n - 1; e > 0; e--) { S(0, e); ev.push(["done", e]); sift(0, e); }
      }
      return ev;
    }
    function reset() {
      clearInterval(timer); timer = null; playBtn.textContent = "Play";
      arr = gen(); steps = record(arr); pc = 0; cmp = 0; wr = 0; hi = []; sortedFrom = arr.length;
      draw();
    }
    function step() {
      if (pc >= steps.length) { hi = []; stop(); draw(); return; }
      var e = steps[pc++];
      if (e[0] === "c") { cmp++; hi = [e[1], e[2]]; }
      else if (e[0] === "s") { wr += 2; var t = arr[e[1]]; arr[e[1]] = arr[e[2]]; arr[e[2]] = t; hi = [e[1], e[2]]; }
      else if (e[0] === "w") { wr++; arr[e[1]] = e[2]; hi = [e[1]]; }
      else if (e[0] === "done") sortedFrom = e[1];
      draw();
    }
    function stop() { clearInterval(timer); timer = null; playBtn.textContent = "Play"; }
    function toggle() {
      if (timer) { stop(); return; }
      if (pc >= steps.length) reset();
      playBtn.textContent = "Pause";
      timer = setInterval(function () { for (var i = 0; i < Math.ceil(speed.get() / 15); i++) step(); }, 1000 / Math.min(60, speed.get() * 2));
    }
    function draw() {
      if (!arr) return;
      var ctx = cv.ctx, w = cv.w, H = cv.h; ctx.clearRect(0, 0, w, H);
      var n = arr.length, bw = w / n;
      for (var i = 0; i < n; i++) {
        var on = hi.indexOf(i) >= 0;
        ctx.fillStyle = on ? cssVar("--c2") : (pc >= steps.length || i >= sortedFrom) ? cssVar("--ok") : cssVar("--c1");
        var bh = arr[i] / 100 * (H - 10);
        ctx.fillRect(i * bw + 1, H - bh, Math.max(1, bw - 2), bh);
      }
      var n2 = arr.length;
      out.innerHTML = "Step <b>" + pc + "/" + steps.length + "</b> · comparisons <b>" + cmp + "</b> · element writes <b>" + wr + "</b>. " +
        "Reference: n log₂ n ≈ <b>" + Math.round(n2 * Math.log2(n2)) + "</b>, n²/2 ≈ <b>" + Math.round(n2 * n2 / 2) + "</b>. Try quicksort on already-sorted input to see its O(n²) worst case with a last-element pivot.";
    }
    reset();
  });

  // ======================================================= graph-traversal
  W.register("graph-traversal", function (el) {
    U.title(el, "BFS vs DFS vs Dijkstra on a grid (click cells to draw walls, Shift+click for weight-5 mud)");
    var algo = U.select("Algorithm", [["bfs", "Breadth-first search"], ["dfs", "Depth-first search"], ["dijkstra", "Dijkstra (weighted)"], ["astar", "A* (Manhattan heuristic)"]], "bfs", reset);
    var playBtn = U.button("Run", run, true);
    el.appendChild(U.controls([algo.el, playBtn, U.button("Clear search", reset), U.button("Random maze", maze), U.button("Clear walls", clearAll)]));
    var COLS = 28, ROWS = 14;
    var cv = U.canvas(el, 14 * 22 + 2, draw);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var grid, start = [2, 7], goal = [25, 7], visited, order, path, timer, idx;
    function clearAll() { grid = []; for (var y = 0; y < ROWS; y++) { grid.push([]); for (var x = 0; x < COLS; x++) grid[y].push(0); } reset(); }
    function maze() { var r = U.rng(Date.now() & 0xffff); clearAll(); for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) { var v = r(); grid[y][x] = v < .25 ? 1 : v < .35 ? 5 : 0; } grid[start[1]][start[0]] = 0; grid[goal[1]][goal[0]] = 0; reset(); }
    function reset() { clearInterval(timer); timer = null; visited = {}; order = []; path = []; idx = 0; draw(); out.innerHTML = "Start ● left, goal ◆ right."; }
    function key(x, y) { return x + "," + y; }
    function nbrs(x, y) {
      return [[1, 0], [0, 1], [-1, 0], [0, -1]].map(function (d) { return [x + d[0], y + d[1]]; })
        .filter(function (p) { return p[0] >= 0 && p[1] >= 0 && p[0] < COLS && p[1] < ROWS && grid[p[1]][p[0]] !== 1; });
    }
    function search() {
      var a = algo.get(), prev = {}, dist = {}, seen = {}, ord = [];
      var s = key(start[0], start[1]), g = key(goal[0], goal[1]);
      dist[s] = 0;
      if (a === "bfs" || a === "dfs") {
        var fr = [start]; seen[s] = true;
        while (fr.length) {
          var cur = a === "bfs" ? fr.shift() : fr.pop(), ck = key(cur[0], cur[1]);
          if (a === "dfs") { if (seen[ck] === 2) continue; seen[ck] = 2; }
          ord.push(ck);
          if (ck === g) break;
          nbrs(cur[0], cur[1]).forEach(function (n) {
            var nk = key(n[0], n[1]);
            if (a === "bfs" && seen[nk]) return;
            if (a === "dfs" && seen[nk] === 2) return;
            seen[nk] = seen[nk] || 1; prev[nk] = prev[nk] && a === "bfs" ? prev[nk] : ck;
            if (a === "dfs") prev[nk] = ck;
            fr.push(n);
          });
        }
      } else {
        var pq = [[0, start]], done = {};
        while (pq.length) {
          pq.sort(function (x, y) { return x[0] - y[0]; });
          var top = pq.shift(), c = top[1], kk = key(c[0], c[1]);
          if (done[kk]) continue; done[kk] = true; ord.push(kk);
          if (kk === g) break;
          nbrs(c[0], c[1]).forEach(function (n) {
            var nk = key(n[0], n[1]), wgt = grid[n[1]][n[0]] === 5 ? 5 : 1, nd = dist[kk] + wgt;
            if (dist[nk] == null || nd < dist[nk]) {
              dist[nk] = nd; prev[nk] = kk;
              var hcost = a === "astar" ? Math.abs(n[0] - goal[0]) + Math.abs(n[1] - goal[1]) : 0;
              pq.push([nd + hcost, n]);
            }
          });
        }
      }
      var p = [], at = g;
      if (prev[g] || g === s) { while (at) { p.push(at); at = prev[at]; } }
      var cost = 0; p.forEach(function (k2) { var q = k2.split(",").map(Number); if (k2 !== s) cost += grid[q[1]][q[0]] === 5 ? 5 : 1; });
      return { order: ord, path: p.reverse(), cost: cost };
    }
    function run() {
      reset();
      var res = search();
      order = res.order;
      timer = setInterval(function () {
        for (var i = 0; i < 3 && idx < order.length; i++) visited[order[idx++]] = true;
        if (idx >= order.length) {
          clearInterval(timer); timer = null; path = res.path;
          out.innerHTML = "Visited <b>" + order.length + "</b> cells. " + (path.length ? "Path length <b>" + (path.length - 1) + "</b> steps, total cost <b>" + res.cost + "</b>." : "<b>No path.</b>") +
            " BFS guarantees the fewest steps; only Dijkstra/A* account for mud cost. DFS finds <i>a</i> path, rarely the shortest.";
        }
        draw();
      }, 16);
    }
    var cell = 22;
    cv.cv.addEventListener("click", function (e) {
      var rect = cv.cv.getBoundingClientRect(), cw = rect.width / COLS, ch = rect.height / ROWS;
      var x = Math.floor((e.clientX - rect.left) / cw), y = Math.floor((e.clientY - rect.top) / ch);
      if ((x === start[0] && y === start[1]) || (x === goal[0] && y === goal[1])) return;
      grid[y][x] = e.shiftKey ? (grid[y][x] === 5 ? 0 : 5) : (grid[y][x] === 1 ? 0 : 1);
      reset();
    });
    function draw() {
      if (!grid) return;
      var ctx = cv.ctx, w = cv.w, H = cv.h, cw = w / COLS, ch = H / ROWS;
      ctx.clearRect(0, 0, w, H);
      var pathSet = {}; path.forEach(function (k) { pathSet[k] = true; });
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
        var k = key(x, y), v = grid[y][x];
        ctx.fillStyle = v === 1 ? cssVar("--fg") : pathSet[k] ? cssVar("--c2") : visited[k] ? "color-mix(in srgb, " + cssVar("--c1") + " 35%, transparent)" : v === 5 ? "color-mix(in srgb, " + cssVar("--c5") + " 40%, transparent)" : cssVar("--bg-elev");
        ctx.fillRect(x * cw + 0.5, y * ch + 0.5, cw - 1, ch - 1);
        if (v === 5) { ctx.fillStyle = cssVar("--fg-muted"); ctx.font = "10px ui-sans-serif"; ctx.fillText("5", x * cw + cw / 2 - 3, y * ch + ch / 2 + 4); }
      }
      ctx.fillStyle = cssVar("--ok"); ctx.beginPath(); ctx.arc((start[0] + .5) * cw, (start[1] + .5) * ch, Math.min(cw, ch) / 3, 0, 7); ctx.fill();
      ctx.fillStyle = cssVar("--danger"); ctx.save(); ctx.translate((goal[0] + .5) * cw, (goal[1] + .5) * ch); ctx.rotate(Math.PI / 4);
      var s = Math.min(cw, ch) / 2.6; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
    }
    clearAll();
    for (var y = 3; y < 12; y++) grid[y][13] = 1;
    for (var y2 = 5; y2 < 10; y2++) for (var x2 = 17; x2 < 21; x2++) grid[y2][x2] = 5;
    draw();
  });

  // ================================================================ btree
  W.register("btree", function (el) {
    U.title(el, "B-tree insertion (CLRS proactive splitting)");
    var t = U.select("Minimum degree t", [["2", "t = 2 (2-3-4 tree, max 3 keys)"], ["3", "t = 3 (max 5 keys)"], ["4", "t = 4 (max 7 keys)"]], "2", reset);
    var inp = h("input", { type: "number", value: "42", "aria-label": "Key to insert" });
    el.appendChild(U.controls([t.el, h("label", null, ["Key ", inp]), U.button("Insert", function () { insert(+inp.value); inp.value = Math.floor(Math.random() * 99) + 1; }, true), U.button("Insert 1…15 ascending", seq), U.button("10 random keys", rand), U.button("Search", find), U.button("Reset", reset)]));
    var stage = h("div", { class: "w-stage scroll-x" });
    el.appendChild(stage);
    var log = h("div", { class: "log", "aria-live": "polite" });
    el.appendChild(log);
    var root, T, hl = [];
    function node(leaf) { return { keys: [], kids: [], leaf: leaf }; }
    function reset() { T = +t.get(); root = node(true); log.textContent = ""; hl = []; render(); }
    function say(s) { log.textContent = s + "\n" + log.textContent; }
    function split(x, i) {
      var y = x.kids[i], z = node(y.leaf);
      var mid = y.keys[T - 1];
      z.keys = y.keys.slice(T); y.keys = y.keys.slice(0, T - 1);
      if (!y.leaf) { z.kids = y.kids.slice(T); y.kids = y.kids.slice(0, T); }
      x.kids.splice(i + 1, 0, z); x.keys.splice(i, 0, mid);
      say("  split full node → median " + mid + " moves up");
    }
    function insertNonFull(x, k) {
      var i = x.keys.length - 1;
      if (x.leaf) {
        while (i >= 0 && k < x.keys[i]) i--;
        x.keys.splice(i + 1, 0, k);
      } else {
        while (i >= 0 && k < x.keys[i]) i--;
        i++;
        if (x.kids[i].keys.length === 2 * T - 1) { split(x, i); if (k > x.keys[i]) i++; }
        insertNonFull(x.kids[i], k);
      }
    }
    function contains(x, k) { var i = 0; while (i < x.keys.length && k > x.keys[i]) i++; if (i < x.keys.length && x.keys[i] === k) return true; return x.leaf ? false : contains(x.kids[i], k); }
    function insert(k) {
      if (isNaN(k)) return;
      if (contains(root, k)) { say("key " + k + " already present (no duplicates in this demo)"); return; }
      say("insert " + k);
      if (root.keys.length === 2 * T - 1) { var s = node(false); s.kids.push(root); root = s; split(s, 0); say("  root was full → tree grows in height"); }
      insertNonFull(root, k);
      hl = [k]; render();
    }
    function find() {
      var k = +inp.value, x = root, path = [], depth = 0;
      while (x) {
        depth++;
        var i = 0; while (i < x.keys.length && k > x.keys[i]) i++;
        path.push("[" + x.keys.join(",") + "]");
        if (i < x.keys.length && x.keys[i] === k) { say("search " + k + ": found after visiting " + depth + " node(s): " + path.join(" → ")); hl = [k]; render(); return; }
        if (x.leaf) break;
        x = x.kids[i];
      }
      say("search " + k + ": not found; visited " + depth + " node(s): " + path.join(" → "));
    }
    function seq() { for (var i = 1; i <= 15; i++) insert(i); }
    function rand() { for (var i = 0; i < 10; i++) insert(1 + Math.floor(Math.random() * 99)); }
    function height(x) { return x.leaf ? 1 : 1 + height(x.kids[0]); }
    function render() {
      // layout: leaves left to right, parents centred over children
      var KW = 26, PAD = 8, GAP = 14, LH = 64, leafX = 10, boxes = [];
      function lay(x, d) {
        var w = Math.max(1, x.keys.length) * KW + PAD;
        if (x.leaf) { var b = { x: leafX, y: d * LH + 10, w: w, n: x }; leafX += w + GAP; boxes.push(b); return b; }
        var kids = x.kids.map(function (c) { return lay(c, d + 1); });
        var cx = (kids[0].x + kids[kids.length - 1].x + kids[kids.length - 1].w) / 2;
        var bb = { x: cx - w / 2, y: d * LH + 10, w: w, n: x, kids: kids };
        boxes.push(bb); return bb;
      }
      lay(root, 0);
      var minX = Math.min.apply(null, boxes.map(function (b) { return b.x; }));
      var shift = minX < 10 ? 10 - minX : 0;
      var W2 = Math.max(leafX, Math.max.apply(null, boxes.map(function (b) { return b.x + b.w; })) + 10) + shift, H2 = height(root) * LH + 10;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W2 + '" height="' + H2 + '" role="img" aria-label="B-tree diagram" style="display:block;min-width:100%">';
      boxes.forEach(function (b) {
        (b.kids || []).forEach(function (k, i) {
          var px = b.x + shift + PAD / 2 + i * KW;
          svg += '<line x1="' + px + '" y1="' + (b.y + 30) + '" x2="' + (k.x + shift + k.w / 2) + '" y2="' + k.y + '" stroke="' + cssVar("--border-strong") + '" stroke-width="1.5"/>';
        });
      });
      boxes.forEach(function (b) {
        svg += '<rect x="' + (b.x + shift) + '" y="' + b.y + '" width="' + b.w + '" height="30" rx="6" fill="' + cssVar("--bg-elev") + '" stroke="' + cssVar("--accent") + '" stroke-width="1.5"/>';
        b.n.keys.forEach(function (k, i) {
          var cx = b.x + shift + PAD / 2 + i * KW + KW / 2;
          if (hl.indexOf(k) >= 0) svg += '<rect x="' + (cx - KW / 2 + 1) + '" y="' + (b.y + 3) + '" width="' + (KW - 2) + '" height="24" rx="4" fill="' + cssVar("--accent-soft") + '"/>';
          svg += '<text x="' + cx + '" y="' + (b.y + 20) + '" text-anchor="middle" font-family="ui-monospace,monospace" font-size="12" fill="' + cssVar("--fg") + '">' + k + "</text>";
          if (i > 0) svg += '<line x1="' + (cx - KW / 2) + '" y1="' + (b.y + 5) + '" x2="' + (cx - KW / 2) + '" y2="' + (b.y + 25) + '" stroke="' + cssVar("--border") + '"/>';
        });
      });
      svg += "</svg>";
      stage.innerHTML = svg;
      stage.appendChild(h("p", { class: "w-out", style: "padding:0 10px", html: "Height <b>" + height(root) + "</b>. Every node except the root holds between t−1 = " + (T - 1) + " and 2t−1 = " + (2 * T - 1) + " keys; all leaves sit at the same depth. Real database pages hold hundreds of keys, so height stays 3–4 for billions of rows." }));
    }
    document.addEventListener("book:theme", render);
    reset();
    [50, 20, 80, 10, 30, 60, 90, 25].forEach(insert);
  });
})();
