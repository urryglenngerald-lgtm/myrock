/* Knock: the food billboard inside myRock. Restaurants and chains pay to be listed in data/knock.json. */
(function () {
  "use strict";

  var CFG = window.MYROCK_CONFIG || {};
  var TZ = "Europe/Malta";
  var st = { list: [], cuisine: "All", sample: false, loaded: false };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function web(u) {
    u = String(u || "").trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (/^images\//.test(u)) return u;
    return "";
  }
  function today() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
  function pitchMail() {
    var to = CFG.knockEmail || CFG.adEmail || "";
    return to ? "mailto:" + to + "?subject=" + encodeURIComponent("Get my restaurant on Knock") : "";
  }

  var I = {
    menu: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></svg>',
    bag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>',
    chat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-5A8 8 0 1 1 21 12z"/></svg>',
    pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
    plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
  };

  // Only listings inside their paid dates are shown. Top spots first, then by name.
  function clean(list) {
    var t = today();
    return (Array.isArray(list) ? list : []).filter(function (r) {
      return r && r.name && (!r.from || r.from <= t) && (!r.until || r.until >= t);
    }).sort(function (a, b) {
      var pa = a.plan === "top" ? 0 : 1, pb = b.plan === "top" ? 0 : 1;
      return pa - pb || String(a.name).localeCompare(String(b.name));
    });
  }

  function btn(href, icon, label, ext) {
    if (!href) return "";
    return '<a class="kn-btn press" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + icon + "<span>" + esc(label) + "</span></a>";
  }

  function card(r) {
    var menu = web(r.menu), order = web(r.order), main = menu || order;
    var phone = String(r.phone || "").replace(/[^\d+]/g, "");
    var wa = String(r.whatsapp || "").replace(/\D/g, "");
    var map = web(r.map) || (r.address ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(r.address + ", Malta") : "");
    var img = web(r.image);
    var top = r.plan === "top";

    var pic = "";
    if (img) {
      var inner = '<img class="fd-bg" src="' + esc(img) + '" alt="" aria-hidden="true" loading="lazy">' +
        '<img class="fd-poster" src="' + esc(img) + '" alt="' + esc(r.name) + '" loading="lazy">';
      pic = main ? '<a class="fd-img" href="' + esc(main) + '" target="_blank" rel="noopener noreferrer">' + inner + "</a>"
                 : '<span class="fd-img">' + inner + "</span>";
    }

    var chips = '<span class="fd-chip">' + esc(top ? "★ Top spot" : (r.cuisine || "Food")) + "</span>" +
      (top && r.cuisine ? '<span class="fd-day">' + esc(r.cuisine) + "</span>" : "") +
      (r.town ? '<span class="fd-day">' + esc(r.town) + "</span>" : "");

    var actions = btn(menu, I.menu, "Menu", true) +
      btn(order, I.bag, "Order", true) +
      btn(wa ? "https://wa.me/" + wa + "?text=" + encodeURIComponent("Hi! Saw you on Knock (myRock).") : "", I.chat, "WhatsApp", true) +
      btn(phone ? "tel:" + phone : "", I.phone, "Call", false) +
      btn(map, I.pin, "Map", true);

    return '<div class="fd-wrap kn-in"><article class="fd kn' + (img ? "" : " fd-glass") + (top ? " fd-hot kn-top" : "") + '">' + pic +
      '<span class="fd-band">' +
        '<span class="fd-chips">' + chips + "</span>" +
        '<span class="fd-title">' + esc(r.name) + "</span>" +
        (r.deal ? '<span class="kn-deal">' + esc(r.deal) + "</span>" : "") +
        (r.hours ? '<span class="fd-meta">' + I.clock + esc(r.hours) + "</span>" : "") +
        (actions ? '<span class="kn-actions">' + actions + "</span>" : "") +
      "</span></article></div>";
  }

  function pitchCard() {
    var href = pitchMail();
    return '<div class="fd-wrap kn-in"><a class="fd fd-glass kn-pitch press" href="' + esc(href || "#") + '" data-knock-pitch="1">' +
      '<span class="fd-band"><span class="fd-chips"><span class="fd-chip">For restaurants</span></span>' +
      '<span class="kn-plus" aria-hidden="true">' + I.plus + "</span>" +
      '<span class="fd-title">Your kitchen here</span>' +
      '<span class="fd-meta">Menu, deals and your poster in front of hungry Malta. Tap to get on Knock.</span>' +
      "</span></a></div>";
  }

  function feed(cards) {
    var cols = window.innerWidth >= 600 && cards.length > 1 ? 2 : 1;
    if (cols === 1) return '<div class="feed"><div class="feed-col">' + cards.join("") + "</div></div>";
    var a = [], b = [];
    cards.forEach(function (c, i) { (i % 2 ? b : a).push(c); });
    return '<div class="feed"><div class="feed-col">' + a.join("") + '</div><div class="feed-col">' + b.join("") + "</div></div>";
  }

  function renderChips() {
    var seen = {}, names = [];
    st.list.forEach(function (r) { if (r.cuisine && !seen[r.cuisine]) { seen[r.cuisine] = 1; names.push(r.cuisine); } });
    var box = $("knChips");
    if (names.length < 2) { box.hidden = true; st.cuisine = "All"; return; }
    names.sort();
    box.hidden = false;
    box.innerHTML = ["All"].concat(names).map(function (n) {
      return '<button type="button" class="kn-chip press" data-cuisine="' + esc(n) + '" aria-pressed="' + (n === st.cuisine) + '">' + esc(n) + "</button>";
    }).join("");
  }

  function renderList() {
    var box = $("knFeed");
    if (!st.list.length) {
      box.innerHTML = '<div class="empty glass kn-empty">' +
        '<span class="empty-title neon-text">The billboard\'s warming up</span>' +
        "<p>The first kitchens land on Knock soon. Run a restaurant, takeaway or chain? Grab a spot before the place next door does.</p>" +
        '<a class="btn-white press" href="' + esc(pitchMail() || "#") + '" data-knock-pitch="1">Get on Knock</a>' +
        "</div>";
      return;
    }
    var list = st.cuisine === "All" ? st.list : st.list.filter(function (r) { return r.cuisine === st.cuisine; });
    var cards = list.map(card);
    cards.splice(Math.min(cards.length, 3), 0, pitchCard());
    box.innerHTML = feed(cards);
  }

  function render() {
    if (!st.loaded) return;
    $("knSample").hidden = !st.sample;
    renderChips();
    renderList();
  }

  function getJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); });
  }

  function init(demo) {
    getJSON("data/knock.json").catch(function () { return []; }).then(function (real) {
      var list = clean(real);
      if (!list.length && demo) {
        return getJSON("data/knock-sample.json").then(function (s) { st.sample = true; return clean(s); }).catch(function () { return []; });
      }
      return list;
    }).then(function (list) {
      st.list = list;
      st.loaded = true;
      render();
    });

    document.addEventListener("click", function (e) {
      var c = e.target.closest("[data-cuisine]");
      if (c) {
        st.cuisine = c.getAttribute("data-cuisine");
        renderChips();
        renderList();
        return;
      }
      var p = e.target.closest("[data-knock-pitch]");
      if (p && !pitchMail()) {
        e.preventDefault();
        if (window.MYROCK_TOAST) window.MYROCK_TOAST("Knock listings open soon");
      }
    });

    var wide = window.innerWidth >= 600;
    window.addEventListener("resize", function () {
      var w = window.innerWidth >= 600;
      if (w !== wide) { wide = w; renderList(); }
    });
  }

  window.KNOCK = { init: init, render: render };
})();
