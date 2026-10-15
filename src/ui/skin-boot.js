// @ts-check
// Blocking script in <head> so the theme is set before first paint (no flash).
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
