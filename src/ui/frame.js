// @ts-check
// GitHub Pages can't send headers that stop other sites from framing a page, and a
// CSP in a meta tag can't either. So a page that finds itself inside another site's
// frame, where a page on top could trick a visitor into typing or clicking, shows
// only a link to open it in its own tab and stops.
import { h } from "./dom.js";

export function refuseFrames() {
  if (window.top === window.self) return;
  document.body.replaceChildren(h("p", { className: "framed" }, [
    "Paste-Safe only runs in its own tab. ",
    h("a", { text: "Open Paste-Safe", attrs: { href: location.href, target: "_blank", rel: "noopener noreferrer" } }),
  ]));
  throw new Error("Paste-Safe does not run inside another site's frame.");
}
