/**
 * Every tunable value of the experience lives here.
 * Components must never hard-code magic numbers; import from this module instead.
 */

/* ------------------------------------------------------------------ *
 * Wheel geometry
 * ------------------------------------------------------------------ */

/** Radius of the invisible cylinder the cards orbit around (world units). */
export const RADIUS = 6.5;

export const CARD_WIDTH = 3.2;
export const CARD_HEIGHT = 2.0;
export const CARD_DEPTH = 0.08;
export const CARD_CORNER_RADIUS = 0.12;
/** Segments used to tessellate each rounded corner of the card silhouette. */
export const CARD_CORNER_SEGMENTS = 6;
export const CARD_BEVEL_SIZE = 0.012;
export const CARD_BEVEL_SEGMENTS = 3;

/** Bounding box the logo plane is fitted into, preserving the source aspect ratio. */
export const LOGO_MAX_WIDTH = 2.35;
/**
 * Every supplied logo is a square canvas with its own internal padding, so the height
 * bound is what actually decides the mark size. 1.5 on a 2.0-tall card keeps a clean
 * margin without leaving the logo looking lost on the glass.
 */
export const LOGO_MAX_HEIGHT = 1.5;
/** Local Z offset that lifts the logo plane just clear of the glass front face. */
export const LOGO_Z_OFFSET = 0.05;
/** Additive glow plane (low tier only) sits marginally behind the logo. */
export const GLOW_Z_OFFSET = 0.044;
export const GLOW_SCALE = 1.3;

/**
 * 1 = card always squarely faces the camera (billboard on the X axis).
 * 0 = card keeps the raw cylinder normal and tips away at the top and bottom.
 */
export const BILLBOARD_BLEND = 1;

/* ------------------------------------------------------------------ *
 * Camera framing
 * ------------------------------------------------------------------ */

export const CAMERA_FOV = 40;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 100;
/** Fallback distance from the front card used before the first resize measurement. */
export const CAMERA_BASE_DISTANCE = 6.0;
export const CAMERA_MIN_DISTANCE = 4.6;
export const CAMERA_MAX_DISTANCE = 13.5;
/** Extra breathing room around the front card when solving the camera distance. */
export const CAMERA_WIDTH_MARGIN = 1.22;
/**
 * Tuned so roughly 2.5 cards are visible vertically on a landscape desktop viewport:
 * enough of the neighbours peek in for the cylinder to read as a wheel.
 */
export const CAMERA_HEIGHT_MARGIN = 2.75;

/* ------------------------------------------------------------------ *
 * Rotation physics
 * ------------------------------------------------------------------ */

/** Velocity retained per 1/60 s. Applied frame-rate independently. */
export const FRICTION = 0.94;
/** Hard cap on angular velocity (rad/s) so a violent flick cannot spin forever. */
export const MAX_VELOCITY = 9;
/** Below this angular velocity the wheel commits to a snap. */
export const SNAP_VELOCITY_THRESHOLD = 0.08;
export const SNAP_DURATION = 0.6;
export const SNAP_EASE = 'power3.out';
/** Duration used when a tap on a background card pulls it to the front. */
export const FOCUS_SNAP_DURATION = 0.55;

/** Radians of wheel rotation per pixel of pointer travel. */
export const DRAG_SENSITIVITY = 0.0062;
/** Radians per second of velocity added per unit of `wheel` delta. */
export const WHEEL_SENSITIVITY = 0.02;
/** Pixel equivalent of one `deltaMode: DOM_DELTA_LINE` step. */
export const WHEEL_LINE_HEIGHT = 16;
/** Pixel equivalent of one `deltaMode: DOM_DELTA_PAGE` step. */
export const WHEEL_PAGE_HEIGHT = 600;
/** Exponential smoothing applied to the pointer velocity estimator (0..1, higher = snappier). */
export const VELOCITY_SMOOTHING = 0.35;
/** Movement under this many pixels on pointer-up is treated as a tap, not a drag. */
export const TAP_THRESHOLD_PX = 8;
/**
 * If the pointer was stationary for longer than this before release, the flick is
 * discarded. Without it, pausing mid-drag still launches the wheel on lift-off.
 */
export const POINTER_IDLE_RESET_MS = 90;
/** Rotation error (radians) under which the wheel is considered already snapped. */
export const SNAP_EPSILON = 1e-4;
/** Longest frame delta the physics integrator will accept (guards tab-switch jumps). */
export const MAX_FRAME_DELTA = 1 / 20;

/* ------------------------------------------------------------------ *
 * Per-card focus falloff
 * ------------------------------------------------------------------ */

/** Normalised angular distance (0 = front, 1 = directly behind) where focus starts to decay. */
export const FOCUS_INNER = 0.03;
/** Normalised angular distance where a card is fully defocused. */
export const FOCUS_OUTER = 0.55;

export const FOCUS_SCALE_NEAR = 1.0;
export const FOCUS_SCALE_FAR = 0.6;
export const FOCUS_OPACITY_NEAR = 1.0;
export const FOCUS_OPACITY_FAR = 0.15;

/** Multiplier applied to cards on the far side of the cylinder so depth reads clearly. */
export const BACKFACE_DIM = 0.32;
/** Smoothing window (in cosine space) across the silhouette edge of the cylinder. */
export const BACKFACE_EDGE = 0.25;

/** Exponential damping rate for the per-card scale/opacity approach. */
export const FOCUS_DAMP_LAMBDA = 9;

/* ------------------------------------------------------------------ *
 * Lighting
 * ------------------------------------------------------------------ */

export const AMBIENT_INTENSITY = 0.35;

export const DIRECTIONAL_POSITION: [number, number, number] = [4, 8, 9];
export const DIRECTIONAL_INTENSITY = 1.5;
export const DIRECTIONAL_SHADOW_BOUNDS = 10;
export const DIRECTIONAL_SHADOW_NEAR = 1;
export const DIRECTIONAL_SHADOW_FAR = 30;
export const DIRECTIONAL_SHADOW_BIAS = -0.0015;
export const SHADOW_MAP_SIZE_HIGH = 1024;
export const SHADOW_MAP_SIZE_LOW = 512;

/** Front-centre key light. This is what makes a card glint as it reaches the focus slot. */
export const FOCUS_LIGHT_POSITION: [number, number, number] = [0, 0, 5];
export const FOCUS_LIGHT_INTENSITY = 2.2;
export const FOCUS_LIGHT_COLOR = '#fff3e0';
export const FOCUS_LIGHT_DISTANCE = 14;
export const FOCUS_LIGHT_DECAY = 1.65;

/** Cool rim light placed behind the cylinder to separate the glass from the backdrop. */
export const RIM_LIGHT_POSITION: [number, number, number] = [-5, -3, -6];
export const RIM_LIGHT_INTENSITY = 1.1;
export const RIM_LIGHT_COLOR = '#7fb6ff';

export const ENVIRONMENT_INTENSITY = 0.85;
export const ENVIRONMENT_RESOLUTION_HIGH = 256;
export const ENVIRONMENT_RESOLUTION_LOW = 64;

/**
 * The environment map is baked once from the emissive rig below instead of being
 * fetched as an HDR file. No network request, no megabytes to ship, and the studio
 * look stays fully tunable from here.
 */
export const ENVIRONMENT_FRAMES = 1;

export type LightformerSpec = {
  readonly id: string;
  readonly form: 'rect' | 'circle' | 'ring';
  readonly intensity: number;
  readonly color: string;
  readonly position: readonly [number, number, number];
  readonly scale: readonly [number, number, number];
};

/**
 * Studio rig captured into the environment map.
 *
 * Every lightformer aims at the origin (drei's default `target`), so only position,
 * scale and intensity need tuning. The two vertical kickers are what draw the bright
 * edges along the rounded corners of the glass — remove them and the cards go flat.
 */
export const STUDIO_LIGHTFORMERS: readonly LightformerSpec[] = [
  // Overhead softbox: the broad, soft top reflection across each card face.
  { id: 'key-top', form: 'rect', intensity: 3.2, color: '#ffffff', position: [0, 9, 1], scale: [14, 14, 1] },
  // Cool kicker, left.
  { id: 'kick-left', form: 'rect', intensity: 2.1, color: '#bcd8ff', position: [-8, 1, 3], scale: [2.5, 16, 1] },
  // Warm kicker, right — the slight temperature split is what reads as "real" glass.
  { id: 'kick-right', form: 'rect', intensity: 2.1, color: '#ffe3c2', position: [8, -1, 3], scale: [2.5, 16, 1] },
  // Front ring: the specular halo that lands on whichever card is at the focus slot.
  { id: 'focus-ring', form: 'ring', intensity: 2.6, color: '#ffffff', position: [0, 0, 9], scale: [5, 5, 1] },
  // Low back fill so the bottom edge never crushes to pure black.
  { id: 'fill-back', form: 'rect', intensity: 0.9, color: '#5f7fae', position: [0, -6, -8], scale: [12, 6, 1] },
];

/* ------------------------------------------------------------------ *
 * Materials
 * ------------------------------------------------------------------ */

export const GLASS_COLOR = '#aebed8';
export const GLASS_HIGH = {
  transmission: 1,
  thickness: 0.55,
  ior: 1.45,
  roughness: 0.15,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
  envMapIntensity: 1.15,
} as const;

export const GLASS_LOW = {
  opacity: 0.18,
  roughness: 0.2,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  metalness: 0,
  envMapIntensity: 1.35,
} as const;

/** Resolution scale of the three.js transmission render target (high tier only). */
export const TRANSMISSION_RESOLUTION_SCALE = 0.5;

/* ------------------------------------------------------------------ *
 * Selection transition
 * ------------------------------------------------------------------ */

/** Outward travel of the hero card along the cylinder normal, toward the camera. */
export const SELECT_Z_OFFSET = 1.2;
/** Desktop target scale of the hero card. Narrow viewports clamp below this. */
export const SELECT_SCALE = 2.6;
/** Fraction of the viewport the hero logo may occupy before the scale is clamped. */
export const HERO_FILL_RATIO = 0.92;
/** Floor for the clamped hero scale, so the money shot stays dramatic on phones. */
export const HERO_MIN_SCALE = 1.3;
/** Scale the 18 discarded cards collapse to while fading out. */
export const SELECT_OTHERS_SCALE = 0.4;

/* --- Phase 1: confirmation ---
 *
 * The company opens in a SEPARATE tab, and the browser focuses that tab the instant
 * `window.open` returns. A long hero cinematic would simply never be seen, so the
 * transition is a short acknowledgement of the choice rather than a departure. Every
 * value below is deliberately smaller than the redirect-era cinematic it replaced.
 */

export const SELECT_ROTATION_SNAP_DURATION = 0.22;
export const SELECT_CONFIRM_FADE_DURATION = 0.18;
export const SELECT_CONFIRM_PULSE_DURATION = 0.34;
export const SELECT_CONFIRM_FLARE_START = 0.06;
export const SELECT_CONFIRM_FLARE_DURATION = 0.26;
export const SELECT_CONFIRM_FLASH_START = 0.08;
export const SELECT_CONFIRM_FLASH_IN_DURATION = 0.08;
export const SELECT_CONFIRM_FLASH_OUT_DURATION = 0.16;

/**
 * Dim applied to the other eighteen cards, NOT a dissolve.
 *
 * The user stays on this page and comes straight back to the wheel, so the cards it
 * is made of must never drop to `opacity: 0`. This is the single value that turns the
 * old point-of-no-return transition into a reversible one.
 */
export const SELECT_CONFIRM_FADE = 0.55;
/** Outward travel of the chosen card during the confirmation pulse. */
export const CONFIRM_Z_OFFSET = 0.45;
/** Peak scale of the confirmation pulse. A nod, not a zoom. */
export const CONFIRM_SCALE = 1.18;
/** Peak opacity of the white flash: a wink, not a whiteout. */
export const SELECT_CONFIRM_FLASH_PEAK = 0.35;

/* --- Phase 2: restore --- */

/** Length of the tween that returns every selection scalar to its rest value. */
export const SELECT_RESTORE_DURATION = 0.38;

/** Emissive peak for the logo. The low tier compensates for the missing bloom pass. */
export const EMISSIVE_PEAK_HIGH = 8;
export const EMISSIVE_PEAK_LOW = 12;
/** Peak opacity of the additive glow plane that stands in for bloom on the low tier. */
export const GLOW_MAX_OPACITY = 0.9;
export const BLOOM_PEAK = 1.6;
export const BLOOM_LUMINANCE_THRESHOLD = 0.55;
export const BLOOM_LUMINANCE_SMOOTHING = 0.3;
export const BLOOM_MIPMAP_BLUR = true;

/**
 * Length of phase 1, derived from whichever confirmation tween finishes last rather
 * than hand-written, so retuning any single value above cannot silently drift it.
 */
export const SELECT_CONFIRM_DURATION = Math.max(
  SELECT_ROTATION_SNAP_DURATION,
  SELECT_CONFIRM_FADE_DURATION,
  SELECT_CONFIRM_PULSE_DURATION,
  SELECT_CONFIRM_FLARE_START + SELECT_CONFIRM_FLARE_DURATION,
  SELECT_CONFIRM_FLASH_START + SELECT_CONFIRM_FLASH_IN_DURATION + SELECT_CONFIRM_FLASH_OUT_DURATION,
);

/**
 * Total wall-clock length of confirmation + restore, in seconds.
 *
 * Unlike the redirect-era cinematic this is NOT a deadline the user waits on: the new
 * tab has already been handed to the browser before the timeline starts. It only has
 * to be short enough that the wheel is back at rest by the time the user returns.
 */
export const SELECT_CONFIRM_TOTAL_DURATION =
  SELECT_CONFIRM_DURATION + SELECT_RESTORE_DURATION;

/* ------------------------------------------------------------------ *
 * Renderer / quality tiers
 * ------------------------------------------------------------------ */

export const DPR_HIGH: [number, number] = [1, 2];
export const DPR_LOW: [number, number] = [1, 1.5];

export const ANISOTROPY_HIGH = 4;
export const ANISOTROPY_LOW = 1;

/** Viewport width (px) below which a coarse pointer implies a phone-class device. */
export const LOW_TIER_VIEWPORT_WIDTH = 768;
export const LOW_TIER_MAX_CORES = 4;
export const LOW_TIER_MAX_MEMORY_GB = 4;

/** `PerformanceMonitor` bounds used to step the device pixel ratio under load. */
export const PERF_DPR_FLOOR = 0.75;
export const PERF_DPR_STEP = 0.2;

/* ------------------------------------------------------------------ *
 * UI copy timing
 * ------------------------------------------------------------------ */

export const HUD_SWAP_DURATION = 0.32;
export const HUD_SWAP_OFFSET_Y = 14;
export const HINT_FADE_DURATION = 0.45;

/**
 * The HUD steps back during the confirmation instead of disappearing.
 * Zero would be wrong: the user returns to this page, and chrome that faded to
 * nothing has no way of knowing it should come back.
 */
export const HUD_DIM_OPACITY = 0.12;
export const HUD_DIM_DURATION = 0.2;
export const HUD_RESTORE_DURATION = 0.3;
