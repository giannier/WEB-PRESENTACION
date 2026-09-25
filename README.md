# Corporate Ecosystem — 3D Company Wheel

An interactive presentation site for a group of nineteen businesses, built to be shown
on tablets held either way.

The stage is split: reference artwork, headline and contacts for the focused company on
one side, and the wheel on the other. Each company logo orbits an invisible upright
cylinder on a white ground, spinning right to left with real inertia and snapping to the
nearest logo. The diagonal between the two panels, the highlighted words and the primary
button all take the brand colour of whichever company is in focus.

Actions sit under the wheel for the selected company:

| Button | What it does |
| --- | --- |
| **Ingresar a la web** | Opens the company website in a new tab |
| **QR de información** | Shows a QR code that opens the company's social links page (`/redes/<slug>`) |
| **Formulario** | Captures a networking contact and appends it to Google Sheets |
| **Portafolio** | Shows the flyers/catalogues from `public/portafolio/<slug>/`; only appears for a company that has any — see [Company portfolios](#company-portfolios) |

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
| `CAMERA_WIDTH_MARGIN` | `1.05` | Framing when width binds — portrait phones, and any landscape window close to square (logo ~95% of width) |
| `CAMERA_HEIGHT_MARGIN` | `1.61` | Framing on landscape screens (logo ~62% of the free height) |
| `FOCUS_INNER` / `FOCUS_OUTER` | `0.012` / `0.092` | Where a logo starts and finishes fading; outer must stay under `1/19` |
| `FOCUS_SCALE_FAR` / `FOCUS_OPACITY_FAR` | `0.88` / `0` | Size and opacity of every logo that is not in focus |
| `FRICTION` | `0.94` | Velocity retained per 1/60 s |
| `DRAG_TRACKING_GAIN` | `1.15` | Drag speed relative to exact finger tracking |

Drag sensitivity is solved from the live camera framing, so the logo under the finger
follows the finger on any screen size.

---

## The showcase panel

Artwork is looked up by convention: drop a file into `public/portadas/<slug>.<ext>` —
`.jpg`, `.png`, `.webp`, `.avif`, or a video (`.mp4`, `.webm`, `.mov`) with a same-named
image alongside it as the poster frame — and that company lights up, with no code
change. `npm run covers:scan` resolves the folder into a generated manifest
(`src/data/companyCovers.ts`); it also runs automatically before `dev` and `build`, so
Vercel regenerates it from whatever is committed on every deploy. A company with no file
yet falls back to a gradient built from its brand colour, so nothing ever renders broken.

To point a company at artwork living somewhere else, override it explicitly in
`companyProfiles.ts` instead:

```ts
media: { type: 'video', src: '/portadas/agrosumak.mp4', poster: '/portadas/agrosumak.jpg' },
```

Headlines are split into `lead` / `highlight` / `tail` so the middle part can be painted
in the brand colour without HTML inside a string. The seeded copy, phones and emails come
from each company's own website.

### Company portfolios

Drop images (`.jpg`, `.png`, `.webp`, `.avif`) or PDFs into `public/portafolio/<slug>/` —
any file name, any count — and the "Portafolio" HUD button appears for that company,
opening a dialog that links each file full-size in a new tab. `npm run portfolio:scan`
resolves every folder into `src/data/companyPortfolio.ts`, the same generated-manifest
pattern as the cover artwork above; it also runs automatically before `dev` and `build`.
A company with no folder (or an empty one) simply gets no button — nothing renders empty.

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
| Tap | Stops a coasting wheel |

**One company at a time.** `FOCUS_OUTER` (0.092) sits below the angular distance between
neighbours (0.105), so a logo fades out completely before the next one could appear
beside it; mid-swipe the two cross-fade through each other at about half opacity. Nothing
is hit-tested, because nothing but the focused company is ever on screen.

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

## Voice-to-contact (n8n + OpenAI)

The "Formulario" dialog has a "Registrar por voz" recorder above the fields: it records a
short self-introduction, uploads it to `/api/voice-contact`, and pre-fills whatever the
workflow could make out — the person still reviews and taps **Guardar contacto** the same
as a typed submission, so a mis-transcribed field never reaches the sheet unseen.

The actual transcription and field extraction happens outside this codebase, in an n8n
workflow: audio in → OpenAI Whisper transcribes it → GPT-4o-mini sorts the text into the
same fields `contact.ts` defines and reports which required ones are still missing → n8n
returns that as JSON. `/api/voice-contact` only forwards the recording there and normalises
the response — same reason contacts go through `/api/contacts` instead of hitting the
Sheets webhook directly, so the workflow URL (and whatever OpenAI usage it triggers) never
reaches the browser.

Set in Vercel, **Settings → Environment Variables**:

| Name | Value |
| --- | --- |
| `N8N_VOICE_WEBHOOK_URL` | the n8n webhook URL (e.g. `.../webhook/voice-contact`) |

Without it, `/api/voice-contact` answers 503 and the recorder surfaces that as an error —
the rest of the form (typed entry) keeps working regardless.

### Voice navigation and quick registration

Saying "mostrar `<empresa>`", "abrir portafolio/catálogo de `<empresa>`", "siguiente",
"cerrar", "código qr" or "formulario" drives the wheel and the HUD dialogs directly — no
server round-trip, no OpenAI usage: `src/lib/voiceIntent.ts` matches the browser's own
`SpeechRecognition` output against a small fixed vocabulary, entirely client-side. Chrome
on Android is the target; the UI hides itself on a browser without `SpeechRecognition`
(Safari/iOS).

"Registrar cliente" is the one voice command that still leaves the browser: it opens a
background banner that listens to the ongoing conversation, sends the accumulated
transcript to `/api/quick-register` after each sentence, and — once it has heard a name, a
phone and a rubro — saves through `/api/quick-contact` and shows "Cliente registrado",
with no review step. That reduced, three-field shape is deliberate (no company name, no
consent checkbox); `/api/quick-contact` is its own small validator, not the same
`validateContact()` the full "Formulario" uses, so this never weakens that form's rules.

`/api/quick-register` forwards only text (the transcript) to a *second*, simpler n8n
workflow — GPT extraction alone, no Whisper, since the browser already produced the text
for free:

| Name | Value |
| --- | --- |
| `N8N_QUICK_REGISTER_WEBHOOK_URL` | that workflow's webhook URL |

Without it, saying "registrar cliente" opens the banner but every check fails with a
clear error — voice navigation and the full form are unaffected.

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
