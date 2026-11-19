// Sunday and public holiday pharmacies, from the official Medicines Authority roster (data/pharmacies.json).
(function () {
  var tile = document.getElementById("pharmTile");
  var wrap = document.getElementById("pharmSheet");
  if (!tile || !wrap) return;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var data = null, days = [], current = 0, lastFocus = null;

  // Today's date and hour in Malta, whatever the phone's timezone.
  function maltaNow() {
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + "-" + p.month + "-" + p.day, hour: +p.hour };
  }
  function label(iso, today) {
    var d = new Date(iso + "T12:00:00Z");
    var wd = d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
    var dm = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    if (iso === today) return { top: "Today", sub: wd + " " + dm };
    return { top: wd + " " + dm, sub: d.getUTCDay() === 0 ? "Sunday" : "Public holiday" };
  }

  function pickDays() {
    var now = maltaNow();
    // Always 4 Sundays ahead, plus any public holidays that fall in between.
    var upcoming = data.days.filter(function (d) {
      return d.date > now.date || (d.date === now.date && now.hour < 19);
    });
    var sundays = 0;
    days = [];
    for (var i = 0; i < upcoming.length && sundays < 4; i++) {
      days.push(upcoming[i]);
      if (new Date(upcoming[i].date + "T12:00:00Z").getUTCDay() === 0) sundays++;
    }
    current = 0;
    if (!days.length) {
      $("phDays").innerHTML = "";
      $("phHours").textContent = "";
      $("phList").innerHTML = '<p class="ph-empty">The next roster isn\'t out yet. Check the official list below.</p>';
      return;
    }
    $("phDays").innerHTML = days.map(function (d, i) {
      var l = label(d.date, now.date);
      return '<button class="ph-day press" type="button" role="tab" aria-selected="' + (i === 0) + '" data-i="' + i + '"><b>' + esc(l.top) + "</b><span>" + esc(l.sub) + "</span></button>";
    }).join("");
    $("phHours").textContent = "Usually open " + (data.hours || "9am to 12pm and 4pm to 7pm") + ".";
    render();
  }

  function render() {
    var q = $("phSearch").value.trim().toLowerCase();
    var list = days[current] ? days[current].pharmacies : [];
    var shown = list.filter(function (p) {
      return !q || (p.town + " " + p.name + " " + p.areaName).toLowerCase().indexOf(q) > -1;
    });
    if (!shown.length) {
      $("phList").innerHTML = '<p class="ph-empty">No pharmacy on duty matches "' + esc(q) + '". Try a nearby town.</p>';
      return;
    }
    var groups = [["Malta", shown.filter(function (p) { return p.area < 18; })], ["Gozo", shown.filter(function (p) { return p.area >= 18; })]];
    $("phList").innerHTML = groups.filter(function (g) { return g[1].length; }).map(function (g) {
      return '<p class="ph-group">' + g[0] + "</p>" + g[1].map(function (p) {
        var map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.name + ", " + p.town.replace(" (Gozo)", "") + ", Malta");
        return '<div class="ph-row glass"><span class="ph-cross" aria-hidden="true">✚</span><div class="ph-txt"><b>' + esc(p.name) + "</b><span>" + esc(p.town) + '</span></div><a class="ph-map press" href="' + map + '" target="_blank" rel="noopener noreferrer" aria-label="Directions to ' + esc(p.name) + '">Map</a></div>';
      }).join("");
    }).join("");
  }

  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    wrap.hidden = false;
    document.documentElement.classList.add("sheet-open");
    requestAnimationFrame(function () { wrap.classList.add("show"); });
    if (data) { pickDays(); return; }
    $("phList").innerHTML = '<div class="ph-row glass skeleton"></div><div class="ph-row glass skeleton"></div><div class="ph-row glass skeleton"></div>';
    fetch("data/pharmacies.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) {
      data = j;
      if (j.sourceUrl) $("phSource").href = j.sourceUrl;
      pickDays();
    }).catch(function () {
      $("phList").innerHTML = '<p class="ph-empty">Couldn\'t load the roster. Check your connection or use the official list below.</p>';
    });
    setTimeout(function () { var x = wrap.querySelector(".sheet-x"); if (x) x.focus(); }, 50);
  }
  function close() {
    wrap.classList.remove("show");
    document.documentElement.classList.remove("sheet-open");
    setTimeout(function () { wrap.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  tile.addEventListener("click", open);
  wrap.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) close();
    var b = e.target.closest(".ph-day");
    if (b) {
      current = +b.dataset.i;
      [].forEach.call(wrap.querySelectorAll(".ph-day"), function (x) { x.setAttribute("aria-selected", String(x === b)); });
      render();
    }
  });
  $("phSearch").addEventListener("input", render);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !wrap.hidden) close(); });
  if (location.hash === "#pharmacies") open();
})();
