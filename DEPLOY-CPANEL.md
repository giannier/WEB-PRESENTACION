# Deploy to cPanel (Node.js Selector / LiteSpeed)

This site is **not** a pile of static files: `/api/*` are real server routes, so cPanel has to
run Node. Uploading the repository into `public_html` produces an `Index of /` listing, because
nothing there is executable and there is no `index.html` to serve.

LiteSpeed supports this setup natively — it spawns the app through the Node.js Selector and
proxies requests to it. Its own documentation covers the Next.js case: build as `standalone`
and use the generated entry point as the startup file. That is what `npm run deploy:cpanel`
produces.

Two host-specific quirks shaped everything below, both found by actually deploying this to a
real CloudLinux/LiteSpeed account — not documented anywhere obvious beforehand:

- **CloudLinux's Node.js Selector manages `node_modules` itself**, through a symlink into a
  separate virtual environment. It refuses to start an app whose root contains a real
  `node_modules` folder instead of that symlink. So the deployable this script builds does
  **not** include one — dependencies are installed once, on the host, through the Selector's own
  "Run NPM Install" button.
- **LiteSpeed's Node launcher (`lsnode.js`) loads the startup file with `require()`, never
  `import`.** This project is `"type": "module"`, so a plain `.js` entry point is an ES module —
  and `require()` cannot load one, failing immediately with `ERR_REQUIRE_ESM`. That is why the
  startup file this script writes is `app.cjs`, not `app.js`.

---

## One-time setup

### 1. Build the deployable locally

```bash
npm run deploy:cpanel
```

Output: `deploy/cpanel/`. It contains `app.cjs` (starts `server.js`), `.next/` and `public/` —
everything the runtime needs **except dependencies**, installed separately in step 3.

### 2. Create the application in cPanel

**Software → Setup Node.js App → Create Application**

| Field | Value |
| --- | --- |
| Node.js version | The highest offered — on a typical shared host that is **not** 20.x despite `package.json` asking for `>=20.9.0`; Next.js 15 only actually requires **18.18+**, so **18.20.4** (or whatever 18.x patch is listed) works fine. |
| Application mode | Production |
| Application root | `portafolio-app` — outside `public_html`, so server code is never web-reachable |
| Application URL | `portafolio.corporacionyanayacu.com` |
| Application startup file | `app.cjs` |

Create it. cPanel writes the Passenger/LiteSpeed directives into the domain's document root,
creates `/home/<user>/portafolio-app`, and drops a placeholder `app.js`/`public/`/`tmp/` in it —
none of that is the real app yet.

### 3. Upload the artifact, then install dependencies on the host

1. Zip `deploy/cpanel/` and upload it into `portafolio-app` (File Manager → Upload → Extract,
   directly into the app root, not a nested `cpanel/` folder). The final layout:

   ```
   portafolio-app/
   ├── app.cjs             <- the startup file configured above
   ├── package.json
   ├── .next/
   │   ├── static/         <- CSS/JS chunks; without this the site renders unstyled
   │   └── ...
   ├── public/              <- logos, covers, ISO stamps
   └── tmp/                 <- cPanel's own restart-signal folder; leave it alone
   ```

   Delete the zip, and delete cPanel's placeholder `public/`/`app.js` first if extracting
   doesn't cleanly overwrite them.

2. Back in **Setup Node.js App**, click **Run NPM Install**. This installs against the
   `package.json` already sitting in the app root, into CloudLinux's own virtual environment,
   and leaves a `node_modules` symlink pointing at it — the one thing this project's own zip
   must never contain. Expect a harmless warning about the `engines.node` version if the host
   Node is below 20.9; it is only a warning.

   This step only needs repeating when `package.json`'s dependencies actually change — the
   symlinked environment survives re-extracting a new zip over the rest of the app root.

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

If the repository was ever uploaded directly into the domain's document root (the mistake that
causes the `Index of /` symptom), it is still publicly reachable — including `src/`,
`package.json` and `node_modules` metadata. Delete **everything except `.htaccess`** (cPanel's
own, written in step 2) from that directory. Passenger routes every request to the app in
`portafolio-app`, so nothing else belongs there.

### 6. Restart

**Setup Node.js App → Restart.** Then confirm:

- `https://portafolio.corporacionyanayacu.com/` renders the wheel, not a file list or a 503.
- The CSS loads (no unstyled page) — that proves `.next/static/` made it.
- Logos and ISO stamps appear — that proves `public/` made it.
- `https://portafolio.corporacionyanayacu.com/api/contacts` with a `POST` answers JSON, not HTML.

---

## Every redeploy

```bash
npm run deploy:cpanel
```

Zip `deploy/cpanel/`, upload, extract over the app root (overwrite — it contains no
`node_modules`, so this never touches the symlinked one), **Restart**. Only run **Run NPM
Install** again if `package.json`'s dependencies actually changed. Files under `.next/` are
hashed per build, so stale chunks are harmless, but a restart is not optional: LiteSpeed keeps
serving the previous process until it is told to stop.

## When it does not come up

| Symptom | Cause |
| --- | --- |
| `Index of /` | The app is not running — check **Setup Node.js App** shows it started, then `stderr.log` in the app root (File Manager) or the error log in cPanel. |
| Red banner: *"Cloudlinux NodeJS Selector demands to store node modules... in separate folder (virtual environment)"* | A real `node_modules` folder is sitting in the app root instead of the Selector's own symlink. Delete it, then **Run NPM Install**. The zip this project builds should never contain one — if it did, the build is stale; re-run `npm run deploy:cpanel`. |
| `stderr.log` shows `ERR_REQUIRE_ESM` on `app.js` (or any `.js` startup file) | The startup file is an ES module (this project is `"type": "module"`) being loaded with `require()` — LiteSpeed's launcher never uses `import`. Startup file must be `app.cjs`, written in CommonJS with the `import()` wrapped in an async IIFE, not a bare top-level `await`. This is unrelated to Node version. |
| `503` / slow first hit | Node process crashed — check `stderr.log` for the actual exception, or the account ran out of memory. |
| Unstyled page | `.next/static/` missing from the app root. |
| Broken images, 404 on logos | `public/` missing from the app root. |
| `EADDRNOTAVAIL` on boot | Startup file set to `server.js` directly instead of `app.cjs` — `server.js` reads `HOSTNAME` at module scope before anything can override it. |

If the account cannot keep the process alive, the fallback is `output: 'export'` plus PHP
proxies for the four `/api/*` routes — same HTML, no Node process. That is a real code fork
(validation logic duplicated), so try the Node app first.
