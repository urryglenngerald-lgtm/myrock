/* myRock v1 app logic. Plain JavaScript, no build step. */
(function () {
  "use strict";

  var CFG = window.MYROCK_CONFIG || {};
  var TZ = "Europe/Malta";
  var SAVE_KEY = "myrock_saved";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var state = { events: [], when: "tonight", pickedDate: null, tab: "discover", sample: false };

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    if (/^https?:\/\//i.test(u) || u.charAt(0) === "#" || /^mailto:/i.test(u)) return u;
    if (/^(images|data)\//.test(u)) return u;
    return "#";
  }
  function todayMalta() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
  function addDays(iso, n) {
    var d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function dow(iso) { return new Date(iso + "T00:00:00Z").getUTCDay(); }
  function fmtDay(iso) {
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
      .format(new Date(iso + "T00:00:00Z"));
  }
  function shortDay(iso) {
    var t = todayMalta();
    if (iso === t) return "Tonight";
    if (iso === addDays(t, 1)) return "Tomorrow";
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
  }
  function getSaved() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "[]"); } catch (e) { return []; }
  }
  function setSaved(list) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
  }
  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
  }
  function getJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }

  /* ---------- icons ---------- */
  var ICON = {
    pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    cal: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>',
    arrow: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>',
    ext: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="8 7 17 7 17 16"/></svg>',
    bookmark: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>'
  };

  /* ---------- events ---------- */
  function normalise(list, sample) {
    var t = todayMalta();
    return (Array.isArray(list) ? list : []).map(function (e, i) {
      var ev = Object.assign({}, e);
      if (sample && typeof ev.dayOffset === "number") ev.date = addDays(t, ev.dayOffset);
      ev.id = ev.id || ("ev-" + i + "-" + (ev.date || ""));
      ev.end = ev.endDate || ev.date;
      return ev;
    }).filter(function (e) {
      return e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date || "") && e.end >= t;
    }).sort(function (a, b) {
      return (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""));
    });
  }

  function windowFor(mode) {
    var t = todayMalta();
    if (mode === "tonight") return { start: t, end: t, label: "Tonight, " + fmtDay(t), heading: "Tonight" };
    if (mode === "tomorrow") { var tm = addDays(t, 1); return { start: tm, end: tm, label: "Tomorrow, " + fmtDay(tm), heading: "Tomorrow" }; }
    if (mode === "weekend") {
      var d = dow(t), start, end;
      if (d === 5 || d === 6 || d === 0) { start = t; end = addDays(t, d === 0 ? 0 : 7 - d); }
      else { start = addDays(t, 5 - d); end = addDays(start, 2); }
      return { start: start, end: end, label: "This weekend, " + fmtDay(start) + " to " + fmtDay(end), heading: "This weekend" };
    }
    var p = state.pickedDate || t;
    return { start: p, end: p, label: fmtDay(p), heading: fmtDay(p) };
  }

  function inWindow(e, w) { return e.date <= w.end && e.end >= w.start; }

  // Official posters are shown whole (with a blurred copy behind), covers fill the card.
  function posterImg(e, lazy) {
    if (!e.image || !e.poster) return "";
    var src = esc(safeUrl(e.image)), l = lazy ? ' loading="lazy"' : "";
    if (!e.poster) return '<img src="' + src + '" alt=""' + l + '>';
    return '<img class="poster-bg" src="' + src + '" alt="" aria-hidden="true"' + l + '>' +
      '<img class="poster-img" src="' + src + '" alt="Poster: ' + esc(e.title) + '"' + l + '>' +
      (e.posterBy ? '<span class="poster-by">Poster: ' + esc(e.posterBy) + '</span>' : "");
  }

  function dayBadge(e) {
    var t = todayMalta();
    if (e.endDate && e.date < t) return "Till " + new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(e.endDate + "T00:00:00Z"));
    return shortDay(e.date);
  }

  function evCard(e, opts) {
    opts = opts || {};
    var saved = getSaved().indexOf(e.id) !== -1;
    var hidden = opts.hidden ? ' aria-hidden="true" tabindex="-1"' : "";
    var link = safeUrl(e.link);
    var target = /^https?:/i.test(link) ? ' target="_blank" rel="noopener noreferrer"' : "";
    var img = posterImg(e, true);
    var meta = [e.venue, e.town].filter(Boolean).join(", ") + (e.time ? " · " + e.time : "");
    return '<div class="ev-wrap">' +
      '<a class="ev card press' + (e.poster ? ' has-poster' : ' no-poster') + '" href="' + esc(link) + '"' + target + hidden + '>' + img +
        '<span class="scrim" aria-hidden="true"></span>' +
        '<span class="ev-top">' + (e.category ? '<span class="pill">' + esc(e.category) + '</span>' : '<span></span>') +
          '<span class="day">' + esc(dayBadge(e)) + '</span></span>' +
        '<span class="ev-bottom"><span class="ev-title">' + esc(e.title) + '</span>' +
          (meta ? '<span class="ev-meta">' + ICON.pin + esc(meta) + '</span>' : "") +
          (e.price ? '<span class="ev-meta">' + esc(e.price) + '</span>' : "") +
        '</span></a>' +
      '<button type="button" class="save-btn" data-save="' + esc(e.id) + '" aria-pressed="' + saved + '" aria-label="Save ' + esc(e.title) + '"' + (opts.hidden ? ' tabindex="-1" aria-hidden="true"' : "") + '>' + ICON.bookmark + '</button>' +
    '</div>';
  }

  function featuredCard(e) {
    var saved = getSaved().indexOf(e.id) !== -1;
    var link = safeUrl(e.link);
    var target = /^https?:/i.test(link) ? ' target="_blank" rel="noopener noreferrer"' : "";
    var where = [e.venue, e.town].filter(Boolean).join(", ");
    var when = dayBadge(e) + (e.time && e.date >= todayMalta() ? ", " + e.time : "");
    return '<div class="f-wrap">' +
      '<a class="featured press' + (e.poster ? ' has-poster' : ' no-poster') + '" href="' + esc(link) + '"' + target + '>' +
        posterImg(e, false) +
        '<span class="scrim" aria-hidden="true"></span>' +
        '<span class="pill">★ ' + (e.featured ? "Featured" : "Top pick") + '</span>' +
        '<span class="f-bottom"><span class="f-text">' +
          '<span class="f-title">' + esc(e.title) + '</span>' +
          '<span class="meta"><span>' + ICON.cal + esc(when) + '</span>' + (where ? '<span>' + ICON.pin + esc(where) + '</span>' : "") + '</span>' +
        '</span><span class="btn-white">Details ' + ICON.arrow + '</span></span>' +
      '</a>' +
      '<button type="button" class="save-btn" data-save="' + esc(e.id) + '" aria-pressed="' + saved + '" aria-label="Save ' + esc(e.title) + '">' + ICON.bookmark + '</button>' +
    '</div>';
  }

  function emptyCard(title, text, actionLabel, actionWhen) {
    return '<div class="empty glass">' +
      '<span class="empty-title neon-text">' + esc(title) + '</span>' +
      '<p>' + esc(text) + '</p>' +
      (actionLabel ? '<button type="button" class="btn-white press" data-goto="' + esc(actionWhen) + '">' + esc(actionLabel) + ' ' + ICON.arrow + '</button>' : "") +
    '</div>';
  }

  /* ---------- big-card feed (Malta Daily style, myRock colours) ---------- */
  function fdCard(e) {
    var saved = getSaved().indexOf(e.id) !== -1;
    var link = safeUrl(e.link);
    var target = /^https?:/i.test(link) ? ' target="_blank" rel="noopener noreferrer"' : "";
    var src = e.poster && e.image ? esc(safeUrl(e.image)) : "";
    var when = dayBadge(e) + (e.time && e.date >= todayMalta() ? " · " + e.time : "");
    var where = [e.venue, e.town].filter(Boolean).join(", ");
    var img = src ? '<span class="fd-img"><img class="fd-bg" src="' + src + '" alt="" aria-hidden="true" loading="lazy">' +
      '<img class="fd-poster" src="' + src + '" alt="Poster: ' + esc(e.title) + '" loading="lazy">' +
      (e.posterBy ? '<span class="poster-by">Poster: ' + esc(e.posterBy) + '</span>' : "") + '</span>' : "";
    return '<div class="fd-wrap">' +
      '<a class="fd press' + (src ? "" : " fd-glass") + (e.featured ? " fd-hot" : "") + '" href="' + esc(link) + '"' + target + '>' + img +
        '<span class="fd-band">' +
          '<span class="fd-chips"><span class="fd-chip">' + esc(e.featured ? "★ Featured" : (e.category || "Event")) + '</span><span class="fd-day">' + esc(when) + '</span></span>' +
          '<span class="fd-title">' + esc(e.title) + '</span>' +
          (where ? '<span class="fd-meta">' + ICON.pin + esc(where) + '</span>' : "") +
          '<span class="fd-go" aria-hidden="true">' + ICON.ext + '</span>' +
        '</span>' +
      '</a>' +
      '<button type="button" class="save-btn" data-save="' + esc(e.id) + '" aria-pressed="' + saved + '" aria-label="Save ' + esc(e.title) + '">' + ICON.bookmark + '</button>' +
    '</div>';
  }

  function newsCard(n) {
    return '<div class="fd-wrap"><a class="fd press fd-glass fd-news" href="' + esc(safeUrl(n.link || "#")) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="fd-band"><span class="fd-chips"><span class="fd-chip">News</span><span class="fd-day">' + esc(n.source || "") + '</span></span>' +
      '<span class="fd-title">' + esc(String(n.text || "").replace(/\s*\([^)]*\)\s*$/, "")) + '</span>' +
      '<span class="fd-go" aria-hidden="true">' + ICON.ext + '</span></span></a></div>';
  }

  function adCard() {
    return '<div class="fd-wrap"><a class="fd press fd-glass fd-ad" href="#" data-ad="1">' +
      '<span class="fd-band"><span class="fd-chips"><span class="fd-chip">Sponsored</span></span>' +
      '<span class="fd-title">Your ad here</span><span class="fd-meta">Put your venue, brand or event in front of Malta.</span>' +
      '<span class="fd-go" aria-hidden="true">' + ICON.ext + '</span></span></a></div>';
  }

  // Lays cards into 1 column on phones, 2 side by side on wider screens, keeping date order left to right.
  function feedHTML(cards) {
    var cols = window.innerWidth >= 600 && cards.length > 1 ? 2 : 1;
    if (cols === 1) return '<div class="feed"><div class="feed-col">' + cards.join("") + '</div></div>';
    var a = [], b = [];
    cards.forEach(function (c, i) { (i % 2 ? b : a).push(c); });
    return '<div class="feed"><div class="feed-col">' + a.join("") + '</div><div class="feed-col">' + b.join("") + '</div></div>';
  }

  function renderDiscover() {
    var w = windowFor(state.when);
    $("whenLabel").textContent = w.label;
    var list = state.events.filter(function (e) { return inWindow(e, w); });
    list.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });

    if (list.length) {
      $("featured").innerHTML = feedHTML(list.map(fdCard));
    } else {
      var other = state.when === "weekend" ? ["Check tonight", "tonight"] : ["Check the weekend", "weekend"];
      $("featured").innerHTML = state.events.length
        ? emptyCard("Nothing listed yet", "We haven't found anything for " + w.heading.toLowerCase() + " so far. New events land every week.", other[0], other[1])
        : emptyCard("Events dropping soon", "We're lining up the best of Malta and Gozo. Save this page to your home screen and check back this week.", "", "");
    }

    // Everything else coming up, with news and a sponsored card mixed in
    var rest = state.events.filter(function (e) { return !inWindow(e, w); });
    var news = (state.news || []).slice(0, 6), cards = [], ni = 0;
    rest.forEach(function (e, i) {
      cards.push(fdCard(e));
      if (i === 2) cards.push(adCard());
      if (i % 4 === 3 && news[ni]) cards.push(newsCard(news[ni++]));
    });
    $("thisWeekTitle").textContent = "Coming up";
    var row = $("eventRow");
    row.closest("section").hidden = !cards.length;
    row.innerHTML = cards.length ? feedHTML(cards) : "";
  }

  function renderSaved() {
    var ids = getSaved();
    var list = state.events.filter(function (e) { return ids.indexOf(e.id) !== -1; });
    $("savedList").innerHTML = list.length
      ? feedHTML(list.map(fdCard))
      : emptyCard("Nothing saved yet", "Tap the bookmark on any event and it will wait for you here.", "Find something", "tonight");
  }

  function render() {
    renderDiscover();
    if (state.tab === "saved") renderSaved();
  }

  /* ---------- filters ---------- */
  var WHEN_INDEX = { tonight: 0, tomorrow: 1, weekend: 2 };
  function setWhen(mode) {
    state.when = mode;
    var idx = WHEN_INDEX[mode];
    var ind = $("whenInd");
    document.querySelectorAll(".seg-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.when === mode));
    });
    if (idx === undefined) { ind.style.opacity = "0"; }
    else { ind.style.opacity = "1"; ind.style.transform = "translateX(" + (idx * 100) + "%)"; }
    document.querySelector(".cal-btn").classList.toggle("active", mode === "date");
    renderDiscover();
  }

  /* ---------- tabs ---------- */
  var TAB_INDEX = { discover: 0, saved: 1, useful: 2 };
  function setTab(tab) {
    var prev = TAB_INDEX[state.tab], next = TAB_INDEX[tab];
    state.tab = tab;
    $("tabInd").style.transform = "translateX(" + (next * 100) + "%)";
    document.querySelectorAll(".tab").forEach(function (b) {
      if (b.dataset.tab === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    var showSaved = tab === "saved";
    var target = showSaved ? $("view-saved") : $("view-discover");
    var wasHidden = target.hidden;
    $("view-saved").hidden = !showSaved;
    $("view-discover").hidden = showSaved;
    if (wasHidden) {
      target.classList.remove("view-in", "from-left");
      void target.offsetWidth;
      target.classList.add("view-in");
      if (next < prev) target.classList.add("from-left");
    }
    if (showSaved) { renderSaved(); window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); }
    else if (tab === "useful") { $("useful").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); }
    else if (wasHidden || tab === "discover") { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); }
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
  }

  /* ---------- news ---------- */
  function renderNews(items) {
    if (!Array.isArray(items) || !items.length) items = [{ text: "Welcome to myRock" }];
    var one = items.map(function (n) {
      var text = esc(n.text || "");
      var inner = n.link ? '<a href="' + esc(safeUrl(n.link)) + '" target="_blank" rel="noopener noreferrer">' + text + "</a>" : text;
      return '<span class="item">' + inner + '</span><span class="sep" aria-hidden="true">●</span>';
    }).join("");
    $("ticker").innerHTML = '<span style="display:flex;align-items:center">' + one + '</span><span style="display:flex;align-items:center" aria-hidden="true">' + one + "</span>";
    // Same reading speed however many headlines there are.
    var chars = items.reduce(function (n, i) { return n + String(i.text || "").length; }, 0);
    $("ticker").style.animationDuration = Math.max(30, Math.round(chars * 0.16)) + "s";
  }

  /* ---------- weather ---------- */
  var WICON = {
    sun: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/></svg>',
    moon: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    cloud: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z"/></svg>',
    rain: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7z"/><line x1="9" y1="18" x2="8" y2="21"/><line x1="13" y1="18" x2="12" y2="21"/><line x1="17" y1="18" x2="16" y2="21"/></svg>',
    storm: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7z"/><polyline points="12 15 10 19 13 19 11 23"/></svg>'
  };
  function describe(code, isDay) {
    if (code === 0) return [isDay ? "Sunny" : "Clear", isDay ? "sun" : "moon"];
    if (code === 1 || code === 2) return ["Partly cloudy", isDay ? "sun" : "moon"];
    if (code === 3) return ["Cloudy", "cloud"];
    if (code === 45 || code === 48) return ["Foggy", "cloud"];
    if (code >= 51 && code <= 67) return ["Rainy", "rain"];
    if (code >= 71 && code <= 77) return ["Snow?!", "cloud"];
    if (code >= 80 && code <= 82) return ["Showers", "rain"];
    if (code >= 95) return ["Storms", "storm"];
    return ["Weather", "cloud"];
  }
  function loadWeather() {
    var w = CFG.weather || { lat: 35.8989, lon: 14.5146, place: "Malta" };
    var base = "latitude=" + w.lat + "&longitude=" + w.lon + "&timezone=" + encodeURIComponent(TZ);
    var air = getJSON("https://api.open-meteo.com/v1/forecast?" + base + "&current=temperature_2m,weather_code,wind_speed_10m,is_day");
    var sea = getJSON("https://marine-api.open-meteo.com/v1/marine?" + base + "&current=sea_surface_temperature");
    Promise.allSettled([air, sea]).then(function (res) {
      if (res[0].status !== "fulfilled" || !res[0].value.current) {
        $("wDesc").textContent = "Weather unavailable";
        $("wSub").textContent = w.place;
        return;
      }
      var c = res[0].value.current;
      var d = describe(c.weather_code, c.is_day === 1);
      $("wIcon").innerHTML = WICON[d[1]];
      $("wTemp").textContent = Math.round(c.temperature_2m) + "°";
      $("wDesc").textContent = d[0] + " · " + w.place;
      var sub = "Wind " + Math.round(c.wind_speed_10m) + " km/h";
      if (res[1].status === "fulfilled" && res[1].value.current && typeof res[1].value.current.sea_surface_temperature === "number") {
        sub += " · Sea " + Math.round(res[1].value.current.sea_surface_temperature) + "°";
      }
      $("wSub").textContent = sub;
    });
  }

  /* ---------- links from config ---------- */
  function setupLinks() {
    var ad = $("adSlot");
    if (CFG.adEmail) ad.href = "mailto:" + CFG.adEmail + "?subject=" + encodeURIComponent("Advertise on myRock");
    else ad.addEventListener("click", function (e) { e.preventDefault(); toast("Advertising opens soon"); });

    var k = $("knockTile");
    if (CFG.knockLink) { k.href = safeUrl(CFG.knockLink); k.target = "_blank"; k.rel = "noopener noreferrer"; }
    else k.addEventListener("click", function (e) { e.preventDefault(); toast("Knock is coming soon"); });

    var s = CFG.socials || {}, html = "";
    if (s.facebook) html += '<a class="glass press" href="' + esc(safeUrl(s.facebook)) + '" target="_blank" rel="noopener noreferrer">Facebook ' + ICON.ext + "</a>";
    if (s.instagram) html += '<a class="glass press" href="' + esc(safeUrl(s.instagram)) + '" target="_blank" rel="noopener noreferrer">Instagram ' + ICON.ext + "</a>";
    if (html) $("socialLinks").innerHTML = html; else $("socials").hidden = true;
  }

  /* ---------- events wiring ---------- */
  function wire() {
    document.querySelectorAll(".seg-btn").forEach(function (b) {
      b.addEventListener("click", function () { setWhen(b.dataset.when); });
    });
    $("datePick").min = todayMalta();
    $("datePick").addEventListener("change", function () {
      if (!this.value) return;
      state.pickedDate = this.value;
      setWhen("date");
    });
    document.querySelector(".cal-btn").addEventListener("click", function () {
      var dp = $("datePick");
      if (dp.showPicker) { try { dp.showPicker(); } catch (e) {} }
    });
    document.querySelectorAll(".tab").forEach(function (b) {
      b.addEventListener("click", function () { setTab(b.dataset.tab); });
    });
    document.addEventListener("click", function (e) {
      var sb = e.target.closest("[data-save]");
      if (sb) {
        e.preventDefault();
        var id = sb.getAttribute("data-save"), list = getSaved(), i = list.indexOf(id);
        if (i === -1) { list.push(id); toast("Saved"); } else { list.splice(i, 1); toast("Removed from saved"); }
        setSaved(list);
        document.querySelectorAll('[data-save="' + CSS.escape(id) + '"]').forEach(function (btn) {
          btn.setAttribute("aria-pressed", String(i === -1));
          btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop");
        });
        if (state.tab === "saved") renderSaved();
        return;
      }
      var adc = e.target.closest("[data-ad]");
      if (adc) {
        if (CFG.adEmail) adc.href = "mailto:" + CFG.adEmail + "?subject=" + encodeURIComponent("Advertise on myRock");
        else { e.preventDefault(); toast("Advertising opens soon"); }
        return;
      }
      var go = e.target.closest("[data-goto]");
      if (go) {
        if (state.tab !== "discover") setTab("discover");
        setWhen(go.getAttribute("data-goto"));
      }
    });
  }

  /* ---------- start ---------- */
  var lastCols = window.innerWidth >= 600;
  window.addEventListener("resize", function () {
    var c = window.innerWidth >= 600;
    if (c !== lastCols && state.events) { lastCols = c; render(); }
  });
  function start() {
    wire();
    setupLinks();
    $("featured").innerHTML = '<div class="skeleton" style="height:420px"></div>';
    var demo = CFG.demo === true || /[?&]demo=1/.test(location.search);

    getJSON("data/news.json").then(function (n) { state.news = Array.isArray(n) ? n : []; renderNews(n); if (state.events) renderDiscover(); }).catch(function () { renderNews([]); });

    getJSON("data/events.json").catch(function () { return []; }).then(function (real) {
      var list = normalise(real, false);
      if (!list.length && demo) {
        return getJSON("data/sample-events.json").then(function (s) {
          state.sample = true;
          $("sampleBanner").hidden = false;
          return normalise(s, true);
        }).catch(function () { return []; });
      }
      return list;
    }).then(function (list) {
      state.events = list;
      // Default to the first window that has something on.
      var mode = "tonight";
      if (!list.some(function (e) { return inWindow(e, windowFor("tonight")); })) {
        if (list.some(function (e) { return inWindow(e, windowFor("tomorrow")); })) mode = "tomorrow";
        else if (list.some(function (e) { return inWindow(e, windowFor("weekend")); })) mode = "weekend";
      }
      setWhen(mode);
    });

    loadWeather();
    setInterval(loadWeather, 30 * 60 * 1000);

    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
