/* widgets-ml.js — Part 3/3: machine learning & LLM widgets. Loaded on demand by widgets.js. */
(function () {
  "use strict";
  var W = window.BookWidgets, U = W.util, h = U.h, cssVar = U.cssVar;

  function mix(color, pct) { return "color-mix(in srgb, " + color + " " + pct + "%, transparent)"; }

  // ===================================================== gradient-descent
  W.register("gradient-descent", function (el) {
    U.title(el, "Gradient descent on a 2-D loss surface (click the plot to choose a start point)");
    var fn = U.select("Loss", [["bowl", "Round bowl  x² + y²"], ["valley", "Elongated valley  x² + 10y²"], ["rosen", "Rosenbrock (banana)"]], "valley", reset);
    var lr = U.slider("Learning rate η", 0.001, 0.2, 0.001, 0.05, null);
    var mom = U.slider("Momentum β", 0, 0.95, 0.05, 0, null);
    var playBtn = U.button("Run 100 steps", run, true);
    el.appendChild(U.controls([fn.el, lr.el, mom.el, playBtn, U.button("Step", function () { step(); draw(); }), U.button("Reset", reset)]));
    var cv = U.canvas(el, 300, draw);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var F = {
      bowl: { f: function (x, y) { return x * x + y * y; }, g: function (x, y) { return [2 * x, 2 * y]; }, box: [-3, 3, -3, 3], start: [-2.5, 2.2] },
      valley: { f: function (x, y) { return x * x + 10 * y * y; }, g: function (x, y) { return [2 * x, 20 * y]; }, box: [-3, 3, -1.5, 1.5], start: [-2.6, 1.2] },
      rosen: { f: function (x, y) { return Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2); }, g: function (x, y) { return [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)]; }, box: [-2, 2, -1, 3], start: [-1.5, 2.5] }
    };
    var p, v, path, timer, startPt = null;
    function reset() { clearInterval(timer); timer = null; var s = startPt || F[fn.get()].start; p = s.slice(); v = [0, 0]; path = [p.slice()]; draw(); }
    function step() {
      var f = F[fn.get()], g = f.g(p[0], p[1]), b = mom.get(), a = lr.get() * (fn.get() === "rosen" ? 0.02 : 1);
      v = [b * v[0] - a * g[0], b * v[1] - a * g[1]];
      p = [p[0] + v[0], p[1] + v[1]];
      if (!isFinite(p[0]) || Math.abs(p[0]) > 1e6) p = [NaN, NaN];
      path.push(p.slice());
    }
    function run() { clearInterval(timer); var n = 0; timer = setInterval(function () { step(); draw(); if (++n >= 100 || isNaN(p[0])) clearInterval(timer); }, 20); }
    function toPx(x, y, box, w, H) { return [(x - box[0]) / (box[1] - box[0]) * w, H - (y - box[2]) / (box[3] - box[2]) * H]; }
    cv.cv.addEventListener("click", function (e) {
      var r = cv.cv.getBoundingClientRect(), box = F[fn.get()].box;
      startPt = [box[0] + (e.clientX - r.left) / r.width * (box[1] - box[0]), box[3] - (e.clientY - r.top) / r.height * (box[3] - box[2])];
      reset();
    });
    fn.input.addEventListener("change", function () { startPt = null; reset(); });
    function draw() {
      if (!path) return;
      var f = F[fn.get()], box = f.box, ctx = cv.ctx, w = cv.w, H = cv.h;
      ctx.clearRect(0, 0, w, H);
      var res = 6, maxv = 0, vals = [];
      for (var yy = 0; yy < H; yy += res) for (var xx = 0; xx < w; xx += res) {
        var x = box[0] + xx / w * (box[1] - box[0]), y = box[3] - yy / H * (box[3] - box[2]);
        var val = Math.log(1 + f.f(x, y)); vals.push([xx, yy, val]); if (val > maxv) maxv = val;
      }
      var c1 = cssVar("--c1");
      vals.forEach(function (q) { ctx.fillStyle = mix(c1, Math.round(5 + 55 * (1 - q[2] / maxv))); ctx.fillRect(q[0], q[1], res, res); });
      var min = fn.get() === "rosen" ? [1, 1] : [0, 0], mp = toPx(min[0], min[1], box, w, H);
      ctx.strokeStyle = cssVar("--ok"); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mp[0], mp[1], 7, 0, 7); ctx.stroke();
      ctx.strokeStyle = cssVar("--c2"); ctx.lineWidth = 2; ctx.beginPath();
      path.forEach(function (q, i) { if (isNaN(q[0])) return; var s = toPx(q[0], q[1], box, w, H); if (i === 0) ctx.moveTo(s[0], s[1]); else ctx.lineTo(s[0], s[1]); });
      ctx.stroke();
      path.forEach(function (q) { if (isNaN(q[0])) return; var s = toPx(q[0], q[1], box, w, H); ctx.fillStyle = cssVar("--c2"); ctx.beginPath(); ctx.arc(s[0], s[1], 2.5, 0, 7); ctx.fill(); });
      var loss = isNaN(p[0]) ? "diverged (∞)" : f.f(p[0], p[1]).toExponential(3);
      out.innerHTML = "Step <b>" + (path.length - 1) + "</b> · position (" + (isNaN(p[0]) ? "–" : p[0].toFixed(3) + ", " + p[1].toFixed(3)) + ") · loss <b>" + loss + "</b>. " +
        "On the valley, η above 0.1 makes the steep y-direction oscillate and diverge (2·10·η &gt; 2), while the flat x-direction still crawls — the classic ill-conditioning problem that momentum and Adam address.";
    }
    reset();
  });

  // ======================================================== bias-variance
  W.register("bias-variance", function (el) {
    U.title(el, "Under- and overfitting: polynomial regression on noisy sin(2πx)");
    var deg = U.slider("Polynomial degree", 0, 15, 1, 3, draw);
    var npts = U.slider("Training points", 8, 60, 1, 15, resample);
    var noise = U.slider("Noise σ", 0, 0.6, 0.05, 0.25, resample);
    var lam = U.slider("L2 penalty log₁₀λ", -8, 1, 0.5, -8, draw);
    el.appendChild(U.controls([deg.el, npts.el, noise.el, lam.el, U.button("New sample", function () { seed++; resample(); }, true)]));
    var cv = U.canvas(el, 260, draw);
    var cv2 = U.canvas(el, 150, draw);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var seed = 3, train, test;
    function gauss(r) { var u = 1 - r(), v2 = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v2); }
    function truth(x) { return Math.sin(2 * Math.PI * x); }
    function resample() {
      var r = U.rng(seed); train = []; test = [];
      for (var i = 0; i < npts.get(); i++) { var x = r(); train.push([x, truth(x) + noise.get() * gauss(r)]); }
      for (var j = 0; j < 300; j++) { var x2 = r(); test.push([x2, truth(x2) + noise.get() * gauss(r)]); }
      draw();
    }
    function fit(d, lambda) { // ridge regression on x scaled to [-1,1] via normal equations + Gaussian elimination
      var m = d + 1, A = [], b = [];
      for (var i = 0; i < m; i++) { A.push(new Array(m).fill(0)); b.push(0); }
      train.forEach(function (pt) {
        var xs = 2 * pt[0] - 1, pw = [1];
        for (var k = 1; k < m; k++) pw.push(pw[k - 1] * xs);
        for (var r = 0; r < m; r++) { b[r] += pw[r] * pt[1]; for (var c = 0; c < m; c++) A[r][c] += pw[r] * pw[c]; }
      });
      for (var q = 1; q < m; q++) A[q][q] += lambda + 1e-10;
      A[0][0] += 1e-10;
      for (var col = 0; col < m; col++) { // partial pivoting
        var piv = col; for (var rr = col + 1; rr < m; rr++) if (Math.abs(A[rr][col]) > Math.abs(A[piv][col])) piv = rr;
        var tmp = A[col]; A[col] = A[piv]; A[piv] = tmp; var tb = b[col]; b[col] = b[piv]; b[piv] = tb;
        for (var r2 = col + 1; r2 < m; r2++) { var f = A[r2][col] / A[col][col]; for (var c2 = col; c2 < m; c2++) A[r2][c2] -= f * A[col][c2]; b[r2] -= f * b[col]; }
      }
      var w = new Array(m).fill(0);
      for (var r3 = m - 1; r3 >= 0; r3--) { var s = b[r3]; for (var c3 = r3 + 1; c3 < m; c3++) s -= A[r3][c3] * w[c3]; w[r3] = s / A[r3][r3]; }
      return function (x) { var xs = 2 * x - 1, y = 0, pw = 1; for (var k = 0; k < m; k++) { y += w[k] * pw; pw *= xs; } return y; };
    }
    function mse(model, data) { var s = 0; data.forEach(function (p) { var e = model(p[0]) - p[1]; s += e * e; }); return s / data.length; }
    function draw() {
      if (!train) return;
      var lambda = Math.pow(10, lam.get()), model = fit(deg.get(), lambda);
      var ctx = cv.ctx, w = cv.w, H = cv.h; ctx.clearRect(0, 0, w, H);
      function px(x, y) { return [10 + x * (w - 20), H / 2 - y * (H / 2 - 16) / 1.6]; }
      ctx.strokeStyle = cssVar("--fg-faint"); ctx.setLineDash([4, 4]); ctx.beginPath();
      for (var i = 0; i <= 200; i++) { var x = i / 200, q = px(x, truth(x)); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = cssVar("--c2"); ctx.lineWidth = 2.5; ctx.beginPath();
      for (var j = 0; j <= 300; j++) { var x2 = j / 300, y2 = Math.max(-3, Math.min(3, model(x2))), q2 = px(x2, y2); if (j) ctx.lineTo(q2[0], q2[1]); else ctx.moveTo(q2[0], q2[1]); }
      ctx.stroke(); ctx.lineWidth = 1;
      train.forEach(function (p) { var q = px(p[0], p[1]); ctx.fillStyle = cssVar("--c1"); ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 7); ctx.fill(); });
      // error curves across degrees
      var c = cv2.ctx, w2 = cv2.w, H2 = cv2.h; c.clearRect(0, 0, w2, H2);
      var tr = [], te = [];
      for (var d = 0; d <= 15; d++) { var mdl = fit(d, lambda); tr.push(mse(mdl, train)); te.push(Math.min(mse(mdl, test), 2)); }
      var ymax = Math.max.apply(null, te.concat(tr)) * 1.1 || 1;
      function p2(d2, e) { return [40 + d2 / 15 * (w2 - 60), H2 - 20 - e / ymax * (H2 - 34)]; }
      c.strokeStyle = cssVar("--border"); c.beginPath(); c.moveTo(40, 10); c.lineTo(40, H2 - 20); c.lineTo(w2 - 15, H2 - 20); c.stroke();
      [[tr, cssVar("--c1"), "train MSE"], [te, cssVar("--c2"), "test MSE"]].forEach(function (s, si) {
        c.strokeStyle = s[1]; c.lineWidth = 2; c.beginPath();
        s[0].forEach(function (e, d3) { var q = p2(d3, e); if (d3) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); });
        c.stroke(); c.fillStyle = s[1]; c.font = "11px ui-sans-serif"; c.fillText(s[2], w2 - 90, 18 + si * 14);
      });
      var cur = p2(deg.get(), te[deg.get()]);
      c.strokeStyle = cssVar("--fg-faint"); c.setLineDash([3, 3]); c.beginPath(); c.moveTo(cur[0], 10); c.lineTo(cur[0], H2 - 20); c.stroke(); c.setLineDash([]);
      c.fillStyle = cssVar("--fg-muted"); c.fillText("degree 0 … 15 →", 44, H2 - 6);
      var best = te.indexOf(Math.min.apply(null, te));
      out.innerHTML = "Degree <b>" + deg.get() + "</b>: train MSE <b>" + tr[deg.get()].toFixed(3) + "</b>, test MSE <b>" + te[deg.get()].toFixed(3) + "</b> (best test degree here: " + best + "). Dashed curve = true function, orange = fitted model. " +
        "High degree with few points drives train error toward 0 while test error explodes; raising λ (ridge) tames the high-degree fit without changing the degree.";
    }
    resample();
  });

  // ================================================================ kmeans
  W.register("kmeans", function (el) {
    U.title(el, "K-means clustering, one iteration at a time");
    var k = U.slider("k", 2, 8, 1, 3, reset);
    var init = U.select("Init", [["random", "Random points"], ["pp", "k-means++"]], "pp", reset);
    var blobs = U.slider("True clusters", 2, 6, 1, 4, function () { gen(); reset(); });
    el.appendChild(U.controls([k.el, init.el, blobs.el, U.button("Step", step, true), U.button("Run to convergence", runAll), U.button("Re-init", reset), U.button("New data", function () { seed++; gen(); reset(); })]));
    var cv = U.canvas(el, 300, draw);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var seed = 9, pts, cents, assign, iter, phase;
    function gauss(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
    function gen() {
      var r = U.rng(seed); pts = [];
      for (var b = 0; b < blobs.get(); b++) {
        var cx = .15 + r() * .7, cy = .15 + r() * .7, s = .04 + r() * .05;
        for (var i = 0; i < 60; i++) pts.push([cx + gauss(r) * s, cy + gauss(r) * s]);
      }
    }
    function d2(a, b) { return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]); }
    function reset() {
      var r = U.rng(seed * 31 + k.get()); cents = [];
      if (init.get() === "random") for (var i = 0; i < k.get(); i++) cents.push(pts[Math.floor(r() * pts.length)].slice());
      else {
        cents.push(pts[Math.floor(r() * pts.length)].slice());
        while (cents.length < k.get()) {
          var ds = pts.map(function (p) { return Math.min.apply(null, cents.map(function (c) { return d2(p, c); })); });
          var tot = ds.reduce(function (a, b) { return a + b; }, 0), u = r() * tot, j = 0;
          while (u > ds[j]) { u -= ds[j]; j++; }
          cents.push(pts[Math.min(j, pts.length - 1)].slice());
        }
      }
      assign = pts.map(function () { return -1; }); iter = 0; phase = "assign"; draw();
    }
    function inertia() { var s = 0; pts.forEach(function (p, i) { if (assign[i] >= 0) s += d2(p, cents[assign[i]]); }); return s; }
    function step() {
      if (phase === "assign") {
        var changed = 0;
        pts.forEach(function (p, i) { var best = 0; for (var c = 1; c < cents.length; c++) if (d2(p, cents[c]) < d2(p, cents[best])) best = c; if (assign[i] !== best) changed++; assign[i] = best; });
        phase = "update"; draw(changed); return changed;
      }
      cents = cents.map(function (c, ci) {
        var sx = 0, sy = 0, n = 0; pts.forEach(function (p, i) { if (assign[i] === ci) { sx += p[0]; sy += p[1]; n++; } });
        return n ? [sx / n, sy / n] : c;
      });
      iter++; phase = "assign"; draw(); return 1;
    }
    function runAll() { for (var i = 0; i < 100; i++) { if (phase === "assign" && step() === 0) break; if (phase === "update") step(); } draw(0); }
    function draw(changed) {
      if (!cents) return;
      var ctx = cv.ctx, w = cv.w, H = cv.h, pal = U.palette().concat([cssVar("--danger"), cssVar("--fg-muted")]);
      ctx.clearRect(0, 0, w, H);
      pts.forEach(function (p, i) { ctx.fillStyle = assign[i] >= 0 ? pal[assign[i] % pal.length] : cssVar("--fg-faint"); ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(p[0] * w, p[1] * H, 3.2, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;
      cents.forEach(function (c, i) {
        ctx.fillStyle = pal[i % pal.length]; ctx.strokeStyle = cssVar("--fg"); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(c[0] * w, c[1] * H - 9); ctx.lineTo(c[0] * w + 8, c[1] * H + 6); ctx.lineTo(c[0] * w - 8, c[1] * H + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      out.innerHTML = "Iteration <b>" + iter + "</b> · next phase: <b>" + (phase === "assign" ? "assign points to nearest centroid" : "move centroids to cluster means") + "</b> · inertia (within-cluster SSE) <b>" + inertia().toFixed(3) + "</b>" +
        (changed === 0 ? " · <b style='color:var(--ok)'>converged</b>" : "") + ". Try k ≠ true clusters, and random init vs k-means++ to see bad local minima.";
    }
    gen(); reset();
  });

  // ============================================================ neural-net
  W.register("neural-net", function (el) {
    U.title(el, "A small neural network learning a decision boundary (trained live in your browser)");
    var ds = U.select("Dataset", [["xor", "XOR"], ["circle", "Circle"], ["spiral", "Two spirals"], ["linear", "Linearly separable"]], "circle", function () { gen(); init(); });
    var hidden = U.slider("Hidden units", 1, 16, 1, 6, init);
    var layers = U.select("Hidden layers", [["1", "1"], ["2", "2"]], "1", init);
    var act = U.select("Activation", [["tanh", "tanh"], ["relu", "ReLU"], ["sigmoid", "sigmoid"]], "tanh", init);
    var lr = U.slider("Learning rate", 0.005, 0.5, 0.005, 0.1, null);
    var playBtn = U.button("Train", toggle, true);
    el.appendChild(U.controls([ds.el, hidden.el, layers.el, act.el, lr.el, playBtn, U.button("Re-initialise", init)]));
    var row = h("div", { class: "w-grid" });
    el.appendChild(row);
    var c1 = h("div"), c2 = h("div");
    row.appendChild(c1); row.appendChild(c2);
    var cv = U.canvas(c1, 260, draw);
    var lc = U.canvas(c2, 260, drawLoss);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var data, net, losses, epoch, timer, rr;
    function gen() {
      var r = U.rng(17); data = [];
      for (var i = 0; i < 240; i++) {
        var x, y, lab;
        if (ds.get() === "xor") { x = r() * 2 - 1; y = r() * 2 - 1; lab = (x * y > 0) ? 1 : 0; }
        else if (ds.get() === "circle") { x = r() * 2 - 1; y = r() * 2 - 1; lab = x * x + y * y < 0.45 ? 1 : 0; }
        else if (ds.get() === "linear") { x = r() * 2 - 1; y = r() * 2 - 1; lab = y > 0.6 * x - 0.1 ? 1 : 0; }
        else { var t = (i % 120) / 120 * 3 * Math.PI + 0.4, s = i < 120 ? 1 : -1; x = s * t * Math.cos(t) / 10 + (r() - .5) * .08; y = s * t * Math.sin(t) / 10 + (r() - .5) * .08; lab = i < 120 ? 1 : 0; }
        data.push([x, y, lab]);
      }
    }
    function f(z) { var a = act.get(); return a === "tanh" ? Math.tanh(z) : a === "relu" ? Math.max(0, z) : 1 / (1 + Math.exp(-z)); }
    function df(a, z) { var t = act.get(); return t === "tanh" ? 1 - a * a : t === "relu" ? (z > 0 ? 1 : 0) : a * (1 - a); }
    function init() {
      rr = U.rng(5 + hidden.get() * 13 + (+layers.get()));
      var sizes = [2]; for (var l = 0; l < +layers.get(); l++) sizes.push(hidden.get()); sizes.push(1);
      net = [];
      for (var i = 1; i < sizes.length; i++) {
        var Wm = [], b = [], scale = Math.sqrt(2 / (sizes[i - 1] + sizes[i]));
        for (var j = 0; j < sizes[i]; j++) { var rowW = []; for (var k2 = 0; k2 < sizes[i - 1]; k2++) rowW.push((rr() * 2 - 1) * scale * 1.7); Wm.push(rowW); b.push(0); }
        net.push({ W: Wm, b: b, mW: Wm.map(function (r2) { return r2.map(function () { return 0; }); }), mb: b.map(function () { return 0; }) });
      }
      losses = []; epoch = 0; draw(); drawLoss();
    }
    function forward(x) {
      var as = [x], zs = [];
      net.forEach(function (L, li) {
        var prev = as[as.length - 1], z = [], a = [];
        for (var j = 0; j < L.W.length; j++) { var s = L.b[j]; for (var k2 = 0; k2 < prev.length; k2++) s += L.W[j][k2] * prev[k2]; z.push(s); a.push(li === net.length - 1 ? 1 / (1 + Math.exp(-s)) : f(s)); }
        zs.push(z); as.push(a);
      });
      return { as: as, zs: zs };
    }
    function trainEpoch() {
      var gW = net.map(function (L) { return L.W.map(function (r2) { return r2.map(function () { return 0; }); }); });
      var gb = net.map(function (L) { return L.b.map(function () { return 0; }); });
      var loss = 0;
      data.forEach(function (d) {
        var fw = forward([d[0], d[1]]), yhat = fw.as[fw.as.length - 1][0], y = d[2];
        loss += -(y * Math.log(yhat + 1e-9) + (1 - y) * Math.log(1 - yhat + 1e-9));
        var delta = [yhat - y]; // dL/dz for sigmoid + BCE
        for (var l = net.length - 1; l >= 0; l--) {
          var aPrev = fw.as[l];
          for (var j = 0; j < delta.length; j++) { gb[l][j] += delta[j]; for (var k2 = 0; k2 < aPrev.length; k2++) gW[l][j][k2] += delta[j] * aPrev[k2]; }
          if (l > 0) {
            var nd = [];
            for (var k3 = 0; k3 < aPrev.length; k3++) { var s = 0; for (var j2 = 0; j2 < delta.length; j2++) s += net[l].W[j2][k3] * delta[j2]; nd.push(s * df(aPrev[k3], fw.zs[l - 1][k3])); }
            delta = nd;
          }
        }
      });
      var n = data.length, eta = lr.get(), beta = 0.9;
      net.forEach(function (L, l) {
        for (var j = 0; j < L.W.length; j++) {
          L.mb[j] = beta * L.mb[j] + gb[l][j] / n; L.b[j] -= eta * L.mb[j];
          for (var k2 = 0; k2 < L.W[j].length; k2++) { L.mW[j][k2] = beta * L.mW[j][k2] + gW[l][j][k2] / n; L.W[j][k2] -= eta * L.mW[j][k2]; }
        }
      });
      epoch++; losses.push(loss / n);
      if (losses.length > 400) losses.shift();
    }
    function accuracy() { var c = 0; data.forEach(function (d) { var y = forward([d[0], d[1]]).as; if ((y[y.length - 1][0] > .5 ? 1 : 0) === d[2]) c++; }); return c / data.length; }
    function toggle() {
      if (timer) { clearInterval(timer); timer = null; playBtn.textContent = "Train"; return; }
      playBtn.textContent = "Pause";
      timer = setInterval(function () { if (!el.isConnected) { clearInterval(timer); return; } for (var i = 0; i < 8; i++) trainEpoch(); draw(); drawLoss(); }, 30);
    }
    function draw() {
      if (!net) return;
      var ctx = cv.ctx, w = cv.w, H = cv.h, res = 8, A = cssVar("--c1"), B = cssVar("--c2");
      ctx.clearRect(0, 0, w, H);
      for (var y = 0; y < H; y += res) for (var x = 0; x < w; x += res) {
        var px = x / w * 2 - 1, py = 1 - y / H * 2, o = forward([px, py]).as, p = o[o.length - 1][0];
        ctx.fillStyle = mix(p > .5 ? A : B, Math.round(Math.abs(p - .5) * 90 + 5)); ctx.fillRect(x, y, res, res);
      }
      data.forEach(function (d) { ctx.fillStyle = d[2] ? A : B; ctx.strokeStyle = cssVar("--bg"); ctx.beginPath(); ctx.arc((d[0] + 1) / 2 * w, (1 - d[1]) / 2 * H, 3.5, 0, 7); ctx.fill(); ctx.stroke(); });
      var params = net.reduce(function (s, L) { return s + L.W.length * (L.W[0].length + 1); }, 0);
      out.innerHTML = "Epoch <b>" + epoch + "</b> · loss <b>" + (losses.length ? losses[losses.length - 1].toFixed(4) : "–") + "</b> · accuracy <b>" + (accuracy() * 100).toFixed(1) + "%</b> · parameters <b>" + params + "</b>. " +
        "Full-batch gradient descent with momentum on binary cross-entropy; backpropagation is ~40 lines of plain JavaScript in this widget. Try XOR with 1 hidden unit (impossible), then 3+. Spirals need 2 layers and patience.";
    }
    function drawLoss() {
      var ctx = lc.ctx, w = lc.w, H = lc.h; ctx.clearRect(0, 0, w, H);
      ctx.fillStyle = cssVar("--fg-muted"); ctx.font = "11px ui-sans-serif"; ctx.fillText("training loss (last 400 epochs)", 8, 14);
      if (losses.length < 2) return;
      var mx = Math.max.apply(null, losses);
      ctx.strokeStyle = cssVar("--c3"); ctx.lineWidth = 2; ctx.beginPath();
      losses.forEach(function (l, i) { var x = 8 + i / (losses.length - 1) * (w - 16), y = H - 10 - l / mx * (H - 30); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
    }
    gen(); init();
  });

  // ============================================================= attention
  W.register("attention", function (el) {
    U.title(el, "Scaled dot-product self-attention (hand-built heads, illustrative)");
    var sent = h("input", { type: "text", value: "the tired cat sat on the mat because it was sleepy", "aria-label": "Sentence", style: "flex:1;min-width:220px" });
    var head = U.select("Head", [["prev", "Previous-token head"], ["coref", "Pronoun → noun head"], ["sem", "Same word-class head"], ["self", "Mostly-self head"]], "coref", draw);
    var temp = U.slider("Temperature", 0.2, 3, 0.1, 1, draw);
    var causal = h("input", { type: "checkbox", checked: "checked", "aria-label": "Causal mask" });
    el.appendChild(U.controls([h("label", { style: "flex:1;min-width:240px" }, ["Sentence ", sent]), head.el, temp.el, h("label", null, [causal, " causal mask (decoder)"])]));
    var toks = h("div");
    el.appendChild(toks);
    var stage = h("div", { class: "w-stage scroll-x", style: "padding:8px" });
    el.appendChild(stage);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    var LEX = { noun: ["cat", "mat", "dog", "man", "woman", "server", "request", "cache", "model", "car", "street", "bank", "river", "user", "database"], pron: ["it", "he", "she", "they", "this", "them", "him", "her"], det: ["the", "a", "an", "this", "that", "its"], verb: ["sat", "was", "is", "ran", "crossed", "failed", "served", "returned", "slept", "were", "are"], prep: ["on", "in", "at", "to", "from", "of", "over", "under", "because"], adj: ["tired", "sleepy", "big", "small", "slow", "fast", "busy", "wide"] };
    function cls(w) { for (var c in LEX) if (LEX[c].indexOf(w) >= 0) return c; return "other"; }
    var selRow = null;
    sent.addEventListener("input", function () { selRow = null; draw(); });
    causal.addEventListener("change", draw);
    function scores(words) {
      var n = words.length, S = [];
      for (var i = 0; i < n; i++) {
        S.push([]);
        for (var j = 0; j < n; j++) {
          var s = 0, ci = cls(words[i]), cj = cls(words[j]);
          switch (head.get()) {
            case "prev": s = j === i - 1 ? 4 : j === i ? 1 : 0; break;
            case "coref": s = ci === "pron" ? (cj === "noun" ? 3 + (cj === "noun" && j < i ? 1.5 - (i - j) * 0.05 : 0) + (words[j - 1] && cls(words[j - 1]) === "adj" ? .5 : 0) : 0) : (j === i ? 2 : 0); break;
            case "sem": s = ci === cj ? 2.5 : 0; break;
            default: s = j === i ? 3 : 0.5;
          }
          S[i].push(s * 2); // pretend these are q·k / √d already
        }
      }
      return S;
    }
    function draw() {
      var words = sent.value.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 16);
      if (!words.length) { stage.innerHTML = ""; return; }
      var S = scores(words), n = words.length, T = temp.get(), A = [];
      for (var i = 0; i < n; i++) {
        var row = S[i].map(function (s, j) { return causal.checked && j > i ? -Infinity : s / T; });
        var mx = Math.max.apply(null, row), ex = row.map(function (v) { return v === -Infinity ? 0 : Math.exp(v - mx); });
        var sum = ex.reduce(function (a, b) { return a + b; }, 0);
        A.push(ex.map(function (e) { return e / sum; }));
      }
      var cell = Math.max(26, Math.min(40, Math.floor((stage.clientWidth - 110) / n))), lab = 90, c1 = cssVar("--c1");
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (lab + n * cell + 10) + '" height="' + (lab + n * cell + 10) + '" style="display:block">';
      words.forEach(function (w, j) { svg += '<text transform="translate(' + (lab + j * cell + cell / 2 + 4) + "," + (lab - 6) + ') rotate(-55)" font-size="12" fill="' + cssVar("--fg-muted") + '" font-family="ui-monospace,monospace">' + U.esc(w) + "</text>"; });
      for (var r = 0; r < n; r++) {
        svg += '<text x="' + (lab - 6) + '" y="' + (lab + r * cell + cell / 2 + 4) + '" text-anchor="end" font-size="12" font-family="ui-monospace,monospace" fill="' + (selRow === r ? cssVar("--accent") : cssVar("--fg-muted")) + '" style="cursor:pointer" data-r="' + r + '">' + U.esc(words[r]) + "</text>";
        for (var c = 0; c < n; c++) {
          var v = A[r][c];
          svg += '<rect data-r="' + r + '" x="' + (lab + c * cell) + '" y="' + (lab + r * cell) + '" width="' + (cell - 2) + '" height="' + (cell - 2) + '" rx="3" fill="' + (causal.checked && c > r ? cssVar("--bg-sunk") : mix(c1, Math.round(4 + v * 96))) + '" stroke="' + (selRow === r ? cssVar("--accent") : "none") + '"><title>' + U.esc(words[r]) + " → " + U.esc(words[c]) + ": " + v.toFixed(3) + "</title></rect>";
          if (cell >= 30 && v >= 0.1) svg += '<text x="' + (lab + c * cell + cell / 2 - 1) + '" y="' + (lab + r * cell + cell / 2 + 3) + '" text-anchor="middle" font-size="9" fill="' + (v > .55 ? cssVar("--bg") : cssVar("--fg")) + '" pointer-events="none">' + v.toFixed(2) + "</text>";
        }
      }
      svg += "</svg>";
      stage.innerHTML = svg;
      stage.querySelectorAll("[data-r]").forEach(function (e) { e.addEventListener("click", function () { selRow = +e.getAttribute("data-r"); draw(); }); });
      toks.innerHTML = "";
      words.forEach(function (w, i) { toks.appendChild(h("span", { class: "tok" + (selRow === i ? " sel" : ""), text: w + " · " + cls(w), onclick: function () { selRow = i; draw(); } })); });
      if (selRow != null && selRow < n) {
        var top = A[selRow].map(function (v, j) { return [v, words[j], j]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 3);
        out.innerHTML = "Row <b>“" + U.esc(words[selRow]) + "”</b> is the query. Its output vector is the weighted sum of value vectors: " + top.map(function (t) { return "<b>" + t[0].toFixed(2) + "</b> × v(“" + U.esc(t[1]) + "”)"; }).join(" + ") + " + …";
      } else out.innerHTML = "Each row is a query token; each column a key token; each row sums to 1 after softmax. Click a row. Real heads learn these patterns from data — the scores here are hand-designed so the patterns are visible (previous-token and coreference-like heads have been observed in trained transformers). Higher temperature flattens the distribution; the causal mask stops tokens attending to the future.";
    }
    setTimeout(draw, 0);
    document.addEventListener("book:theme", draw);
  });

  // ============================================================= tokenizer
  W.register("tokenizer", function (el) {
    U.title(el, "Byte-pair encoding (BPE): learn merges, then tokenize");
    var corpus = h("textarea", { rows: "4", "aria-label": "Training corpus" });
    corpus.value = "the lowest latency is the lower bound. newer servers are lower latency than older servers. the newest server has the lowest latency. low latency, lower cost, lowest risk.";
    var test = h("input", { type: "text", value: "the slowest newer services", "aria-label": "Text to tokenize", style: "flex:1;min-width:200px" });
    var merges = U.slider("Number of merges", 0, 80, 1, 20, run);
    el.appendChild(h("label", { style: "display:block;margin-bottom:8px" }, ["Training text", corpus]));
    el.appendChild(U.controls([merges.el, h("label", { style: "flex:1" }, ["Tokenize ", test])]));
    var outTok = h("div", { class: "w-card" });
    var outM = h("div", { class: "log" });
    el.appendChild(outTok); el.appendChild(h("p", { class: "w-out", text: "Learned merges (in order):" })); el.appendChild(outM);
    corpus.addEventListener("input", run); test.addEventListener("input", run);
    function words(text) { return text.toLowerCase().split(/\s+/).filter(Boolean).map(function (w) { return "▁" + w; }); }
    function learn() {
      var freq = {}; words(corpus.value).forEach(function (w) { freq[w] = (freq[w] || 0) + 1; });
      var vocab = Object.keys(freq).map(function (w) { return { syms: Array.from(w), n: freq[w] }; });
      var rules = [];
      for (var m = 0; m < merges.get(); m++) {
        var pairs = {};
        vocab.forEach(function (v) { for (var i = 0; i < v.syms.length - 1; i++) { var p = v.syms[i] + "\u0000" + v.syms[i + 1]; pairs[p] = (pairs[p] || 0) + v.n; } });
        var best = null, bn = 0;
        Object.keys(pairs).forEach(function (p) { if (pairs[p] > bn || (pairs[p] === bn && p < best)) { bn = pairs[p]; best = p; } });
        if (!best || bn < 2) break;
        var ab = best.split("\u0000"); rules.push([ab[0], ab[1], bn]);
        vocab.forEach(function (v) { var s = []; for (var i = 0; i < v.syms.length; i++) { if (i < v.syms.length - 1 && v.syms[i] === ab[0] && v.syms[i + 1] === ab[1]) { s.push(ab[0] + ab[1]); i++; } else s.push(v.syms[i]); } v.syms = s; });
      }
      return rules;
    }
    function encode(text, rules) {
      var out = [];
      words(text).forEach(function (w) {
        var s = Array.from(w);
        rules.forEach(function (r) { var t = []; for (var i = 0; i < s.length; i++) { if (i < s.length - 1 && s[i] === r[0] && s[i + 1] === r[1]) { t.push(r[0] + r[1]); i++; } else t.push(s[i]); } s = t; });
        out = out.concat(s);
      });
      return out;
    }
    function run() {
      var rules = learn(), toks = encode(test.value, rules), pal = U.palette();
      outTok.innerHTML = "";
      outTok.appendChild(h("h5", { text: toks.length + " tokens for " + Array.from(test.value).length + " characters" }));
      toks.forEach(function (t, i) { outTok.appendChild(h("span", { class: "pill", style: "background:" + pal[i % pal.length], text: t })); });
      outM.textContent = rules.length ? rules.map(function (r, i) { return (i + 1) + ". " + r[0] + " + " + r[1] + " → " + r[0] + r[1] + "   (pair seen " + r[2] + "×)"; }).join("\n") : "(no merges yet — every character is a token)";
    }
    run();
  });

  // ============================================================== sampling
  W.register("sampling", function (el) {
    U.title(el, "Next-token sampling: temperature, top-k, top-p (nucleus), min-p");
    var temp = U.slider("Temperature", 0, 2, 0.05, 1, draw);
    var topk = U.slider("top-k (0 = off)", 0, 12, 1, 0, draw);
    var topp = U.slider("top-p", 0.05, 1, 0.05, 1, draw);
    var minp = U.slider("min-p", 0, 0.5, 0.01, 0, draw);
    el.appendChild(U.controls([temp.el, topk.el, topp.el, minp.el, U.button("Sample 20 continuations", sample, true)]));
    el.appendChild(h("p", { class: "w-out", html: "Context: <code>“After the deploy, the API latency was”</code> — logits below are illustrative." }));
    var barsEl = h("div");
    el.appendChild(barsEl);
    var out = h("div", { class: "w-out" });
    el.appendChild(out);
    var cand = [["high", 3.1], ["higher", 2.6], ["fine", 2.2], ["terrible", 1.8], ["stable", 1.7], ["unchanged", 1.4], ["spiky", 1.1], ["awful", .7], ["lower", .6], ["purple", -1.5], ["banana", -2.5], ["Paris", -3]];
    var r = U.rng(99);
    function dist() {
      var T = temp.get();
      var probs;
      if (T === 0) { probs = cand.map(function (c, i) { return i === 0 ? 1 : 0; }); }
      else {
        var z = cand.map(function (c) { return c[1] / T; }), mx = Math.max.apply(null, z);
        var e = z.map(function (v) { return Math.exp(v - mx); }), s = e.reduce(function (a, b) { return a + b; }, 0);
        probs = e.map(function (v) { return v / s; });
      }
      var idx = probs.map(function (p, i) { return i; }).sort(function (a, b) { return probs[b] - probs[a]; });
      var keep = {};
      var k = topk.get() || cand.length, cum = 0, pmax = probs[idx[0]];
      for (var j = 0; j < idx.length; j++) {
        var i2 = idx[j];
        if (j >= k) break;
        if (probs[i2] < minp.get() * pmax) break;
        keep[i2] = true; cum += probs[i2];
        if (cum >= topp.get()) break;
      }
      var tot = 0; probs.forEach(function (p, i) { if (keep[i]) tot += p; });
      return { raw: probs, fin: probs.map(function (p, i) { return keep[i] ? p / tot : 0; }) };
    }
    function draw() {
      var d = dist(), pal = U.palette();
      U.bars(barsEl, cand.map(function (c, i) { return { label: c[0], value: d.fin[i], color: d.fin[i] ? pal[0] : cssVar("--fg-faint"), text: (d.fin[i] * 100).toFixed(1) + "%" + (d.fin[i] ? "" : " ✂") }; }), { max: 1 });
      var ent = 0; d.fin.forEach(function (p) { if (p > 0) ent -= p * Math.log2(p); });
      out.innerHTML = "Tokens surviving filters: <b>" + d.fin.filter(function (p) { return p > 0; }).length + "</b> · entropy <b>" + ent.toFixed(2) + " bits</b>. Temperature 0 = greedy (always “high”). Raise it and nonsense like “purple” becomes possible unless top-p/top-k/min-p cut the tail.";
    }
    function sample() {
      var d = dist(), res = [];
      for (var n = 0; n < 20; n++) { var u = r(), acc = 0; for (var i = 0; i < cand.length; i++) { acc += d.fin[i]; if (u <= acc) { res.push(cand[i][0]); break; } } }
      out.innerHTML += "<br>Samples: " + res.map(function (t) { return "<code>" + t + "</code>"; }).join(" ");
    }
    draw();
  });

  // ========================================================= rag-retrieval
  W.register("rag-retrieval", function (el) {
    U.title(el, "RAG retrieval lab: chunking × BM25 × vector × hybrid (RRF)");
    var q = h("input", { type: "text", value: "how do I stop duplicate charges when a client retries", "aria-label": "Query", style: "flex:1;min-width:240px" });
    var method = U.select("Retriever", [["hybrid", "Hybrid (RRF)"], ["bm25", "BM25 (lexical)"], ["vector", "Vector (toy embedding)"]], "hybrid", run);
    var chunk = U.slider("Chunk size (words)", 15, 120, 5, 40, run);
    var overlap = U.slider("Overlap (words)", 0, 30, 5, 10, run);
    var topk = U.slider("top-k", 1, 6, 1, 3, run);
    el.appendChild(U.controls([h("label", { style: "flex:1;min-width:260px" }, ["Query ", q]), method.el]));
    el.appendChild(U.controls([chunk.el, overlap.el, topk.el]));
    var res = h("div");
    el.appendChild(res);
    var out = h("p", { class: "w-out" });
    el.appendChild(out);
    q.addEventListener("input", run);
    var DOCS = [
      ["Idempotent payments API", "Payment endpoints accept an Idempotency-Key header. The server stores the key with the first response for 24 hours. When a client retries after a timeout, the stored response is replayed instead of executing the charge again, which prevents double billing. Keys must be unique per logical operation and scoped to the merchant account."],
      ["Kafka consumer offsets", "A consumer commits offsets after processing records. If it crashes before committing, the records are delivered again after the rebalance, so handlers must tolerate redelivery. Exactly-once processing within Kafka uses transactions and read_committed isolation, while side effects outside Kafka still need deduplication."],
      ["Redis cache stampede", "When a hot key expires, many requests miss at once and hammer the database. Mitigations include request coalescing with a short lock, serving stale data while one worker refreshes, and probabilistic early expiration that spreads refreshes over time."],
      ["Retries with backoff", "Clients should retry transient failures such as 503 or connection resets using exponential backoff with jitter and a retry budget. Retrying non-idempotent operations like POST /charges is unsafe unless the server supports idempotency keys, otherwise a retry may create a second charge."],
      ["Database connection pools", "HikariCP keeps a small pool of warm JDBC connections. Pool size should be close to the number of concurrent queries the database can execute efficiently, often a small multiple of CPU cores, not the number of HTTP threads. Oversized pools increase contention and latency."],
      ["Outbox pattern", "To publish an event and update the database atomically, write the event to an outbox table in the same local transaction. A relay or change-data-capture connector later publishes outbox rows to the broker. Consumers deduplicate using the event id because the relay may publish a row more than once."],
      ["Refund workflow", "Refunds reference the original payment intent. Partial refunds are allowed until the captured amount is exhausted. The ledger records a reversing entry so that balances reconcile at the end of the day with the payment service provider settlement file."]
    ];
    var SYN = { duplicate: "dup", double: "dup", twice: "dup", second: "dup", again: "dup", redelivery: "dup", dedup: "dup", deduplicate: "dup", deduplication: "dup", charge: "pay", charges: "pay", billing: "pay", payment: "pay", payments: "pay", refund: "pay", retry: "retry", retries: "retry", retrying: "retry", retried: "retry", resend: "retry", crash: "fail", crashes: "fail", failure: "fail", failures: "fail", timeout: "fail", outage: "fail", stop: "prevent", prevent: "prevent", prevents: "prevent", avoid: "prevent", mitigation: "prevent", mitigations: "prevent", slow: "latency", latency: "latency", cache: "cache", caching: "cache", stale: "cache", database: "db", jdbc: "db", sql: "db", client: "client", clients: "client", consumer: "client" };
    var STOP = { the: 1, a: 1, an: 1, and: 1, or: 1, of: 1, to: 1, is: 1, are: 1, in: 1, for: 1, on: 1, with: 1, i: 1, do: 1, how: 1, when: 1, it: 1, be: 1, by: 1, as: 1, at: 1, so: 1, that: 1, this: 1, than: 1, not: 1, after: 1, before: 1, must: 1, should: 1, such: 1, like: 1, until: 1, while: 1, still: 1, many: 1, one: 1, which: 1, instead: 1, may: 1 };
    function toks(s) { return s.toLowerCase().replace(/[^a-z0-9_ -]/g, " ").split(/[\s-]+/).filter(function (t) { return t && !STOP[t]; }); }
    function chunks() {
      var out = [], size = chunk.get(), ov = Math.min(overlap.get(), size - 5);
      DOCS.forEach(function (d, di) {
        var w = d[1].split(/\s+/);
        for (var s = 0; s < w.length; s += size - ov) {
          out.push({ doc: d[0], di: di, text: w.slice(s, s + size).join(" "), start: s });
          if (s + size >= w.length) break;
        }
      });
      return out;
    }
    function embed(text) { // toy embedding: concept ids (synonym groups) + hashed char trigrams, L2-normalised
      var v = {};
      toks(text).forEach(function (t) {
        if (SYN[t]) v["c:" + SYN[t]] = (v["c:" + SYN[t]] || 0) + 2;
        var p = "#" + t + "#";
        for (var i = 0; i < p.length - 2; i++) { var g = "g:" + (U.hashStr(p.substr(i, 3)) % 512); v[g] = (v[g] || 0) + 0.35; }
      });
      var n = Math.sqrt(Object.keys(v).reduce(function (s, k) { return s + v[k] * v[k]; }, 0)) || 1;
      Object.keys(v).forEach(function (k) { v[k] /= n; });
      return v;
    }
    function cos(a, b) { var s = 0; for (var k in a) if (b[k]) s += a[k] * b[k]; return s; }
    function bm25(cs, query) {
      var k1 = 1.2, b = 0.75, N = cs.length, df = {}, docs = cs.map(function (c) { return toks(c.text); });
      var avg = docs.reduce(function (s, d) { return s + d.length; }, 0) / N;
      docs.forEach(function (d) { var seen = {}; d.forEach(function (t) { if (!seen[t]) { df[t] = (df[t] || 0) + 1; seen[t] = 1; } }); });
      var qt = toks(query);
      return docs.map(function (d) {
        var tf = {}; d.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
        return qt.reduce(function (s, t) {
          if (!tf[t]) return s;
          var idf = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
          return s + idf * tf[t] * (k1 + 1) / (tf[t] + k1 * (1 - b + b * d.length / avg));
        }, 0);
      });
    }
    function rank(scores) { var idx = scores.map(function (s, i) { return i; }).sort(function (a, b) { return scores[b] - scores[a]; }); var r = {}; idx.forEach(function (i, pos) { r[i] = pos + 1; }); return r; }
    function run() {
      var cs = chunks(), query = q.value;
      var lex = bm25(cs, query), qe = embed(query), vec = cs.map(function (c) { return cos(qe, embed(c.text)); });
      var rl = rank(lex), rv = rank(vec), K = 60;
      var fused = cs.map(function (c, i) { return 1 / (K + rl[i]) + 1 / (K + rv[i]); });
      var m = method.get(), score = m === "bm25" ? lex : m === "vector" ? vec : fused;
      var order = cs.map(function (c, i) { return i; }).sort(function (a, b) { return score[b] - score[a]; }).slice(0, topk.get());
      res.innerHTML = "";
      order.forEach(function (i, pos) {
        var c = cs[i];
        var qts = toks(query), html = U.esc(c.text).split(" ").map(function (w) { var t = w.toLowerCase().replace(/[^a-z0-9_]/g, ""); return qts.indexOf(t) >= 0 ? "<mark>" + w + "</mark>" : (SYN[t] && qts.some(function (x) { return SYN[x] === SYN[t]; }) ? "<u>" + w + "</u>" : w); }).join(" ");
        res.appendChild(h("div", { class: "w-card", style: "margin-bottom:8px" }, [
          h("h5", { text: "#" + (pos + 1) + " · " + c.doc + " · words " + c.start + "–" + (c.start + c.text.split(" ").length) }),
          h("p", { style: "margin:0 0 6px;font-size:13.5px", html: html }),
          h("p", { style: "margin:0;font:12px ui-monospace,monospace;color:var(--fg-muted)", text: "BM25 " + lex[i].toFixed(2) + " (rank " + rl[i] + ") · cosine " + vec[i].toFixed(3) + " (rank " + rv[i] + ") · RRF " + fused[i].toFixed(4) })
        ]));
      });
      out.innerHTML = "<b>" + cs.length + "</b> chunks from " + DOCS.length + " documents. <mark>highlight</mark> = exact term match; <u>underline</u> = synonym-level match that only the vector retriever sees. " +
        "The toy embedding (synonym groups + character trigrams) is a stand-in for a real embedding model. Try queries with no shared words (“prevent double billing”), shrink chunks until the answer is split across chunks, and compare retrievers. RRF score = Σ 1/(60 + rank).";
    }
    run();
  });
})();
