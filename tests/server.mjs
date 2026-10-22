// A small static server for the browser tests. Unlike `python3 -m http.server`
// it answers Range requests, which browsers need to seek in a video, as GitHub
// Pages does. Usage: node tests/server.mjs [port]
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const PORT = Number(process.argv[2] ?? 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
  ".png": "image/png", ".mp4": "video/mp4", ".webm": "video/webm",
};

createServer((req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  } catch {
    return void res.writeHead(400).end();
  }
  let file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT) || file.split(sep).includes("..")) return void res.writeHead(403).end();
  let size;
  try {
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    size = statSync(file).size;
  } catch {
    return void res.writeHead(404).end();
  }
  const headers = { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Accept-Ranges": "bytes" };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) return void res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
    res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    return void (req.method === "HEAD" ? res.end() : createReadStream(file, { start, end }).pipe(res));
  }
  res.writeHead(200, { ...headers, "Content-Length": size });
  if (req.method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1");
