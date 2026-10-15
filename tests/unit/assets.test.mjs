// Guards the promise in the README: the site ships only original work, loads
// nothing from other sites, and uses the visitor's own fonts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
/** Everything the Pages workflow publishes. */
const SHIPPED = ["index.html", "css", "src", "assets"];

const walk = p => (statSync(join(ROOT, p)).isDirectory() ? readdirSync(join(ROOT, p)).flatMap(f => walk(join(p, f))) : [p]);
const files = SHIPPED.flatMap(walk);
const read = f => readFileSync(join(ROOT, f), "utf8");

test("no font files are shipped", () => {
  const fonts = files.filter(f => /\.(woff2?|ttf|otf|eot)$/i.test(f));
  assert.deepEqual(fonts, []);
});

test("only expected kinds of files are shipped", () => {
  const unexpected = files.filter(f => ![".html", ".css", ".js", ".svg"].includes(extname(f)));
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

test("the page loads scripts and styles only from this site", () => {
  const html = read("index.html");
  for (const [, url] of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/gi)) {
    assert.ok(!/^(?:https?:)?\/\//i.test(url), `index.html loads ${url}`);
  }
  assert.match(html, /font-src 'none'/, "security policy should block fonts");
  assert.match(html, /connect-src 'none'/, "security policy should block network requests");
});

test("scripts never fetch or import from other sites", () => {
  for (const f of files.filter(f => f.endsWith(".js"))) {
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
