import * as THREE from 'three';

import {
  CARD_BEVEL_SEGMENTS,
  CARD_BEVEL_SIZE,
  CARD_CORNER_RADIUS,
  CARD_CORNER_SEGMENTS,
  CARD_DEPTH,
  CARD_HEIGHT,
  CARD_WIDTH,
} from '@/lib/constants';

/** Rounded rectangle silhouette, centred on the origin. */
function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const r = Math.min(radius, halfWidth, halfHeight);

  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + r, -halfHeight);
  shape.lineTo(halfWidth - r, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r);
  shape.lineTo(halfWidth, halfHeight - r);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - r, halfHeight);
  shape.lineTo(-halfWidth + r, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r);
  shape.lineTo(-halfWidth, -halfHeight + r);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight);
  shape.closePath();

  return shape;
}

/**
 * Builds the single rounded-slab geometry shared by all cards.
 *
 * Call this ONCE and hand the result to every card. Nineteen independent
 * `ExtrudeGeometry` instances would mean nineteen separate GPU buffer uploads for
 * nineteen identical meshes.
 */
export function createCardGeometry(): THREE.ExtrudeGeometry {
  const shape = createRoundedRectShape(CARD_WIDTH, CARD_HEIGHT, CARD_CORNER_RADIUS);

  // The bevel adds CARD_BEVEL_SIZE on each face, so subtract it from the extrusion
  // to land on exactly CARD_DEPTH overall.
  const depth = Math.max(CARD_DEPTH - CARD_BEVEL_SIZE * 2, 0.001);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: CARD_BEVEL_SIZE,
    bevelSize: CARD_BEVEL_SIZE,
    bevelOffset: 0,
    bevelSegments: CARD_BEVEL_SEGMENTS,
    curveSegments: CARD_CORNER_SEGMENTS,
  });

  // ExtrudeGeometry grows along +Z from the shape plane; recentre so the card pivots
  // about its own middle and the logo offset stays symmetrical.
  geometry.center();
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Unit plane shared by every logo (and every additive glow quad).
 * Per-card sizing is applied through `mesh.scale`, never through a new geometry.
 */
export function createLogoGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(1, 1);
}

/**
 * Fits a texture's aspect ratio inside the logo bounding box.
 * Returned values are used directly as the logo mesh scale.
 */
export function fitLogoSize(
  aspect: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;

  let width = maxWidth;
  let height = width / safeAspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * safeAspect;
  }

  return { width, height };
}
