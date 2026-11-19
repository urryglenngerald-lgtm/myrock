// Malta ⇄ Gozo ferry times from Gozo Channel and Gozo Highspeed (data/ferries.json, rebuilt nightly).
(function () {
  var tile = document.getElementById("ferryTile");
  var wrap = document.getElementById("ferrySheet");
  if (!tile || !wrap) return;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var data = null, days = [], dayIdx = 0, dir = "toGozo", lastFocus = null, timer = null;

  function maltaNow() {
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + "-" + p.month + "-" + p.day, mins: +p.hour * 60 + +p.minute };
  }
  var toMin = function (t) { return +t.slice(0, 2) * 60 + +t.slice(3, 5); };
  // Lists run past midnight (…23:15, 00:00, 00:45). Give those trips +24h so they sort and compare right.
  function withClock(list, key) {
    var prev = -1, add = 0;
    return list.map(function (x) {
      var t = key ? x[key] : x, m = toMin(t);
      if (m < prev) add = 1440;
      prev = m;
      return { item: x, t: t, at: m + add, late: add > 0 };
    });
  }
  function dayLabel(iso, i) {
    var d = new Date(iso + "T12:00:00Z");
    if (i === 0) return "Today";
    if (i === 1) return "Tomorrow";
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  }
  function inText(mins) {
    if (mins < 1) return "now";
    if (mins < 60) return "in " + mins + " min";
    var h = Math.floor(mins / 60), m = mins % 60;
    return "in " + h + "h" + (m ? " " + m + "m" : "");
  }

  function card(title, sub, rows, isToday, now, render) {
    var next = isToday ? rows.filter(function (r) { return r.at >= now; })[0] : null;
    var head = '<div class="fe-card glass"><div class="fe-head"><div><b>' + title + "</b><span>" + sub + "</span></div>";
    if (isToday) {
      head += next ? '<div class="fe-next"><span>Next</span><b>' + esc(next.t) + "</b><em>" + inText(next.at - now) + "</em></div>"
                   : '<div class="fe-next fe-done"><span>Done for today</span></div>';
    }
    head += "</div>";
    // Today: hide the trips that already left, so the next one is right at the top.
    var gone = isToday ? rows.filter(function (r) { return r.at < now; }).length : 0;
    if (gone && next) rows = rows.slice(gone);
    var body = (gone && next ? '<span class="fe-t fe-gone">' + gone + " earlier<small>already left</small></span>" : "") + rows.map(function (r) {
      var cls = "fe-t" + (isToday && r.at < now ? " past" : "") + (next && r === next ? " next" : "");
      return '<span class="' + cls + '">' + render(r) + (r.late ? '<sup title="After midnight">+1</sup>' : "") + "</span>";
    }).join("");
    return head + '<div class="fe-times">' + (body || '<span class="fe-none">No trips listed.</span>') + "</div></div>";
  }

  function render() {
    var d = days[dayIdx];
    if (!d) { $("feBody").innerHTML = '<p class="ph-empty">No ferry times right now. Check the operators below.</p>'; return; }
    var now = maltaNow(), isToday = d.date === now.date, nowM = now.mins;
    var x = d[dir], html = "";
    if (dir === "toGozo") {
      html += card("Car ferry · Gozo Channel", "Ċirkewwa → Mġarr · 25 min · cars & foot", withClock(x.cirkewwa), isToday, nowM, function (r) { return esc(r.t); });
      html += card("Fast ferry · Valletta", "Valletta → Mġarr · 45 min · foot only", withClock(x.valletta, "d"), isToday, nowM, function (r) { return esc(r.t) + "<small>→ " + esc(r.item.a) + "</small>"; });
      html += card("Fast ferry · Sliema &amp; Buġibba", "Sliema → Buġibba → Mġarr · foot only", withClock(x.sliema, "sliema"), isToday, nowM, function (r) { return esc(r.t) + "<small>Buġ " + esc(r.item.bugibba) + " → " + esc(r.item.gozo) + "</small>"; });
    } else {
      html += card("Car ferry · Gozo Channel", "Mġarr → Ċirkewwa · 25 min · cars & foot", withClock(x.mgarr), isToday, nowM, function (r) { return esc(r.t); });
      html += card("Fast ferry · Valletta", "Mġarr → Valletta · 45 min · foot only", withClock(x.valletta, "d"), isToday, nowM, function (r) { return esc(r.t) + "<small>→ " + esc(r.item.a) + "</small>"; });
      html += card("Fast ferry · Buġibba &amp; Sliema", "Mġarr → Buġibba → Sliema · foot only", withClock(x.sliema, "gozo"), isToday, nowM, function (r) { return esc(r.t) + "<small>Buġ " + esc(r.item.bugibba) + " → " + esc(r.item.sliema) + "</small>"; });
    }
    if (d.holiday) html = '<p class="ph-hours">Public holiday timetable.</p>' + html;
    $("feBody").innerHTML = html;
  }

  function setup() {
    var today = maltaNow().date;
    days = data.days.filter(function (d) { return d.date >= today; }).slice(0, 7);
    dayIdx = 0;
    $("feDays").innerHTML = days.map(function (d, i) {
      return '<button class="ph-day fe-day press" type="button" role="tab" aria-selected="' + (i === 0) + '" data-i="' + i + '"><b>' + esc(dayLabel(d.date, i)) + "</b></button>";
    }).join("");
    render();
  }

  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    wrap.hidden = false;
    document.documentElement.classList.add("sheet-open");
    requestAnimationFrame(function () { wrap.classList.add("show"); });
    clearInterval(timer);
    timer = setInterval(function () { if (data) render(); }, 30000);  // keep "next" and "in X min" fresh
    setTimeout(function () { var x = wrap.querySelector(".sheet-x"); if (x) x.focus(); }, 50);
    if (data) { setup(); return; }
    $("feBody").innerHTML = '<div class="fe-card glass skeleton"></div><div class="fe-card glass skeleton"></div>';
    fetch("data/ferries.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) {
      data = j;
      if (j.sources) { $("feSrcGc").href = j.sources.gozoChannel; $("feSrcHs").href = j.sources.highspeed; }
      setup();
    }).catch(function () {
      $("feBody").innerHTML = '<p class="ph-empty">Couldn\'t load ferry times. Check your connection or the operators below.</p>';
    });
  }
  function close() {
    clearInterval(timer);
    wrap.classList.remove("show");
    document.documentElement.classList.remove("sheet-open");
    setTimeout(function () { wrap.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  tile.addEventListener("click", open);
  wrap.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) { close(); return; }
    var b = e.target.closest(".fe-day");
    if (b) {
      dayIdx = +b.dataset.i;
      [].forEach.call(wrap.querySelectorAll(".fe-day"), function (x) { x.setAttribute("aria-selected", String(x === b)); });
      render();
      return;
    }
    var t = e.target.closest(".fe-dir-btn");
    if (t) {
      dir = t.dataset.dir;
      [].forEach.call(wrap.querySelectorAll(".fe-dir-btn"), function (x) { x.setAttribute("aria-selected", String(x === t)); });
      if (data) render();
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !wrap.hidden) close(); });
  if (location.hash === "#ferries") open();
})();
