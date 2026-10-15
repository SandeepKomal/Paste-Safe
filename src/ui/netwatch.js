// @ts-check
/**
 * The CSP already blocks external requests; this just shows the count.
 * @param {(count: number) => void} onChange
 */
export function watchExternalRequests(onChange) {
  const isExternal = (/** @type {PerformanceEntry} */ e) => {
    try {
      return new URL(e.name).origin !== location.origin && !e.name.startsWith("data:");
    } catch {
      return false;
    }
  };
  let count = performance.getEntriesByType("resource").filter(isExternal).length;
  onChange(count);
  if (!("PerformanceObserver" in window)) return;
  new PerformanceObserver(list => {
    const added = list.getEntries().filter(isExternal).length;
    if (added) onChange((count += added));
  }).observe({ type: "resource", buffered: false });
}
