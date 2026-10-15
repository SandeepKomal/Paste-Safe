// @ts-check
/**
 * Counts requests this page makes to other websites, using the browser's own
 * Resource Timing records. The Content-Security-Policy already blocks them;
 * this makes that visible to the user.
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
