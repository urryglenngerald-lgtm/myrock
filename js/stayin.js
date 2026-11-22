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

  /* ---------- weekly film picks ---------- */
  var films = [], detail = document.getElementById("filmDetail");
  function pickWeek(d) {
    var today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Malta" });
    var ws = (d.weeks || []).slice().sort(function (a, b) { return a.from < b.from ? -1 : 1; });
    var cur = ws[0];
    ws.forEach(function (w) { if (w.from <= today) cur = w; });
    return cur;
  }
  function tile(f, i) {
    return '<button type="button" class="fm-card fm-' + esc(f.mood) + ' press" data-film="' + i + '" aria-label="' + esc(f.title) + ', ' + f.year + '">' +
      '<span class="fm-art" aria-hidden="true"><span class="fm-glow"></span><span class="fm-year">' + f.year + '</span></span>' +
      '<span class="fm-title">' + esc(f.title) + '</span>' +
      '<span class="fm-meta"><span class="fm-genre">' + esc(f.genre) + '</span><span class="fm-imdb">IMDb ' + Number(f.imdb).toFixed(1) + '</span></span></button>';
  }
  function renderWatch() {
    if (!watch) { wBox.innerHTML = ""; return; }
    var w = pickWeek(watch);
    if (!w) { wBox.innerHTML = ""; return; }
    films = w.films || [];
    wBox.innerHTML = '<h3 class="si-h">This week\'s film picks</h3><p class="si-sub">' + esc(w.title) + '</p>' +
      '<div class="fm-grid">' + films.map(tile).join("") + '</div>';
  }
  function showFilm(i) {
    var f = films[i]; if (!f) return;
    var h = Math.floor(f.mins / 60), m = f.mins % 60;
    detail.innerHTML = '<div class="fm-d-top fm-' + esc(f.mood) + '"><span class="fm-glow"></span>' +
      '<button type="button" class="fm-back press" data-back aria-label="Back to the film picks">‹ Back</button>' +
      '<span class="fm-d-genre">' + esc(f.genre) + '</span><h3 class="fm-d-title">' + esc(f.title) + '</h3>' +
      '<p class="fm-d-facts">' + f.year + ' · ' + h + 'h ' + (m < 10 ? "0" : "") + m + 'm</p></div>' +
      '<div class="fm-d-body">' +
      '<div class="fm-score"><span class="fm-score-n">' + Number(f.imdb).toFixed(1) + '</span><span class="fm-score-l">IMDb rating<small>out of 10</small></span></div>' +
      (f.awards ? '<p class="fm-awards">🏆 ' + esc(f.awards) + '</p>' : '') +
      '<p class="fm-about">' + esc(f.about) + '</p>' +
      '<p class="fm-take"><b>myRock says:</b> ' + esc(f.take) + '</p>' +
      '<div class="fm-row"><span>Director</span><b>' + esc(f.director) + '</b></div>' +
      '<div class="fm-row"><span>Starring</span><b>' + esc(f.cast.join(", ")) + '</b></div>' +
      '</div>';
    detail.hidden = false;
    var sh = wrap.querySelector(".sheet"); if (sh) sh.scrollTop = 0;
    var bk = detail.querySelector("[data-back]"); if (bk) bk.focus();
  }
  function hideFilm() { detail.hidden = true; detail.innerHTML = ""; }

  function load() {
    if (loaded) return; loaded = true;
    wBox.innerHTML = '<div class="skeleton" style="height:220px;border-radius:22px"></div>';
    fetch("data/football.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(football).catch(function () {});
    fetch("data/films.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
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
    hideFilm();
    wrap.classList.remove("show");
    document.documentElement.classList.remove("sheet-open");
    setTimeout(function () { wrap.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  btn.addEventListener("click", open);
  wrap.addEventListener("click", function (e) {
    var fc = e.target.closest("[data-film]");
    if (fc) { showFilm(+fc.getAttribute("data-film")); return; }
    if (e.target.closest("[data-back]")) { hideFilm(); return; }
    if (e.target.closest("[data-knock]")) { close(); var t = document.querySelector('[data-tab="knock"]'); if (t) setTimeout(function () { t.click(); }, 280); return; }
    if (e.target.closest("[data-close]")) close();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !wrap.hidden) { if (!detail.hidden) hideFilm(); else close(); } });
  if (location.hash === "#stayin") open();
})();
