// Coordinate conversion functions for PDF Takeoff
// World space = PDF page coordinates (stable, zoom-independent)
// View space = Canvas pixel coordinates (transient, affected by zoom/pan/rotation)

import { WorldPoint, ViewPoint, Transform, PDFViewportData } from './types';

/**
 * Convert view (canvas) coordinates to world (PDF) coordinates
 * 
 * CRITICAL: When using canvas.getPointer(e.e, false), the pointer already accounts
 * for the viewportTransform (zoom/pan). So we only need to handle the conceptual
 * mapping between canvas and PDF coordinate systems.
 * 
 * Since PDF is rendered at base scale 1.0 and positioned at origin, the conversion
 * is straightforward when getPointer(false) is used.
 */
export function viewToWorld(
  viewPoint: ViewPoint,
  transform: Transform,
  viewport: PDFViewportData
): WorldPoint {
  // getPointer(e.e, false) returns scene coordinates that already account for
  // viewportTransform (zoom/pan), so we just need to store the point directly
  // as world coordinates. The Y-axis is the same since Fabric.js and our
  // coordinate system both use top-left origin.
  
  // Note: If rotation is applied, we'd need to handle it here, but for now
  // rotation is handled separately in the viewport rendering
  
  return { 
    x: viewPoint.x, 
    y: viewPoint.y 
  };
}

/**
 * Convert world (PDF) coordinates to view (canvas) coordinates
 * Used for rendering stored measurements at current zoom/pan level
 * 
 * Since world coordinates are the actual PDF coordinates and the PDF
 * is rendered at base scale 1.0, we apply the current transform to
 * convert to screen position.
 */
export function worldToView(
  worldPoint: WorldPoint,
  transform: Transform,
  viewport: PDFViewportData
): ViewPoint {
  // Apply zoom and pan to convert world coords to view coords
  // PDF is at base scale 1.0, so world coords map directly to PDF pixels
  const x = worldPoint.x * transform.zoom + transform.panX;
  const y = worldPoint.y * transform.zoom + transform.panY;

  return { x, y };
}

/**
 * Calculate distance in world coordinates (zoom-independent)
 */
export function worldDistance(p1: WorldPoint, p2: WorldPoint): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}
