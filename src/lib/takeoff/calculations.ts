// Pure calculation functions for PDF Takeoff measurements

import { Point, ScaleData, Measurement } from './types';

/**
 * Calculate scale from preset scale string (e.g., "1:100")
 */
export function calculatePresetScale(
  presetScale: string,
  canvasDPI: number = 96
): ScaleData {
  const ratio = parseInt(presetScale.split(':')[1]);
  const mmPerInch = 25.4;
  const pxPerMM = canvasDPI / mmPerInch;
  
  // Calculate pixels per real-world metre
  const pixelsPerMetre = (1000 / ratio) * pxPerMM;
  
  return {
    pixelsPerUnit: pixelsPerMetre,
    scaleFactor: ratio,
    scaleMethod: 'preset'
  };
}

/**
 * Calculate scale from manual two-point calibration
 */
export function calculateManualScale(
  point1: Point,
  point2: Point,
  realWorldDistance: number,
  unit: 'metric' | 'imperial' = 'metric'
): ScaleData {
  // Calculate pixel distance between two points
  const pixelDistance = Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + 
    Math.pow(point2.y - point1.y, 2)
  );
  
  // Convert real-world distance to metres if needed
  const distanceInMetres = unit === 'imperial' 
    ? realWorldDistance * 0.3048 // feet to metres
    : realWorldDistance;
  
  // Calculate pixels per metre
  const pixelsPerMetre = pixelDistance / distanceInMetres;
  
  return {
    pixelsPerUnit: pixelsPerMetre,
    scaleFactor: null, // N/A for manual calibration
    scaleMethod: 'manual',
    calibrationLine: {
      point1,
      point2,
      pixelDistance
    }
  };
}

/**
 * Calculate linear measurement (LM - Linear Metres)
 */
export function calculateLinear(
  point1: Point,
  point2: Point,
  pixelsPerUnit: number
): { pixelValue: number; realValue: number; unit: 'LM' } {
  const pixelDistance = Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + 
    Math.pow(point2.y - point1.y, 2)
  );
  
  return {
    pixelValue: pixelDistance,
    realValue: pixelDistance / pixelsPerUnit,
    unit: 'LM'
  };
}

/**
 * Calculate rectangle area (M²)
 */
export function calculateRectangleArea(
  point1: Point,
  point2: Point,
  pixelsPerUnit: number
): { 
  pixelValue: number; 
  realValue: number; 
  unit: 'M2';
  dimensions: { width: number; height: number };
} {
  const width = Math.abs(point2.x - point1.x);
  const height = Math.abs(point2.y - point1.y);
  const pixelArea = width * height;
  
  // Convert to square metres
  const realArea = pixelArea / Math.pow(pixelsPerUnit, 2);
  
  return {
    pixelValue: pixelArea,
    realValue: realArea,
    unit: 'M2',
    dimensions: {
      width: width / pixelsPerUnit,
      height: height / pixelsPerUnit
    }
  };
}

/**
 * Calculate polygon area using shoelace formula (M²)
 */
export function calculatePolygonArea(
  points: Point[],
  pixelsPerUnit: number
): { pixelValue: number; realValue: number; unit: 'M2' } {
  if (points.length < 3) {
    return { pixelValue: 0, realValue: 0, unit: 'M2' };
  }
  
  // Shoelace formula for polygon area
  let pixelArea = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    pixelArea += points[i].x * points[j].y;
    pixelArea -= points[j].x * points[i].y;
  }
  pixelArea = Math.abs(pixelArea / 2);
  
  const realArea = pixelArea / Math.pow(pixelsPerUnit, 2);
  
  return {
    pixelValue: pixelArea,
    realValue: realArea,
    unit: 'M2'
  };
}

/**
 * Calculate sloped roof area (accounts for pitch)
 */
export function calculateSlopedArea(
  baseArea: number,
  roofPitch: { rise: number; run: number }
): number {
  // roofPitch = {rise: 4, run: 12} for 4:12 pitch
  const slopeFactor = Math.sqrt(
    Math.pow(roofPitch.run, 2) + 
    Math.pow(roofPitch.rise, 2)
  ) / roofPitch.run;
  
  return baseArea * slopeFactor;
}

/**
 * Calculate volume (M³)
 */
export function calculateVolume(
  area: number,
  depth: number
): { realValue: number; unit: 'M3' } {
  return {
    realValue: area * depth,
    unit: 'M3'
  };
}

/**
 * Apply deduction to parent measurement
 */
export function applyDeduction(
  parentMeasurement: Measurement,
  deductionMeasurement: Measurement
): Measurement {
  return {
    ...parentMeasurement,
    realValue: parentMeasurement.realValue - deductionMeasurement.realValue,
  };
}

/**
 * Aggregate measurements by unit type
 */
export function aggregateMeasurements(
  measurements: Measurement[],
  unit: 'LM' | 'M2' | 'M3' | 'count'
): number {
  return measurements
    .filter(m => m.unit === unit && !m.isDeduction)
    .reduce((total, m) => total + m.realValue, 0);
}

/**
 * Calculate polygon centroid (for label placement)
 */
export function calculateCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  
  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  
  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  };
}

/**
 * Check if a point is near another point (for polygon closure detection)
 */
export function isPointNear(
  point1: Point,
  point2: Point,
  threshold: number = 20
): boolean {
  const distance = Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + 
    Math.pow(point2.y - point1.y, 2)
  );
  return distance < threshold;
}

/**
 * Snap point to grid
 */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}
