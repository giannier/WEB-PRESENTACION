# Corporate Ecosystem — 3D Company Wheel

An interactive presentation site for a group of nineteen businesses. Each company is a
frosted-glass card orbiting the outer surface of an invisible cylinder. The wheel spins
with real inertia, snaps to the nearest card, and entering a company plays a 700 ms
cinematic before redirecting to that company's own domain.

All source, identifiers and comments are in English. All on-screen copy is in
neutral, professional Spanish.

---

## Stack

| Package | Version |
| --- | --- |
| next | 15.5.25 |
| react / react-dom | 19.2.8 |
| three | 0.186.0 |
| @react-three/fiber | 9.7.0 |
| @react-three/drei | 10.7.8 |
| @react-three/postprocessing | 3.1.1 |
| postprocessing | 6.39.5 |
| gsap | 3.15.0 |
| tailwindcss / @tailwindcss/postcss | 4.3.3 |
| typescript | 5.9.3 |
| sharp (dev only) | 0.35.4 |

> React is pinned to the 19.2 line on purpose: `@react-three/fiber@9.7.0` declares a
> peer range of `react >=19 <19.3`, so React 19.3 would be an unsatisfied peer.

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build          # production build
npm run start          # serve the production build
npm run typecheck      # tsc --noEmit (strict)
npm run logos:optimize # downscale public/logos/*.png in place
```

---

## Architecture

```
src/
  app/
    layout.tsx          Spanish metadata, dark theme, Inter
    page.tsx            static shell + dynamic import of the scene (ssr: false)
    globals.css         Tailwind v4 entry + backdrop
  components/
    scene/
      SceneCanvas.tsx   client-only root: providers, <Canvas>, HTML overlays
      Lighting.tsx      ambient + directional + focus/rim point lights
      Loader.tsx        "Cargando ecosistema" (in-canvas and DOM variants)
    wheel/
      CompanyWheel.tsx  the cylinder and the single frame loop
      CompanyCard.tsx   one card: glass slab + logo plane (+ glow on low tier)
      cardGeometry.ts   shared rounded-slab and unit-plane geometry
    ui/
      CompanyHud.tsx    brand, active company name, hint
      EnterButton.tsx   "Entrar a la empresa"
      FlashOverlay.tsx  white flash during the transition
  hooks/
    useWheelPhysics.ts  inertia integrator + DOM input capture
    useQualityTier.ts   one-shot device capability probe
    useCompanyTextures.ts texture loading, configuration and disposal
  context/
    QualityContext.tsx  resolved per-tier render settings
    WheelContext.tsx    all mutable wheel state + the selection timeline
  data/
    companies.ts        the nineteen companies
  lib/
    constants.ts        every tunable number
    math.ts             damp / smoothstep / angle helpers
scripts/
  optimize-logos.mjs    idempotent logo downscaler
```

### The performance contract

Three rules carry the whole project, and breaking any of them will cost frames:

1. **One frame loop.** `CompanyWheel` owns the only `useFrame` callback. It advances
   the physics, resolves the active index, and mutates all nineteen cards in a single
   pass over plain refs.
2. **No React state in the loop.** The only `setState` that can fire from the loop is
   `reportActiveIndex`, and it early-returns unless the index actually changed.
   Everything else — rotation, velocity, scale, opacity, emissive — lives in refs.
3. **GSAP never touches the scene graph.** Every tween animates a plain
   `{ value }` object; `useFrame` is the only writer of meshes and materials.

No object, vector or array is allocated inside the frame loop. Scratch `Vector2` and
`Raycaster` instances are hoisted to module scope.

### Quality tiers

`useQualityTier` probes the device once on mount and returns `high` or `low`. It
returns `low` when **any** of these hold: coarse pointer on a viewport under 768 px,
`hardwareConcurrency <= 4`, `deviceMemory <= 4`, or `prefers-reduced-motion: reduce`.

| | high | low |
| --- | --- | --- |
| Glass | `MeshPhysicalMaterial` with `transmission: 1` | same material, no transmission — `opacity: 0.18` + `clearcoat` + env map |
| DPR | `[1, 2]` | `[1, 1.5]` |
| Shadows | on, 1024² soft | off |
| Antialias | on | off |
| Environment resolution | 256 | 64 |
| Bloom during selection | yes | no — higher `emissiveIntensity` + additive glow plane |

The transmission split is the single most important decision in the project. three.js
renders a transmission pass whenever transmissive objects are in the render list, and
nineteen frosted cards will not hold frame rate on a mid-range phone. The low tier
leans on the environment map instead, which is what actually reads as glass.

---

## Tunable constants

Everything lives in `src/lib/constants.ts`. There are no magic numbers in components.

### Geometry

| Constant | Default | Meaning |
| --- | --- | --- |
| `RADIUS` | `6.5` | Radius of the invisible cylinder |
| `CARD_WIDTH` / `CARD_HEIGHT` / `CARD_DEPTH` | `3.2` / `2.0` / `0.08` | Card slab dimensions |
| `CARD_CORNER_RADIUS` | `0.12` | Corner rounding |
| `LOGO_MAX_WIDTH` / `LOGO_MAX_HEIGHT` | `2.35` / `1.5` | Box the logo is fitted into, aspect preserved |
| `LOGO_Z_OFFSET` | `0.05` | Logo plane offset in front of the glass |
| `BILLBOARD_BLEND` | `1` | `1` = card always faces camera; `0` = raw cylinder normal |

### Camera

| Constant | Default | Meaning |
| --- | --- | --- |
| `CAMERA_FOV` | `40` | Vertical field of view |
| `CAMERA_WIDTH_MARGIN` | `1.22` | Horizontal breathing room around the focused card |
| `CAMERA_HEIGHT_MARGIN` | `2.75` | Vertical framing; raise it to show more neighbours |
| `CAMERA_MIN_DISTANCE` / `CAMERA_MAX_DISTANCE` | `4.6` / `13.5` | Clamps on the solved distance |

The camera distance is solved from the live viewport, so a 9:16 phone automatically
pulls back far enough to frame a card that a 16:9 desktop shows up close.

### Physics

| Constant | Default | Meaning |
| --- | --- | --- |
| `FRICTION` | `0.94` | Velocity retained per 1/60 s (applied frame-rate independently) |
| `MAX_VELOCITY` | `9` | Angular velocity cap, rad/s |
| `SNAP_VELOCITY_THRESHOLD` | `0.08` | Below this, the wheel commits to a snap |
| `SNAP_DURATION` | `0.6` | Snap tween length |
| `DRAG_SENSITIVITY` | `0.0062` | Radians of rotation per pixel dragged |
| `WHEEL_SENSITIVITY` | `0.02` | Velocity added per unit of `wheel` delta |
| `TAP_THRESHOLD_PX` | `8` | Pointer travel under this counts as a tap, not a drag |
| `POINTER_IDLE_RESET_MS` | `90` | A finger paused this long before lifting does not flick |

### Focus falloff

| Constant | Default | Meaning |
| --- | --- | --- |
| `FOCUS_INNER` / `FOCUS_OUTER` | `0.03` / `0.55` | Normalised angular distance where focus starts and ends decaying |
| `FOCUS_SCALE_NEAR` / `FOCUS_SCALE_FAR` | `1.0` / `0.6` | Card scale at the front and far away |
| `FOCUS_OPACITY_NEAR` / `FOCUS_OPACITY_FAR` | `1.0` / `0.15` | Card opacity at the front and far away |
| `BACKFACE_DIM` | `0.32` | Extra dimming for cards behind the cylinder |
| `FOCUS_DAMP_LAMBDA` | `9` | How fast cards settle toward their target |

### Selection transition

| Constant | Default | Meaning |
| --- | --- | --- |
| `SELECT_HERO_DURATION` | `0.7` | Longest tween — this sets the total timeline length |
| `SELECT_Z_OFFSET` | `1.2` | Outward travel of the hero card toward the camera |
| `SELECT_SCALE` | `2.6` | Desktop hero scale (clamped down on narrow viewports) |
| `SELECT_OTHERS_SCALE` | `0.4` | Scale the other eighteen collapse to |
| `EMISSIVE_PEAK_HIGH` / `EMISSIVE_PEAK_LOW` | `8` / `12` | Logo flare peak per tier |
| `BLOOM_PEAK` | `1.6` | Bloom intensity at the peak (high tier only) |
| `SELECT_TIMELINE_DURATION` | derived | Computed from the tween positions; currently `0.7 s` |

`SELECT_TIMELINE_DURATION` is derived from the other timing constants rather than
written by hand, so retuning any tween cannot silently drift the transition out of its
600–800 ms perceived-duration budget.

---

## Interaction

| Input | Result |
| --- | --- |
| Drag / swipe vertically | Wheel follows the pointer, then coasts and snaps |
| Mouse wheel / trackpad | Adds velocity (list-scroll convention) |
| `ArrowUp` / `ArrowDown` | Rotate exactly one card |
| Tap the focused card | Enter that company |
| Tap any other card | Rotate that card to the front instead |
| `Tab` to the button, `Enter` / `Space` | Enter the focused company |

A full-screen capture layer sits above the canvas and owns every gesture, so the page
never scrolls mid-swipe. Because that layer would otherwise swallow clicks, taps are
raycast manually — which is also cheaper than R3F's built-in events, since the scene is
raycast once per tap instead of on every pointer move.

The active company name is wrapped in `aria-live="polite"`, and the call to action is a
real `<button>`.

---

## Adding or removing a company

1. Drop the logo into `public/logos/<slug>.png`. Transparent PNG, square canvas is fine.
2. Run `npm run logos:optimize`. It is idempotent — files already within 512 px on their
   longest side are skipped and left byte-for-byte untouched.
3. Add the entry to `COMPANIES` in `src/data/companies.ts`:

   ```ts
   { slug: 'newcompany', name: 'New Company', url: 'https://newcompany.com' },
   ```

That is the whole change. `slug` must match the PNG file name — the texture path is
derived as `/logos/${slug}.png`. Every angular calculation reads `COMPANIES.length`, so
the cards redistribute around the cylinder automatically. There is no count to update
anywhere else.

To remove a company, delete its entry (and optionally its PNG).

---

## Logo optimization

`npm run logos:optimize` resizes every PNG in `public/logos` in place to a maximum of
512 px on the longest side, preserving alpha, at `png({ quality: 80, compressionLevel: 9 })`.

The supplied artwork was 6000×6000 (up to 8505×8505). Nineteen textures at that size
will not fit in a phone's GPU memory budget.

| | Total |
| --- | --- |
| Before | 4.79 MB |
| After | 120.9 KB |
| Saved | 97.5% |

Re-running the script reports 19 skipped, 0 resized, and changes nothing.

---

## Deploy to Vercel

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel, **Add New → Project** and import the repository.
3. The **Next.js** framework preset is detected automatically. Leave every field at its
   default:
   - Build command: `npm run build`
   - Output directory: `.next` (managed by the Next.js preset)
   - Install command: `npm install`
   - Node.js version: 20.x or newer
4. **No environment variables are required.** The app has no backend, no API routes, no
   database and no secrets.
5. Deploy.

`npm run build` output for reference:

```
Route (app)                                 Size  First Load JS
┌ ○ /                                     244 kB         347 kB
└ ○ /_not-found                            994 B         104 kB
+ First Load JS shared by all             103 kB

○  (Static)  prerendered as static content
```

`/` is fully static: the Three.js runtime is behind a `next/dynamic` import with
`ssr: false`, so WebGL never runs on the server and the HTML shell is served instantly
from the edge.

---

## Known limitations

- **The environment map is fetched from a third-party CDN at runtime.**
  `<Environment preset="city" />` resolves to
  `https://raw.githack.com/pmndrs/drei-assets/.../hdri/city.hdr`. `raw.githack.com` is
  not a production-grade CDN. The scene is wrapped in an error boundary and renders
  correctly without it (only reflections are lost), but for a real launch you should
  self-host: download the HDR into `public/hdri/city.hdr` and swap `preset="city"` for
  `files="/hdri/city.hdr"` in `src/components/scene/SceneCanvas.tsx`.
- **`npm audit` reports two advisories in the `postcss` copy bundled inside `next@15`.**
  They are build-time only, and the advertised fix is an upgrade to `next@16`, which is
  outside the pinned stack. Revisit when moving to Next 16.
- **`AdaptiveDpr` and `PerformanceMonitor` both write the device pixel ratio.**
  `AdaptiveDpr` reacts to interaction, `PerformanceMonitor` to sustained load. They can
  briefly disagree after a regression event; the result self-corrects within a second.
- **Bloom is mounted only for the duration of the transition.** Compiling the effect
  shader on first use can cost a few milliseconds on the very first selection. This is
  deliberate: a permanently mounted composer would cost a full-screen pass on every
  frame for an effect that is invisible while browsing.
