// Rebuilds the timeline in changelog.html from CHANGELOG.md. Run it after editing
// the changelog: node tools/changelog.mjs
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const md = readFileSync(new URL("CHANGELOG.md", root), "utf8");
const page = new URL("changelog.html", root);

const escape = (/** @type {string} */ t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (/** @type {string} */ t) => escape(t).replace(/`([^`]+)`/g, "<code>$1</code>");

let latest = false;
const releases = [...md.matchAll(/^## (.+)\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)].map(([, name, block]) => {
  let label = `Version ${name}`;
  let tag = "";
  if (name === "Unreleased") {
    label = "Coming next";
    tag = ' <span class="release__tag">In progress</span>';
  } else if (!latest) {
    latest = true;
    tag = ' <span class="release__tag release__tag--latest">Latest</span>';
  }
  const items = block.split("\n").filter(l => l.startsWith("- ")).map(l => `          <li>${inline(l.slice(2).trim())}</li>`);
  return `      <section class="release" id="v${name.toLowerCase().replaceAll(".", "-")}">
        <h2>${label}${tag}</h2>
        <ul>
${items.join("\n")}
        </ul>
      </section>`;
});

const html = readFileSync(page, "utf8");
const start = html.indexOf('<div class="timeline">\n') + '<div class="timeline">\n'.length;
const end = html.indexOf("\n      </div>\n    </article>", start);
writeFileSync(page, html.slice(0, start) + releases.join("\n") + html.slice(end));
