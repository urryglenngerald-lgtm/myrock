// Staying in: weekly Netflix Top 10 for Malta plus food delivery links.
(function () {
  var btn = document.getElementById("stayinBtn");
  var wrap = document.getElementById("stayinSheet");
  if (!btn || !wrap) return;
  var body = document.getElementById("stayinBody");
  var loaded = false, lastFocus = null;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function list(title, items) {
    if (!items || !items.length) return "";
    return '<h3 class="si-h">' + title + '</h3><ol class="si-list">' + items.map(function (it) {
      var q = encodeURIComponent(it.title.replace(/:\s*(Season|Part|Limited Series).*$/i, ""));
      var tag = it.weeks <= 1 ? '<span class="si-new">New</span>' : '<span class="si-wk">' + it.weeks + ' wks</span>';
      return '<li><a class="si-item glass press" href="https://www.netflix.com/search?q=' + q + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="si-rank">' + it.rank + '</span><span class="si-t">' + esc(it.title) + '</span>' + tag + '</a></li>';
    }).join("") + "</ol>";
  }
  function load() {
    if (loaded) return; loaded = true;
    body.innerHTML = '<div class="skeleton" style="height:180px;border-radius:18px"></div>';
    fetch("data/stayin.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      var wk = new Date(d.week + "T12:00:00");
      var nice = isNaN(wk) ? "" : " · week of " + wk.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      body.innerHTML = '<p class="si-sub">Top on Netflix in ' + esc(d.where) + nice + '</p>' +
        list("Shows", d.tv) + list("Films", d.films);
    }).catch(function () { body.innerHTML = '<p class="si-sub">Watch list is taking a nap. Try again in a bit.</p>'; loaded = false; });
  }
  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement; load();
    wrap.hidden = false;
    document.documentElement.classList.add("sheet-open");
    requestAnimationFrame(function () { wrap.classList.add("show"); });
    setTimeout(function () { var x = wrap.querySelector(".sheet-x"); if (x) x.focus(); }, 50);
  }
  function close() {
    wrap.classList.remove("show");
    document.documentElement.classList.remove("sheet-open");
    setTimeout(function () { wrap.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  btn.addEventListener("click", open);
  wrap.addEventListener("click", function (e) {
    if (e.target.closest("[data-knock]")) { close(); var t = document.querySelector('[data-tab="knock"]'); if (t) setTimeout(function () { t.click(); }, 280); return; }
    if (e.target.closest("[data-close]")) close();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !wrap.hidden) close(); });
  if (location.hash === "#stayin") open();
})();
