// Staying in: tonight's football, what's popular on each streaming platform in Malta (opens IMDb), and Knock.
(function () {
  var btn = document.getElementById("stayinBtn");
  var wrap = document.getElementById("stayinSheet");
  if (!btn || !wrap) return;
  var fbBox = document.getElementById("stayinFootball");
  var wBox = document.getElementById("stayinWatch");
  var loaded = false, lastFocus = null, watch = null, current = "netflix";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safe(u) { return /^https:\/\/(www\.imdb\.com|image\.tmdb\.org)\//.test(u || "") ? u : ""; }

  /* ---------- football ---------- */
  function football(d) {
    var ms = (d && d.matches) || [];
    if (!ms.length) { fbBox.innerHTML = ""; return; }
    var today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Malta" });
    var groups = {};
    ms.forEach(function (m) { var k = m.ko.slice(0, 10); (groups[k] = groups[k] || []).push(m); });
    var html = '<h3 class="si-h">Football on TV</h3>';
    Object.keys(groups).sort().forEach(function (k) {
      html += '<p class="si-sub">' + (k === today ? "Tonight" : "Tomorrow") + '</p><div class="fb-grid">';
      groups[k].forEach(function (m) {
        var t = m.ko.slice(11, 16);
        var right = m.state === "in" ? '<span class="fb-live">LIVE ' + esc(m.score) + '</span>' :
          m.state === "post" ? '<span class="fb-ft">FT ' + esc(m.score) + '</span>' :
          m.state === "off" ? '<span class="fb-ft">Off</span>' : '<span class="fb-time">' + t + '</span>';
        html += '<div class="fb-card"><div class="fb-top"><span class="fd-chip">' + esc(m.league) + '</span>' + right + '</div>' +
          '<div class="fb-teams"><span>' + esc(m.home) + '</span><em>v</em><span>' + esc(m.away) + '</span></div></div>';
      });
      html += '</div>';
    });
    fbBox.innerHTML = html;
  }

  /* ---------- what to watch ---------- */
  function card(it, i) {
    var href = safe(it.imdb) || ("https://www.imdb.com/find/?q=" + encodeURIComponent(it.title));
    var poster = safe(it.poster);
    var tag = it.rank ? (it.weeks <= 1 ? '<span class="si-new">New</span>' : '<span class="si-wk">' + it.weeks + ' wks</span>') :
      (it.year ? '<span class="si-wk">' + esc(it.year) + '</span>' : "");
    var kind = it.kind === "tv" ? "Series" : "Film";
    var num = it.rank || (i + 1);
    return '<a class="wt-card press' + (poster ? "" : " wt-glass") + '" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(it.title) + ' on IMDb">' +
      (poster ? '<span class="wt-img"><img src="' + esc(poster) + '" alt="" loading="lazy"><span class="wt-num">' + num + '</span></span>' : '<span class="wt-bignum">' + num + '</span>') +
      '<span class="wt-band"><span class="wt-chips"><span class="wt-kind">' + kind + '</span>' + tag + '</span>' +
      '<span class="wt-title">' + esc(it.title) + '</span><span class="wt-imdb">IMDb ↗</span></span></a>';
  }
  function renderWatch() {
    if (!watch || !watch.platforms || !watch.platforms.length) { wBox.innerHTML = ""; return; }
    var ps = watch.platforms.filter(function (p) { return p.items && p.items.length; });
    if (!ps.some(function (p) { return p.id === current; })) current = ps[0].id;
    var p = ps.filter(function (x) { return x.id === current; })[0];
    var tabs = ps.length > 1 ? '<div class="wt-tabs" role="tablist">' + ps.map(function (x) {
      return '<button type="button" role="tab" class="wt-tab press" data-plat="' + esc(x.id) + '" aria-selected="' + (x.id === current) + '">' + esc(x.name) + '</button>';
    }).join("") + '</div>' : "";
    var shows = p.items.filter(function (x) { return x.kind === "tv"; });
    var films = p.items.filter(function (x) { return x.kind !== "tv"; });
    var grid = function (arr) { return '<div class="wt-grid">' + arr.map(card).join("") + '</div>'; };
    var body = p.id === "netflix"
      ? (shows.length ? '<p class="wt-group">Series</p>' + grid(shows) : "") + (films.length ? '<p class="wt-group">Films</p>' + grid(films) : "")
      : grid(p.items);
    var wk = "";
    if (p.id === "netflix" && watch.week) {
      var d = new Date(watch.week + "T12:00:00");
      if (!isNaN(d)) wk = " · week of " + d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    }
    wBox.innerHTML = '<h3 class="si-h">What to watch</h3>' + tabs + '<p class="si-sub">' + esc(p.label) + wk + '</p>' + body;
  }

  function load() {
    if (loaded) return; loaded = true;
    wBox.innerHTML = '<div class="skeleton" style="height:220px;border-radius:22px"></div>';
    fetch("data/football.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(football).catch(function () {});
    fetch("data/stayin.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && !d.platforms && (d.tv || d.films)) { // old format fallback
        d.platforms = [{ id: "netflix", name: "Netflix", label: "Top 10 in Malta this week",
          items: (d.tv || []).map(function (x) { x.kind = "tv"; return x; }).concat((d.films || []).map(function (x) { x.kind = "movie"; return x; })) }];
      }
      watch = d; renderWatch();
    }).catch(function () { wBox.innerHTML = '<p class="si-sub">The watch list is taking a nap. Try again in a bit.</p>'; loaded = false; });
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
    var tab = e.target.closest("[data-plat]");
    if (tab) { current = tab.getAttribute("data-plat"); renderWatch(); return; }
    if (e.target.closest("[data-knock]")) { close(); var t = document.querySelector('[data-tab="knock"]'); if (t) setTimeout(function () { t.click(); }, 280); return; }
    if (e.target.closest("[data-close]")) close();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !wrap.hidden) close(); });
  if (location.hash === "#stayin") open();
})();
