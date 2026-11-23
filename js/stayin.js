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
  var fbData = null, fbDay = null;
  function football(d) {
    if (d) fbData = d;
    var today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Malta" });
    var ms = ((fbData && fbData.matches) || []).filter(function (m) { return m.ko.slice(0, 10) >= today; });
    if (!ms.length) { fbBox.innerHTML = ""; return; }
    var days = []; ms.forEach(function (m) { var k = m.ko.slice(0, 10); if (days.indexOf(k) === -1) days.push(k); });
    days.sort();
    if (days.indexOf(fbDay) === -1) fbDay = days[0];
    var html = '<h3 class="si-h">Football this week</h3><p class="fx-sub">Kick-off times in Malta time.</p>' +
      '<div class="fx-chips" role="tablist" aria-label="Pick a day">' + days.map(function (k) {
        var dt = new Date(k + "T12:00:00");
        var lab = k === today ? "Today" : dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
        return '<button type="button" role="tab" class="fx-chip" data-fday="' + k + '" aria-selected="' + (k === fbDay) + '">' + lab + '</button>'; }).join("") + '</div>';
    var groups = [], seen = {};
    ms.forEach(function (m) { if (m.ko.slice(0, 10) !== fbDay) return; if (!seen[m.league]) { seen[m.league] = []; groups.push(m.league); } seen[m.league].push(m); });
    groups.forEach(function (lg) {
      html += '<div class="fbw"><p class="fbw-lg">' + esc(lg) + '</p>';
      seen[lg].forEach(function (m) {
        var right = m.state === "off" ? "Off" : m.ko.slice(11, 16);
        html += '<div class="fbw-row"><span class="fbw-t">' + esc(right) + '</span><span class="fbw-m">' + esc(m.home) + ' <em>v</em> ' + esc(m.away) + '</span></div>';
      });
      html += '</div>';
    });
    fbBox.innerHTML = html;
    var sel = fbBox.querySelector('.fx-chip[aria-selected="true"]'), row = fbBox.querySelector(".fx-chips");
    if (sel && row) row.scrollLeft = Math.max(0, sel.offsetLeft - row.offsetLeft - 16);
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
  function pic(f) { return /^images\/films\/[\w.-]+$/.test(f.img || "") ? f.img : ""; }
  var MOODS = { crime: "Crime", thriller: "Thriller", classic: "Classics", comedy: "Comedy", scifi: "Sci-fi", action: "Action", animation: "Animation", drama: "Drama" };
  var BM = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
  var curFilter = "all";
  function savedFilms() { try { return JSON.parse(localStorage.getItem("myrock_films_saved") || "[]"); } catch (e) { return []; } }
  function toggleFilm(id) {
    var s = savedFilms(), k = s.indexOf(id);
    if (k === -1) s.push(id); else s.splice(k, 1);
    try { localStorage.setItem("myrock_films_saved", JSON.stringify(s)); } catch (e) {}
    return k === -1;
  }
  function tile(f, i, n) {
    var on = savedFilms().indexOf(f.id) !== -1;
    return '<div class="fx-card" style="--i:' + n + '">' +
      '<button type="button" class="fx-poster fm-' + esc(f.mood) + ' press" data-film="' + i + '" aria-label="' + esc(f.title) + ', ' + f.year + ', details">' +
      (pic(f) ? '<img src="' + pic(f) + '" alt="" loading="lazy">' : '<span class="fm-art"><span class="fm-glow"></span></span>') +
      '<span class="fx-rate" aria-label="IMDb rating ' + Number(f.imdb).toFixed(1) + '"><i>★</i> ' + Number(f.imdb).toFixed(1) + '</span></button>' +
      '<button type="button" class="fx-save" data-fsave="' + esc(f.id) + '" aria-pressed="' + on + '" aria-label="Save ' + esc(f.title) + '">' + BM + '</button>' +
      '<span class="fx-title">' + esc(f.title) + '</span><span class="fx-meta">' + f.year + ' · ' + esc(f.genre) + '</span></div>';
  }
  function renderWatch() {
    if (!watch) { wBox.innerHTML = ""; return; }
    var w = pickWeek(watch);
    if (!w) { wBox.innerHTML = ""; return; }
    films = w.films || [];
    var moods = []; films.forEach(function (f) { if (moods.indexOf(f.mood) === -1) moods.push(f.mood); });
    var sv = savedFilms();
    var chips = [["all", "All films"]].concat(moods.map(function (m) { return [m, MOODS[m] || m]; }));
    if (films.some(function (f) { return sv.indexOf(f.id) !== -1; })) chips.push(["saved", "Saved"]);
    if (!chips.some(function (c) { return c[0] === curFilter; })) curFilter = "all";
    var n = 0, cards = films.map(function (f, i) {
      var show = curFilter === "all" || (curFilter === "saved" ? sv.indexOf(f.id) !== -1 : f.mood === curFilter);
      return show ? tile(f, i, n++) : "";
    }).join("");
    wBox.innerHTML = '<h3 class="si-h">This week\'s film picks</h3><p class="fx-sub">' + films.length + ' great films. One hard choice.</p>' +
      '<div class="fx-chips" role="tablist" aria-label="Filter films">' + chips.map(function (c) {
        return '<button type="button" role="tab" class="fx-chip" data-ffilter="' + c[0] + '" aria-selected="' + (c[0] === curFilter) + '">' + c[1] + '</button>'; }).join("") + '</div>' +
      '<div class="fx-grid">' + cards + '</div>';
  }
  function showFilm(i) {
    var f = films[i]; if (!f) return;
    var h = Math.floor(f.mins / 60), m = f.mins % 60;
    detail.innerHTML = '<div class="fm-d-top fm-' + esc(f.mood) + (pic(f) ? ' fm-d-pic' : '') + '">' + (pic(f) ? '<img class="fm-d-img" src="' + pic(f) + '" alt="">' : '<span class="fm-glow"></span>') +
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
  /* ---------- game of the week ---------- */
  var game = null, gBox = document.getElementById("stayinGame");
  function gpic(g) { return /^images\/games\/[\w.-]+$/.test(g.img || "") ? g.img : ""; }
  function renderGame(d) {
    var w = pickWeek(d); game = w && w.game;
    if (!game || !gBox) return;
    gBox.innerHTML = '<h3 class="si-h">PS5 game of the week</h3>' +
      '<button type="button" class="gm-card press" data-game aria-label="' + esc(game.title) + ', read more">' +
      (gpic(game) ? '<img class="gm-img" src="' + gpic(game) + '" alt="" loading="lazy">' : '') +
      '<span class="gm-txt"><span class="fm-genre">' + esc(game.genre) + '</span><span class="gm-title">' + esc(game.title) + '</span>' +
      '<span class="gm-hook">' + esc(game.hook) + '</span><span class="gm-score"><b>' + esc(game.score) + '</b> ' + esc(game.scoreLabel) + '</span>' +
      '<span class="gm-more">Read more ›</span></span></button>';
  }
  function showGame() {
    var g = game; if (!g) return;
    var row = function (k, v) { return v ? '<div class="fm-row"><span>' + k + '</span><b>' + esc(v) + '</b></div>' : ''; };
    detail.innerHTML = '<div class="fm-d-top fm-scifi' + (gpic(g) ? ' fm-d-pic' : '') + '">' + (gpic(g) ? '<img class="fm-d-img" src="' + gpic(g) + '" alt="">' : '<span class="fm-glow"></span>') +
      '<button type="button" class="fm-back press" data-back aria-label="Back">‹ Back</button>' +
      '<span class="fm-d-genre">Game of the week</span><h3 class="fm-d-title">' + esc(g.title) + '</h3>' +
      '<p class="fm-d-facts">' + esc(g.genre) + ' · ' + esc(g.age) + '</p></div><div class="fm-d-body">' +
      '<div class="fm-score"><span class="fm-score-n">' + esc(g.score) + '</span><span class="fm-score-l">' + esc(g.scoreLabel) + '<small>' + esc(g.scoreNote) + '</small></span></div>' +
      g.article.map(function (p) { return '<p class="fm-about">' + esc(p) + '</p>'; }).join("") +
      '<p class="fm-take"><b>myRock says:</b> ' + esc(g.take) + '</p>' +
      row("Released", g.released) + row("Developer", g.developer) + row("Platform", g.platform) + row("Players", g.players) + '</div>';
    detail.hidden = false;
    var sh = wrap.querySelector(".sheet"); if (sh) sh.scrollTop = 0;
    var bk = detail.querySelector("[data-back]"); if (bk) bk.focus();
  }
  function hideFilm() { detail.hidden = true; detail.innerHTML = ""; }

  function nav() {
    var n = document.getElementById("stayinNav"); if (!n) return;
    var items = [["stayinFootball", "Football", fbBox.innerHTML], ["stayinGame", "Game", gBox && gBox.innerHTML], ["stayinWatch", "Films", wBox.innerHTML], ["stayinFood", "Food", true]];
    n.innerHTML = items.filter(function (x) { return x[2]; }).map(function (x) {
      return '<button type="button" class="si-chip press" data-jump="' + x[0] + '">' + x[1] + '</button>'; }).join("");
  }
  function load() {
    if (loaded) return; loaded = true;
    wBox.innerHTML = '<div class="skeleton" style="height:220px;border-radius:22px"></div>';
    fetch("data/football.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) { football(d); nav(); }).catch(function () {});
    fetch("data/game.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) { renderGame(d); nav(); }).catch(function () {});
    fetch("data/films.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      watch = d; renderWatch(); nav();
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
    var j = e.target.closest("[data-jump]");
    if (j) { var t = document.getElementById(j.getAttribute("data-jump")); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    var fd = e.target.closest("[data-fday]");
    if (fd) { fbDay = fd.getAttribute("data-fday"); football(); return; }
    var ff = e.target.closest("[data-ffilter]");
    if (ff) { curFilter = ff.getAttribute("data-ffilter"); renderWatch(); return; }
    var fs = e.target.closest("[data-fsave]");
    if (fs) { var on = toggleFilm(fs.getAttribute("data-fsave")); fs.setAttribute("aria-pressed", on); if (navigator.vibrate) navigator.vibrate(10);
      if (curFilter === "saved" || !document.querySelector('[data-ffilter="saved"]') === on) renderWatch(); return; }
    var fc = e.target.closest("[data-film]");
    if (fc) { showFilm(+fc.getAttribute("data-film")); return; }
    if (e.target.closest("[data-game]")) { showGame(); return; }
    if (e.target.closest("[data-back]")) { hideFilm(); return; }
    if (e.target.closest("[data-knock]")) { close(); var t = document.querySelector('[data-tab="knock"]'); if (t) setTimeout(function () { t.click(); }, 280); return; }
    if (e.target.closest("[data-close]")) close();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !wrap.hidden) { if (!detail.hidden) hideFilm(); else close(); } });
  if (location.hash === "#stayin") open();
})();
