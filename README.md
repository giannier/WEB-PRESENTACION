# Corporate Ecosystem — 3D Company Wheel

An interactive presentation site for a group of nineteen businesses, built to be shown
on tablets held either way.

The stage is split: reference artwork, headline and contacts for the focused company on
one side, and the wheel on the other. Each company logo orbits an invisible upright
cylinder on a white ground, spinning right to left with real inertia and snapping to the
nearest logo. The diagonal between the two panels, the highlighted words and the primary
button all take the brand colour of whichever company is in focus.

Three actions sit under the wheel for the selected company:

| Button | What it does |
| --- | --- |
| **Ingresar a la web** | Opens the company website in a new tab |
| **QR de información** | Shows a QR code that opens the company's social links page (`/redes/<slug>`) |
| **Formulario** | Captures a networking contact and appends it to Google Sheets |

Tapping a logo only selects it. All source, identifiers and comments are in English;
all on-screen copy is in neutral, professional Spanish.

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run build` / `npm run start` | Production build / serve it |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run logos:optimize` | Downscale `public/logos/*.png` in place to 1024 px, idempotent |
| `npm run colors:extract` | Regenerate `src/data/companyColors.ts` from the logos |

---

## Architecture

```
src/
  app/
    page.tsx                  static shell + dynamic import of the scene (ssr: false)
    redes/[slug]/page.tsx     static social links page per company (QR target)
    api/contacts/route.ts     HTTP adapter for the contact form
  components/
    scene/SceneCanvas.tsx     client root: providers, split stage, <Canvas>, camera rig
    showcase/CompanyShowcase.tsx  left panel: artwork, headline, contacts
    showcase/ShowcaseMedia.tsx    image / video / branded fallback
    wheel/CompanyWheel.tsx    the cylinder and the single frame loop
    wheel/CompanyCard.tsx     one unlit logo plane
    ui/CompanyHud.tsx         brand, active company, the three actions
    ui/QrDialog.tsx           QR code dialog
    ui/ContactFormDialog.tsx  networking form
    ui/Modal.tsx              native <dialog> wrapper
  features/contacts/
    domain/contact.ts         contact model + validation (shared by client and server)
    application/              registerContact use case + ContactRepository port
    infrastructure/           Google Sheets adapter, local file adapter, composition root
  data/
    companies.ts              the nineteen companies
    companyProfiles.ts        showcase copy, contacts and artwork per company
    companySocials.ts         official social profiles per company
    companyColors.ts          generated brand colours
  context/WheelContext.tsx    mutable wheel state + confirmation pulse
  hooks/useWheelPhysics.ts    inertia integrator + input capture
  lib/constants.ts            every tunable number
integrations/google-sheets/Code.gs   Apps Script web app for the spreadsheet
```

### Performance contract

1. **One frame loop.** `CompanyWheel` owns the only `useFrame` callback and mutates all
   nineteen logos in a single pass over refs.
2. **No React state in the loop.** Only `reportActiveIndex` can `setState`, and only
   when the index changes.
3. **GSAP never touches the scene graph.** Tweens animate plain objects; `useFrame`
   writes meshes and materials.

Logos use `MeshBasicMaterial` with tone mapping off (`<Canvas flat>`): no lights, no
environment map, no post-processing. Brand colours reach the screen exactly as in the
PNG files, and each frame is just nineteen textured planes.

---

## Tunable constants

Everything lives in `src/lib/constants.ts`. The ones you are most likely to touch:

| Constant | Default | Meaning |
| --- | --- | --- |
| `RADIUS` | `11` | Cylinder radius; must keep neighbouring logos apart |
| `LOGO_SIZE` | `3.4` | Square box each logo is fitted into |
| `CAMERA_WIDTH_MARGIN` | `1.39` | Framing on portrait screens (front logo ~72% of width) |
| `CAMERA_HEIGHT_MARGIN` | `2.0` | Framing on landscape screens (front logo ~50% of height) |
| `FOCUS_INNER` / `FOCUS_OUTER` | `0.02` / `0.22` | Where focus starts/ends decaying; steep so the front logo dominates |
| `FOCUS_SCALE_FAR` / `FOCUS_OPACITY_FAR` | `0.55` / `0.25` | Size and opacity of defocused logos |
| `FRICTION` | `0.94` | Velocity retained per 1/60 s |
| `DRAG_TRACKING_GAIN` | `1.15` | Drag speed relative to exact finger tracking |

Drag sensitivity is solved from the live camera framing, so the logo under the finger
follows the finger on any screen size.

---

## The showcase panel

Artwork is looked up by convention: drop `public/media/<slug>.jpg` and that company
lights up, with no code change. A missing file falls back to a gradient built from the
company's brand colour, so nothing ever renders broken. For a video, declare it in
`companyProfiles.ts`:

```ts
media: { type: 'video', src: '/media/agrosumak.mp4', poster: '/media/agrosumak.jpg' },
```

Headlines are split into `lead` / `highlight` / `tail` so the middle part can be painted
in the brand colour without HTML inside a string. The seeded copy, phones and emails come
from each company's own website.

### Layout and orientation

The split is driven by `@media (orientation: landscape)`, never by a width breakpoint: a
12.9" tablet is 1024px wide while standing upright, so a width rule would split it into
columns in portrait. Turned sideways every tablet gets two columns; upright it stacks.

Tablets in landscape are shorter than a desktop display, so below 820px of height the
canvas stops above the buttons instead of filling the panel. The camera then frames the
logo inside the space that is actually free.

> Arbitrary media variants in Tailwind need underscores where the query needs spaces:
> `[@media(orientation:landscape)_and_(max-height:820px)]:bottom-32`. Without them the
> rule is silently dropped — check the built CSS, not the source, when one goes missing.

---

## Interaction

| Input | Result |
| --- | --- |
| Drag / swipe horizontally | Wheel follows the pointer, then coasts and snaps |
| Mouse wheel / trackpad | Scroll down or swipe left advances to the next company |
| `ArrowRight` / `ArrowLeft` | Next / previous company (ignored while typing in a form) |
| Tap a side logo | Brings it to the front |
| Tap the front logo | Nothing — use the buttons |

---

## Social links and QR codes

`/redes/<slug>` is prerendered for every company and lists its profiles from
`src/data/companySocials.ts`. Profiles were seeded from the links each company publishes
on its own website; companies with no links there have an empty entry to fill in.

Following automatically from a QR code is not possible on any network — each requires
the user to tap Follow. The page opens each profile in the native app, one tap away.

QR codes point to `NEXT_PUBLIC_SITE_URL` when set, otherwise to the address the page was
opened from. On `localhost` the dialog warns that a phone cannot open the code.

---

## Contact form → Google Sheets

Contacts are appended to a spreadsheet through a Google Apps Script web app. No Google
Cloud project, service account or key file is needed.

1. Create a Google Sheet. Open **Extensions → Apps Script**.
2. Replace the editor contents with `integrations/google-sheets/Code.gs`.
3. Change `WEBHOOK_SECRET` at the top to a long random value.
4. **Deploy → New deployment →** type **Web app**. Execute as **Me**, access **Anyone**.
   Authorise when prompted and copy the web app URL.
5. In Vercel, **Settings → Environment Variables**, add:

   | Name | Value |
   | --- | --- |
   | `GOOGLE_SHEETS_WEBHOOK_URL` | the web app URL |
   | `GOOGLE_SHEETS_WEBHOOK_SECRET` | the same value as `WEBHOOK_SECRET` |

6. Redeploy. The script creates a **Contactos** sheet with headers on the first submission.

After editing the script, publish it with **Deploy → Manage deployments → Edit →
Version: New version**; saving alone does not update the live web app.

Storage resolution (`resolveContactRepository.ts`):

| Environment | Storage |
| --- | --- |
| Sheets variables set | Google Sheets |
| Not set, not on Vercel | `.data/contacts.jsonl` (gitignored), so the form works locally |
| Not set, on Vercel | none — the API answers 503 instead of losing data |

Server-side protections: validation is repeated on the server, bodies over 16 KB are
rejected, a honeypot field silently drops bots, and the script escapes values starting
with `= + - @` so nothing is evaluated as a spreadsheet formula.

---

## Adding or removing a company

1. Drop the logo into `public/logos/<slug>.png` and run `npm run logos:optimize`.
2. Add `{ slug, name, url }` to `COMPANIES` in `src/data/companies.ts`.
3. Add its profiles to `src/data/companySocials.ts` and run `npm run colors:extract`.

Every angular calculation reads `COMPANIES.length`; nothing else needs updating.

---

## Deploy to Vercel

Import the repository in Vercel; the Next.js preset is detected automatically. Set the
Google Sheets variables above for the form, and optionally `NEXT_PUBLIC_SITE_URL` with
the production domain so QR codes always point to it.

---

## Known limitations

- **`npm audit` reports advisories in the `postcss` copy bundled inside `next@15`.**
  Build-time only; the fix is an upgrade to `next@16`.
- **Google Apps Script quotas apply** (for example, a cap on simultaneous executions
  per account). They are far above what a networking form needs, but a burst of many
  submissions in the same second can be throttled; the form then shows an error and the
  person can retry.
