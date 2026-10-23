# Self-hosting Paste-Safe

Paste-Safe is a folder of static files: HTML, CSS, JavaScript and images. There is no
server code, no database, no build step and nothing to install at runtime. Any web
server that can serve files can host it, inside your network or on the internet.

Hosting your own copy means you choose exactly which code your team runs, and you can
add security headers that GitHub Pages cannot send.

## 1. Get a copy

Use a tagged release if one exists, so everyone can tell which version they run:

```bash
git clone https://github.com/SandeepKomal/paste-safe
cd paste-safe
git checkout <tag>          # e.g. a release tag from the Releases page, or a reviewed commit
```

Read the code before you deploy it. The parts that touch your text are small:
`src/core/` (detection and masking) and `src/main.js` (the page).

## 2. Copy only the files the site needs

These are the same files the GitHub Pages workflow publishes:

```
index.html  privacy.html  terms.html  security.html  changelog.html  source.html
sw.js  manifest.webmanifest  css/  src/  assets/
```

Everything else (`tests/`, `tools/`, `docs/`, `node_modules/`, config files) is for
development and should not be served.

```bash
mkdir -p /var/www/paste-safe
cp -r index.html privacy.html terms.html security.html changelog.html source.html \
      sw.js manifest.webmanifest css src assets /var/www/paste-safe/
```

The 4K film in `assets/film/` is about 11 MB of the total, and a visitor downloads one
cut of it (under 3 MB) only when they scroll to it. To leave it out, delete the four
`.mp4` and `.webm` files but keep the two `.png` posters: the film then shows a still
image (and the browser logs a "not found" for the missing video).

## 3. Serve it over HTTPS

HTTPS is needed for the offline mode and app install (the service worker), and for
the clipboard buttons in most browsers. `http://localhost` also works for testing.

Make sure the server sends these content types (most do by default):

| Extension | Content-Type |
| --- | --- |
| `.js` | `text/javascript` |
| `.webmanifest` | `application/manifest+json` |
| `.svg` | `image/svg+xml` |
| `.webm` / `.mp4` | `video/webm` / `video/mp4` |

## 4. Add security headers

Every page already carries its security policy in a `<meta>` tag. A real server can
send it as a header too, and add the protections a `<meta>` tag cannot express, such
as refusing to be framed by other sites:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'none'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'
X-Frame-Options: DENY
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Strict-Transport-Security: max-age=31536000
```

`frame-ancestors 'none'` stops other sites from embedding the tool. If you want it
inside an internal portal, replace `'none'` with that portal's address, for example
`frame-ancestors https://intranet.example.com`.

Keep `connect-src 'none'`: it is what guarantees the page cannot send text anywhere.

## 5. Caching

- `sw.js`: send `Cache-Control: no-cache`, so browsers pick up new versions straight away.
- Everything else: a short cache (for example `max-age=3600`) is fine. The service
  worker fetches from the network first whenever the visitor is online.

## Example configurations

### nginx

```nginx
server {
    listen 443 ssl;
    server_name paste-safe.example.com;
    root /var/www/paste-safe;
    index index.html;

    types { application/manifest+json webmanifest; }

    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'none'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location = /sw.js { add_header Cache-Control "no-cache" always; }
}
```

(nginx drops server-level `add_header` lines in a `location` that has its own, so
repeat the security headers inside `location = /sw.js` if your nginx version needs it.)

### Docker (nginx)

```dockerfile
FROM nginx:1.27-alpine
COPY index.html privacy.html terms.html security.html changelog.html source.html \
     sw.js manifest.webmanifest /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY src /usr/share/nginx/html/src
COPY assets /usr/share/nginx/html/assets
```

Put HTTPS and the headers above in front of it (your load balancer, ingress or an
nginx `default.conf`).

### Apache (`.htaccess`)

```apache
AddType application/manifest+json .webmanifest
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'none'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"
Header always set X-Frame-Options "DENY"
Header always set Referrer-Policy "no-referrer"
Header always set X-Content-Type-Options "nosniff"
<Files "sw.js">
  Header set Cache-Control "no-cache"
</Files>
```

### Cloud storage (S3 + CloudFront, Azure Static Web Apps, Cloudflare Pages)

Upload the files from step 2 and attach the headers from step 4 with the platform's
response-headers feature (a CloudFront response headers policy, `staticwebapp.config.json`
on Azure, or a `_headers` file on Cloudflare Pages).

## 6. Check your copy

1. Open the site and check the header shows **0 requests to other sites**.
2. Open the browser's developer tools, **Network** tab, and use the tool: every
   request should go to your own address.
3. Check the response headers on `index.html` include the ones from step 4.
4. The version pill in the header shows the version you deployed. (GitHub Pages also
   adds the commit; on your own server it shows the version only, unless you set
   `COMMIT` in `src/version.js` during deployment as `.github/workflows/pages.yml` does.)

## 7. Updating

Review the changelog and the diff between your version and the new one, then repeat
steps 1–2. Visitors get the new version on their next visit; the service worker never
serves an old copy while the visitor is online.

## Air-gapped networks

Paste-Safe needs no internet access at all. Copy the files from step 2 to a server
inside the network. The links to ChatGPT, Claude, Gemini and GitHub on the page simply
won't open there; nothing else depends on them.
