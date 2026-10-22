# Deploy to cPanel (Node.js Selector / LiteSpeed)

This site is **not** a pile of static files: `/api/*` are real server routes, so cPanel has to
run Node. Uploading the repository into `public_html` produces an `Index of /` listing, because
nothing there is executable and there is no `index.html` to serve.

LiteSpeed supports this setup natively — it spawns the app through the Node.js Selector and
proxies requests to it. Its own documentation covers the Next.js case: build as `standalone`
and use the generated entry point as the startup file. That is what `npm run deploy:cpanel`
produces.

---

## One-time setup

### 1. Build the deployable locally

```bash
npm run deploy:cpanel
```

Output: `deploy/cpanel/` (~77 MB, zipped ~52 MB). It contains `app.js` (starts `server.js`), `.next/`,
`node_modules/` and `public/` — everything the runtime needs. **Do not** run `npm install` on
the server; the dependency subset is already traced and included.

### 2. Create the application in cPanel

**Software → Setup Node.js App → Create Application**

| Field | Value |
| --- | --- |
| Node.js version | **20.x** (the project requires `>=20.9.0`) |
| Application mode | Production |
| Application root | `portafolio-app` — outside `public_html`, so server code is never web-reachable |
| Application URL | `portafolio.corporacionyanayacu.com` |
| Application startup file | `app.js` |

Create it. cPanel writes the Passenger/LiteSpeed directives into the domain's document root
and creates `/home/<user>/portafolio-app`.

### 3. Upload the artifact

Upload the **zip** of `deploy/cpanel/` into `portafolio-app` (File Manager → Upload → Extract).
The final layout must be:

```
portafolio-app/
├── app.js             <- the startup file configured above
├── package.json
├── .next/
│   ├── static/        <- CSS/JS chunks; without this the site renders unstyled
│   └── ...
├── node_modules/
└── public/            <- logos, covers, ISO stamps
```

Extract into the app root itself, not into a nested `cpanel/` folder. Then delete the zip.

`app.js` is not decoration: it forces `HOSTNAME` to loopback before Next reads it. Point the app
at `server.js` instead and it can die on boot with `EADDRNOTAVAIL`, because shared hosts export
`HOSTNAME` as the machine's own name.

### 4. Environment variables

Still in the Node.js app screen, **Environment variables**:

| Name | Needed for |
| --- | --- |
| `GOOGLE_SHEETS_WEBHOOK_URL` | contact form → Google Sheets |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | same; must match `WEBHOOK_SECRET` in `Code.gs` |
| `N8N_VOICE_WEBHOOK_URL` | voice contact (audio → transcript) |
| `N8N_QUICK_REGISTER_WEBHOOK_URL` | voice quick-register (text → fields) |

All four are optional for the site to render — the pages are static and load regardless. When a
variable is missing, only its form answers `503`.

Leave `NODE_ENV` alone: the standalone server sets it to `production` itself.

> `NEXT_PUBLIC_SITE_URL` is **not** listed on purpose. Being `NEXT_PUBLIC_*` it is inlined at
> build time, so setting it in cPanel would do nothing. `QrDialog` falls back to the browser's
> current origin, which is already the production domain.

### 5. Clean the document root

The repository files you uploaded earlier are still there and are publicly reachable — including
`src/`, `package.json` and `node_modules` metadata. In the domain's document root delete
**everything except `.htaccess`** (cPanel's, written in step 2). Passenger routes every request
to the app, so nothing else is needed there.

### 6. Restart

**Setup Node.js App → Restart.** Then confirm:

- `https://portafolio.corporacionyanayacu.com/` renders the wheel, not a file list.
- The CSS loads (no unstyled page) — that proves `.next/static/` made it.
- Logos and ISO stamps appear — that proves `public/` made it.
- `https://portafolio.corporacionyanayacu.com/api/contacts` with a `POST` answers JSON, not HTML.

---

## Every redeploy

```bash
npm run deploy:cpanel
```

Zip `deploy/cpanel/`, upload, extract over the app root (overwrite), **Restart**. Files under
`.next/` are hashed per build, so stale chunks are harmless, but a restart is not optional:
LiteSpeed keeps serving the previous process until it is told to stop.

## When it does not come up

| Symptom | Cause |
| --- | --- |
| `Index of /` | The app is not running — check **Setup Node.js App** shows it started, then the error log in cPanel. |
| `503` / slow first hit | Node process crashed or exceeded the account's memory. Check `stderr` in the app screen. |
| Unstyled page | `.next/static/` missing from the app root. |
| Broken images, 404 on logos | `public/` missing from the app root. |
| `ERR_REQUIRE_ESM` or syntax errors | Node version below 20.9. |
| `EADDRNOTAVAIL` on boot | Startup file set to `server.js` instead of `app.js`. |

If the account cannot keep the process alive, the fallback is `output: 'export'` plus PHP
proxies for the four `/api/*` routes — same HTML, no Node process. That is a real code fork
(validation logic duplicated), so try the Node app first.
