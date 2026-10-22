// Guards the promise in the README: the site ships only original work, loads
// nothing from other sites, and uses the visitor's own fonts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
/** Everything the Pages workflow publishes. */
const SHIPPED = ["index.html", "privacy.html", "terms.html", "sw.js", "manifest.webmanifest", "css", "src", "assets"];

const walk = p => (statSync(join(ROOT, p)).isDirectory() ? readdirSync(join(ROOT, p)).flatMap(f => walk(join(p, f))) : [p]);
const files = SHIPPED.flatMap(walk);
const read = f => readFileSync(join(ROOT, f), "utf8");

test("no font files are shipped", () => {
  const fonts = files.filter(f => /\.(woff2?|ttf|otf|eot)$/i.test(f));
  assert.deepEqual(fonts, []);
});

test("only expected kinds of files are shipped", () => {
  const unexpected = files.filter(f => ![".html", ".css", ".js", ".svg", ".png", ".webmanifest"].includes(extname(f)));
  assert.deepEqual(unexpected, []);
});

test("styles declare no web fonts and import nothing", () => {
  for (const f of files.filter(f => f.endsWith(".css"))) {
    const css = read(f);
    assert.doesNotMatch(css, /@font-face/i, `${f} declares a web font`);
    assert.doesNotMatch(css, /@import/i, `${f} imports another stylesheet`);
    assert.doesNotMatch(css, /url\(\s*["']?(?:https?:)?\/\//i, `${f} loads something from another site`);
  }
});

test("every page loads scripts and styles only from this site", () => {
  for (const page of files.filter(f => f.endsWith(".html"))) {
    const html = read(page);
    for (const [, url] of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/gi)) {
      assert.ok(!/^(?:https?:)?\/\//i.test(url), `${page} loads ${url}`);
    }
    assert.match(html, /font-src 'none'/, `${page}: security policy should block fonts`);
    assert.match(html, /connect-src 'none'/, `${page}: security policy should block network requests`);
  }
});

test("the privacy notice lists every key the site stores", async () => {
  const { KEYS } = await import("../../src/ui/store.js");
  const notice = read("privacy.html");
  for (const key of Object.values(KEYS)) assert.ok(notice.includes(`<code>${key}</code>`), `privacy.html does not mention ${key}`);
  for (const f of files.filter(f => f.endsWith(".js") && f !== "src/ui/store.js")) {
    assert.doesNotMatch(read(f), /localStorage|sessionStorage|indexedDB|document\.cookie/, `${f} stores data outside src/ui/store.js`);
  }
});

test("scripts never fetch or import from other sites", () => {
  // sw.js may fetch, but only this site's own files (it checks the origin).
  assert.match(read("sw.js"), /origin !== self\.location\.origin\) return;/);
  for (const f of files.filter(f => f.endsWith(".js") && f !== "sw.js")) {
    const js = read(f);
    assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|importScripts/, `${f} makes network requests`);
    assert.doesNotMatch(js, /from\s+["'](?:https?:)?\/\//, `${f} imports from another site`);
  }
});

test("no file holds a complete key in a well-known format", () => {
  // GitHub scans public repos for these formats and raises alerts even for fake
  // values. Fakes must be joined from two halves; see CONTRIBUTING.
  const KEY_SHAPES = [
    /\bgh[pousr]_[A-Za-z0-9]{36,}/, /\bgithub_pat_[A-Za-z0-9_]{40,}/, /\bglpat-[A-Za-z0-9_-]{20,}/,
    /\bnpm_[A-Za-z0-9]{36}\b/, /\bxox[abprs]-[A-Za-z0-9-]{10,}/, /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/,
    /\bAIza[0-9A-Za-z_-]{35}\b/, /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/, /\bsk-ant-[A-Za-z0-9_-]{20,}/,
  ];
  const checked = [...files, ...walk("tests"), "README.md", "CONTRIBUTING.md"].filter(f => /\.(js|mjs|html|css|md)$/.test(f));
  for (const f of checked) {
    const text = read(f);
    for (const shape of KEY_SHAPES) assert.doesNotMatch(text, shape, `${f} contains a complete key matching ${shape}`);
  }
});

test("the offline cache lists every file the site needs", () => {
  const listed = new Set([...read("sw.js").matchAll(/^\s+"([^"]+)",$/gm)].map(m => m[1]));
  const needed = files.filter(f => f !== "sw.js" && f !== "assets/og.png");
  assert.deepEqual(needed.filter(f => !listed.has(f)), []);
  assert.deepEqual([...listed].filter(f => f !== "./" && !files.includes(f)), []);
});

test("the app manifest points at icons that exist", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  for (const icon of manifest.icons) assert.ok(files.includes(icon.src), icon.src);
});

test("the version shown on the page matches package.json and the changelog", async () => {
  const { VERSION, COMMIT } = await import("../../src/version.js");
  assert.equal(VERSION, JSON.parse(read("package.json")).version);
  assert.equal(COMMIT, "dev", "the deploy workflow fills in the commit; the source keeps 'dev'");
  assert.ok(read("CHANGELOG.md").split("\n").includes(`## ${VERSION}`), "CHANGELOG.md has no entry for this version");
  assert.ok(read("index.html").includes(`>v${VERSION}<`), "index.html shows another version");
  assert.ok(read("sw.js").includes(`"paste-safe-${VERSION}"`), "sw.js cache name has another version");
});

test("the hero example shows what the detector really produces", async () => {
  const { detect } = await import("../../src/core/detect.js");
  const { mask, toText } = await import("../../src/core/transform.js");
  const { RULES } = await import("../../src/core/rules.js");
  const html = read("index.html");
  const text = id => {
    let pre = html.match(new RegExp(`<pre id="${id}">([\\s\\S]*?)</pre>`))?.[1] ?? "";
    // Strip until nothing changes, so a tag split by another tag can't survive.
    for (let before = ""; before !== pre;) [before, pre] = [pre, pre.replace(/<[^>]*>/g, "")];
    assert.doesNotMatch(pre, /[<>]/, `#${id} still holds markup`);
    return pre.replaceAll("&amp;", "&");
  };
  const raw = text("heroRaw");
  assert.ok(raw.length > 0);
  const { spans, findings } = detect(raw);
  assert.equal(toText(mask(raw, spans)), text("heroSafe"));
  assert.match(html, new RegExp(`>${findings.length} hidden<`));
  assert.match(html, new RegExp(`<dt id="figRules">${RULES.length}</dt>`));
});
