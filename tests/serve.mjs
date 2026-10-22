// A small static server for the browser tests: node tests/serve.mjs [port]
// It stands in for "python3 -m http.server" so the tests need nothing but Node,
// which lets CI run them in Playwright's own image.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const ROOT = normalize(new URL("../", import.meta.url).pathname);
const PORT = Number(process.argv[2] ?? 4173);
/** @type {Record<string, string>} */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".md": "text/markdown; charset=utf-8",
};

createServer(async (req, res) => {
  let path = normalize(join(ROOT, decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)));
  // Never serve anything outside the project folder.
  if (path !== ROOT && !path.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(path)).isDirectory()) path = join(path, "index.html");
    const body = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, "127.0.0.1");
