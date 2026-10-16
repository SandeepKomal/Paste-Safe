// @ts-check
// The split-flap board in the Board theme's intro. It is decorative and only
// shows made-up lines: it spins the secrets into labels and back while it's on screen.
import { h } from "./dom.js";

/** @import { Category } from "../../types/index.js" */

/** @type {[string, string?, string?, Category?][]} */
const LINES = [
  ["DB_PASSWORD=", "Tr0ub4dor&3", "[SECRET_1]", "credential"],
  ["timeout from ", "10.20.4.17", "[IP_1]", "network"],
  ["alert ", "ops@acme-pay.io", "[EMAIL_1]", "personal"],
  ["db ", "prod-db.internal", "[HOST_1]", "network"],
  ["retry 1/3 failed, exit 1"],
];
const COLS = 24;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._-[]";

/**
 * @param {boolean} hide
 * @returns {{ ch: string, cat?: Category }[][]}
 */
function layout(hide) {
  return LINES.map(([text, value, label, cat]) => {
    /** @type {{ ch: string, cat?: Category }[]} */
    const cells = [...text].map(ch => ({ ch }));
    if (value && label) for (const ch of hide ? label : value) cells.push({ ch, cat });
    while (cells.length < COLS) cells.push({ ch: " " });
    return cells.slice(0, COLS);
  });
}

/**
 * @param {HTMLElement} root
 * @param {() => boolean} isOn
 */
export function wireGate(root, isOn) {
  const rows = LINES.map(() => {
    const cells = Array.from({ length: COLS }, () => h("span", { className: "gate__cell", text: " " }));
    root.append(h("div", { className: "gate__row" }, cells));
    return cells;
  });
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let hidden = true;
  let visible = false;
  let run = 0;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  /** @param {HTMLElement} cell @param {string} ch */
  const flipOnce = async (cell, ch) => {
    await cell.animate([{ transform: "rotateX(0)" }, { transform: "rotateX(-90deg)" }], { duration: 60, easing: "ease-in" }).finished;
    cell.textContent = ch;
    await cell.animate([{ transform: "rotateX(90deg)" }, { transform: "rotateX(0)" }], { duration: 75, easing: "ease-out" }).finished;
  };

  /** @param {boolean} animate */
  const draw = async animate => {
    const id = ++run;
    const jobs = [];
    for (const [y, line] of layout(hidden).entries()) {
      for (const [x, want] of line.entries()) {
        const cell = rows[y][x];
        if (want.cat) cell.dataset.cat = want.cat;
        else delete cell.dataset.cat;
        if (cell.textContent === want.ch) continue;
        if (!animate) {
          cell.textContent = want.ch;
          continue;
        }
        const spins = want.cat ? 2 + Math.floor(Math.random() * 4) : 1;
        jobs.push((async () => {
          await new Promise(r => setTimeout(r, x * 22 + y * 60));
          for (let s = 0; s < spins && id === run; s++) await flipOnce(cell, GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
          if (id === run) await flipOnce(cell, want.ch);
        })());
      }
    }
    await Promise.all(jobs);
  };

  const tick = async () => {
    clearTimeout(timer);
    if (!visible || !isOn() || still.matches) return;
    hidden = !hidden;
    await draw(true);
    timer = setTimeout(tick, hidden ? 4200 : 2000);
  };

  draw(false);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) timer = setTimeout(tick, 900);
    else clearTimeout(timer);
  }).observe(root);

  return {
    refresh() {
      clearTimeout(timer);
      if (visible) timer = setTimeout(tick, 900);
    },
  };
}
