(function () {
  var cfg = window.SITE_CONFIG || {};
  var root = document.documentElement;
  var isLive = root.getAttribute("data-live") === "true";

  var store = {
    get: function (k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {}
    }
  };

  function bookingUrl(el) {
    var b = cfg.booking || {};
    var s = el.dataset.service && b.services ? b.services[el.dataset.service] : null;
    var m = el.dataset.master && b.masters ? b.masters[el.dataset.master] : null;
    var o = (m ? "m" + m : "") + (s ? "s" + s : "");
    return o && b.deepLink ? b.deepLink.replace("{o}", o) : b.base;
  }

  var resolvers = {
    book: bookingUrl,
    call: function () {
      return "tel:" + cfg.contacts.phone;
    },
    whatsapp: function () {
      return "https://wa.me/" + cfg.contacts.whatsapp;
    },
    telegram: function () {
      return "https://t.me/" + cfg.contacts.telegram;
    },
    vk: function () {
      return "https://vk.com/" + cfg.contacts.vk;
    },
    certificate: function () {
      return cfg.certificates.url;
    },
    subscription: function () {
      return cfg.subscriptions.url;
    },
    map: function (el) {
      return cfg.maps[el.dataset.provider || "yandex"];
    },
    reviews: function (el) {
      return cfg.reviews[el.dataset.provider || "yandex"];
    },
    page: function (el) {
      return el.dataset.href || "#";
    }
  };

  var toastEl;
  var toastTimer;

  function toast(html) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = html;
    toastEl.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-shown");
    }, 2800);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function demoText(el) {
    var action = el.dataset.action;
    var base = (cfg.demoMessages && cfg.demoMessages[action]) || "Кнопка заработает после запуска";
    var title = el.dataset.title;
    return "<b>Макет.</b> " + escapeHtml(base) + (title ? " — «" + escapeHtml(title) + "»" : "");
  }

  function wireActions(scope) {
    scope.querySelectorAll("[data-action]").forEach(function (el) {
      var action = el.dataset.action;
      var resolve = resolvers[action];
      if (!resolve) return;
      if (isLive) {
        var url = resolve(el);
        if (el.tagName === "A") {
          el.href = url;
          if (/^https?:/.test(url) && action !== "page") {
            el.target = "_blank";
            el.rel = "noopener";
          }
        } else {
          el.addEventListener("click", function () {
            location.href = url;
          });
        }
      } else {
        if (el.tagName === "A") el.setAttribute("href", "#");
        el.addEventListener("click", function (e) {
          e.preventDefault();
          toast(demoText(el));
        });
      }
    });
  }

  function wireExpiring() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    document.querySelectorAll("[data-until]").forEach(function (el) {
      var until = new Date(el.dataset.until + "T23:59:59");
      if (until < today) el.hidden = true;
    });
  }

  function wireTheme() {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        store.set("kt-theme", next);
      });
    });

    document.querySelectorAll("[data-palette-root]").forEach(function (wrap) {
      var trigger = wrap.querySelector("[data-palette-trigger]");
      var menu = wrap.querySelector("[data-palette-menu]");
      var opts = wrap.querySelectorAll("[data-palette-value]");
      var sync = function () {
        var cur = root.getAttribute("data-palette");
        opts.forEach(function (o) {
          o.setAttribute("aria-checked", o.dataset.paletteValue === cur ? "true" : "false");
        });
      };
      sync();
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
        trigger.setAttribute("aria-expanded", String(!menu.hidden));
      });
      opts.forEach(function (o) {
        o.addEventListener("click", function () {
          root.setAttribute("data-palette", o.dataset.paletteValue);
          store.set("kt-palette", o.dataset.paletteValue);
          sync();
          menu.hidden = true;
          trigger.setAttribute("aria-expanded", "false");
        });
      });
      document.addEventListener("click", function (e) {
        if (!wrap.contains(e.target)) {
          menu.hidden = true;
          trigger.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  function wireMenu() {
    var btn = document.querySelector("[data-burger]");
    var nav = document.querySelector("[data-mobile-nav]");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      nav.hidden = !nav.hidden;
      btn.setAttribute("aria-expanded", String(!nav.hidden));
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      });
    });
  }

  function wireFilters() {
    document.querySelectorAll("[data-filter-group]").forEach(function (group) {
      var target = document.querySelector(group.dataset.filterGroup);
      if (!target) return;
      var buttons = group.querySelectorAll("[data-filter]");
      var apply = function (value) {
        buttons.forEach(function (b) {
          b.setAttribute("aria-pressed", b.dataset.filter === value ? "true" : "false");
        });
        target.querySelectorAll("[data-tags]").forEach(function (item) {
          var tags = item.dataset.tags.split(" ");
          item.hidden = value !== "all" && tags.indexOf(value) === -1;
        });
      };
      buttons.forEach(function (b) {
        b.addEventListener("click", function () {
          apply(b.dataset.filter);
          if (history.replaceState) history.replaceState(null, "", b.dataset.filter === "all" ? location.pathname : "#" + b.dataset.filter);
        });
      });
      var initial = location.hash.slice(1);
      var exists = Array.prototype.some.call(buttons, function (b) {
        return b.dataset.filter === initial;
      });
      apply(exists ? initial : "all");
    });
  }

  function wireReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach(function (el) {
      io.observe(el);
    });
  }

  function fillContacts() {
    document.querySelectorAll("[data-contact]").forEach(function (el) {
      var v = cfg.contacts[el.dataset.contact];
      if (v) el.textContent = v;
    });
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  fillContacts();
  wireActions(document);
  wireExpiring();
  wireTheme();
  wireMenu();
  wireFilters();
  wireReveal();
})();
