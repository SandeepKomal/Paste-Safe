// @ts-check
// Runs before the page is drawn (a classic, blocking script) so the chosen theme
// applies on the first frame, with no flash of the other one. Kept tiny on purpose;
// the switcher itself lives in skin.js.
(() => {
  const SKINS = ["lens", "sticker"];
  let skin = location.hash.slice(1);
  if (!SKINS.includes(skin)) {
    try {
      skin = localStorage.getItem("paste-safe:skin") ?? "";
    } catch {
      skin = "";
    }
  }
  document.documentElement.dataset.skin = SKINS.includes(skin) ? skin : "lens";
})();
