(function () {
  var root = document.documentElement;
  var read = function (key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  };
  var theme = read("kt-theme");
  if (!theme) {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-palette", read("kt-palette") || "kult");

  var live = window.SITE_CONFIG && window.SITE_CONFIG.live === true;
  var param = new URLSearchParams(location.search).get("live");
  if (param === "1") live = true;
  if (param === "0") live = false;
  root.setAttribute("data-live", live ? "true" : "false");
})();
