// Coordinate conversion functions for PDF Takeoff
// World space = PDF page coordinates (stable, zoom-independent)
// View space = Canvas pixel coordinates (transient, affected by zoom/pan/rotation)

import { WorldPoint, ViewPoint, Transform, PDFViewportData } from './types';

/**
 * Convert view (canvas) coordinates to world (PDF) coordinates
 * This is CRITICAL for storing measurements correctly - they must be zoom-independent
 * Note: Assumes PDF is rendered at base scale 1.0
 */
export function viewToWorld(
  viewPoint: ViewPoint,
  transform: Transform,
  viewport: PDFViewportData
): WorldPoint {
  // 1. Undo pan
  let x = viewPoint.x - transform.panX;
  let y = viewPoint.y - transform.panY;

  // 2. Undo zoom (PDF rendered at base scale 1.0, zoom is applied via transform)
  x /= transform.zoom;
  y /= transform.zoom;

  // 3. Undo rotation (and flip Y for PDF coordinate system)
  const { width, height } = viewport;
  let wx: number, wy: number;

  switch (transform.rotation) {
    case 0:
      wx = x;
      wy = height - y;  // Canvas top-left → PDF bottom-left
      break;
    case 90:
      wx = y;
      wy = x;
      break;
    case 180:
      wx = width - x;
      wy = y;
      break;
    case 270:
      wx = height - y;
      wy = width - x;
      break;
    default:
      wx = x;
      wy = height - y;
  }

  return { x: wx, y: wy };
}

/**
 * Convert world (PDF) coordinates to view (canvas) coordinates
 * Used ONLY for rendering - never for storage
 * Note: Assumes PDF is rendered at base scale 1.0
 */
export function worldToView(
  worldPoint: WorldPoint,
  transform: Transform,
  viewport: PDFViewportData
): ViewPoint {
  const { width, height } = viewport;
  let x: number, y: number;

  // Apply rotation
  switch (transform.rotation) {
    case 0:
      x = worldPoint.x;
      y = height - worldPoint.y;
      break;
    case 90:
      x = worldPoint.y;
      y = worldPoint.x;
      break;
    case 180:
      x = width - worldPoint.x;
      y = worldPoint.y;
      break;
    case 270:
      x = height - worldPoint.y;
      y = width - worldPoint.x;
      break;
    default:
      x = worldPoint.x;
      y = height - worldPoint.y;
  }

  // Apply zoom and pan (PDF is at base scale, zoom is in transform)
  x = x * transform.zoom + transform.panX;
  y = y * transform.zoom + transform.panY;

  return { x, y };
}

/**
 * Calculate distance in world coordinates (zoom-independent)
 */
export function worldDistance(p1: WorldPoint, p2: WorldPoint): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}
