// Core TypeScript interfaces for PDF Takeoff system

export type MeasurementType = 'line' | 'rectangle' | 'polygon' | 'circle';
export type MeasurementUnit = 'LM' | 'M2' | 'M3' | 'count';
export type ToolType = 'line' | 'rectangle' | 'polygon' | 'circle' | 'count' | 'pan' | null;
export type CalibrationMode = 'preset' | 'manual' | null;

export interface Point {
  x: number;
  y: number;
}

export interface ScaleData {
  pixelsPerUnit: number; // pixels per metre
  scaleFactor: number | null; // e.g., 100 for 1:100
  scaleMethod: 'preset' | 'manual';
  calibrationLine?: {
    point1: Point;
    point2: Point;
    pixelDistance: number;
  };
}

export interface Measurement {
  id: string;
  type: MeasurementType;
  points: Point[];
  pixelValue: number;
  realValue: number;
  unit: MeasurementUnit;
  color: string;
  label: string;
  isDeduction: boolean;
  dimensions?: { width: number; height: number };
  roofPitch?: { rise: number; run: number };
  depth?: number; // For volume calculations (metres)
  linkedCostItem?: string;
  pageIndex: number;
  timestamp: Date;
}

export interface CostItem {
  id: string;
  category: string;
  name: string;
  description: string;
  unit: MeasurementUnit;
  unitCost: number;
  quantity: number;
  linkedMeasurements: string[];
  laborHours?: number;
  wasteFactor: number;
  supplierCode?: string;
  notes?: string;
  subtotal: number;
}

export interface PDFFile {
  file: File;
  url: string;
  name: string;
  pageCount: number;
}

export interface TakeoffState {
  // Upload state
  pdfFile: PDFFile | null;
  uploadStatus: 'idle' | 'loading' | 'success' | 'error';
  uploadError: string | null;
  
  // Page state
  currentPageIndex: number;
  pageCount: number;
  
  // Scaling state
  scales: Map<number, ScaleData>;
  currentScale: ScaleData | null;
  isCalibrated: boolean;
  calibrationMode: CalibrationMode;
  
  // Measurement state
  activeTool: ToolType;
  measurements: Measurement[];
  selectedMeasurementId: string | null;
  currentMeasurement: {
    points: Point[];
    isComplete: boolean;
  } | null;
  
  // Cost state
  costItems: CostItem[];
  selectedCostItemId: string | null;
  
  // Estimate totals
  estimate: {
    materials: number;
    labor: number;
    subtotal: number;
    markup: number;
    total: number;
  };
  
  // UI state
  deductionMode: boolean;
  roofPitch: { rise: number; run: number };
  depthInput: number;
  selectedColor: string;
  zoomLevel: number;
  
  // History for undo/redo
  history: Measurement[][];
  historyIndex: number;
}

export type TakeoffAction =
  | { type: 'SET_PDF_FILE'; payload: PDFFile }
  | { type: 'SET_UPLOAD_STATUS'; payload: TakeoffState['uploadStatus'] }
  | { type: 'SET_UPLOAD_ERROR'; payload: string }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_SCALE'; payload: { pageIndex: number; scale: ScaleData } }
  | { type: 'SET_CALIBRATION_MODE'; payload: CalibrationMode }
  | { type: 'SET_ACTIVE_TOOL'; payload: ToolType }
  | { type: 'ADD_MEASUREMENT'; payload: Measurement }
  | { type: 'UPDATE_MEASUREMENT'; payload: { id: string; updates: Partial<Measurement> } }
  | { type: 'DELETE_MEASUREMENT'; payload: string }
  | { type: 'SELECT_MEASUREMENT'; payload: string | null }
  | { type: 'SET_CURRENT_MEASUREMENT'; payload: TakeoffState['currentMeasurement'] }
  | { type: 'ADD_COST_ITEM'; payload: CostItem }
  | { type: 'UPDATE_COST_ITEM'; payload: { id: string; updates: Partial<CostItem> } }
  | { type: 'DELETE_COST_ITEM'; payload: string }
  | { type: 'LINK_MEASUREMENT_TO_COST'; payload: { measurementId: string; costItemId: string } }
  | { type: 'SET_DEDUCTION_MODE'; payload: boolean }
  | { type: 'SET_ROOF_PITCH'; payload: { rise: number; run: number } }
  | { type: 'SET_DEPTH_INPUT'; payload: number }
  | { type: 'SET_SELECTED_COLOR'; payload: string }
  | { type: 'SET_ZOOM_LEVEL'; payload: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CALCULATE_ESTIMATE' };
