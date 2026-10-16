// @ts-check
// Pointer effects for the Holo theme: [data-tilt] elements lean toward the
// pointer (the value is the maximum angle in degrees) and panels get a glare
// that follows it. The CSS only uses these variables in Holo.

/** @param {() => boolean} isOn */
export function wireDepth(isOn) {
  if (!matchMedia("(pointer: fine)").matches) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  /** @type {PointerEvent | null} */
  let last = null;
  /** @type {HTMLElement | null} */
  let tilted = null;
  let frame = 0;

  const apply = () => {
    frame = 0;
    const e = last;
    if (!e || !isOn() || still.matches) return;
    const target = e.target instanceof Element ? e.target : null;

    const t = target?.closest("[data-tilt]");
    const next = t instanceof HTMLElement ? t : null;
    if (tilted && tilted !== next) level(tilted);
    tilted = next;
    if (next) {
      const r = next.getBoundingClientRect();
      const max = Number(next.dataset.tilt) || 6;
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      next.style.setProperty("--ry", `${(x * max * 2).toFixed(2)}deg`);
      next.style.setProperty("--rx", `${(-y * max * 2).toFixed(2)}deg`);
    }

    const p = target?.closest(".panel");
    if (p instanceof HTMLElement) {
      const r = p.getBoundingClientRect();
      p.style.setProperty("--mx", `${Math.round(e.clientX - r.left)}px`);
      p.style.setProperty("--my", `${Math.round(e.clientY - r.top)}px`);
    }
  };

  addEventListener("pointermove", e => {
    last = e;
    frame ||= requestAnimationFrame(apply);
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    if (tilted) level(tilted);
    tilted = null;
  });
}

function level(/** @type {HTMLElement} */ el) {
  el.style.removeProperty("--rx");
  el.style.removeProperty("--ry");
}

/** Replays the scan line over a sheet after its text changes. */
export function sweep(/** @type {HTMLElement} */ el) {
  el.classList.remove("is-scanning");
  void el.offsetWidth;
  el.classList.add("is-scanning");
}
