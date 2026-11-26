/* Runs in <head> before first paint so the page never flashes the wrong theme. */
(function () {
  try {
    var t = localStorage.getItem("book-theme");
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  } catch (e) { /* storage unavailable: fall back to prefers-color-scheme */ }
})();
