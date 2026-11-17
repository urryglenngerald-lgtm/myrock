// myRock "Loading Malta" countdown, shown until launch day (see launchAt in config.js).
(function () {
  var root = document.documentElement;
  if (!/\bis-loading\b/.test(root.className)) return;

  var C = window.MYROCK_CONFIG || {};
  var launch = Date.parse(C.launchAt);
  var since = Date.parse(C.loadingSince) || (launch - 28 * 864e5);
  var $ = function (id) { return document.getElementById(id); };

  // Launch date in Malta time, e.g. "Tue 15 Dec".
  try {
    $("ldDate").textContent = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Malta" }).format(new Date(launch));
  } catch (e) {}

  // Social buttons, only the ones filled in config.js.
  var s = C.socials || {}, box = $("ldSocials");
  [["instagram", "Follow on Instagram"], ["facebook", "Follow on Facebook"]].forEach(function (p) {
    if (!s[p[0]]) return;
    var a = document.createElement("a");
    a.className = "btn-white press"; a.href = s[p[0]]; a.target = "_blank"; a.rel = "noopener"; a.textContent = p[1];
    box.appendChild(a);
  });

  var lines = [
    "Loading the vibes",
    "Finding this week's parties",
    "Checking which pharmacy opens Sunday",
    "Waiting for the bus (classic)",
    "Asking the nanna about the festa",
    "Charging the neon",
    "Booking the rooftop",
    "Downloading summer, in winter"
  ];
  var li = 0;
  setInterval(function () { li = (li + 1) % lines.length; $("ldLine").textContent = lines[li]; }, 2600);

  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  function tick() {
    var now = Date.now(), left = launch - now;
    if (left <= 0) { location.reload(); return; }
    var pct = Math.max(1, Math.min(99, Math.floor((now - since) / (launch - since) * 100)));
    $("ldFill").style.width = pct + "%";
    $("ldPct").textContent = pct + "%";
    $("ldBar").setAttribute("aria-valuenow", pct);
    var t = Math.floor(left / 1000);
    $("ldD").textContent = pad(Math.floor(t / 86400));
    $("ldH").textContent = pad(Math.floor(t % 86400 / 3600));
    $("ldM").textContent = pad(Math.floor(t % 3600 / 60));
    $("ldS").textContent = pad(t % 60);
  }
  tick();
  setInterval(tick, 1000);
})();
