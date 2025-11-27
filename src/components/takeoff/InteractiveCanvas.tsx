import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Line, Rect, Polygon, Circle, FabricImage } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';
import { Point, Measurement, ToolType, MeasurementType, MeasurementUnit } from '@/lib/takeoff/types';
import { calculateLinear, calculateRectangleArea, calculatePolygonArea } from '@/lib/takeoff/calculations';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface InteractiveCanvasProps {
  pdfUrl: string;
  pageIndex: number;
  zoomLevel: number;
  rotation: number;
  activeTool: ToolType;
  isCalibrated: boolean;
  pixelsPerUnit: number | null;
  calibrationMode: 'preset' | 'manual' | null;
  deductionMode: boolean;
  onMeasurementComplete: (measurement: Measurement) => void;
  onCalibrationPointsSet: (points: [Point, Point]) => void;
  onZoomChange: (zoom: number) => void;
}

export const InteractiveCanvas = ({
  pdfUrl,
  pageIndex,
  zoomLevel,
  rotation,
  activeTool,
  isCalibrated,
  pixelsPerUnit,
  calibrationMode,
  deductionMode,
  onMeasurementComplete,
  onCalibrationPointsSet,
  onZoomChange
}: InteractiveCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentShape, setCurrentShape] = useState<any>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  
  // Calibration state
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [calibrationLine, setCalibrationLine] = useState<Line | null>(null);
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: '#f5f5f5',
      selection: false
    });

    fabricCanvasRef.current = canvas;

    return () => {
      canvas.dispose();
    };
  }, []);

  // Load and render PDF
  useEffect(() => {
    const loadPDF = async () => {
      if (!fabricCanvasRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const isPDF = pdfUrl.toLowerCase().endsWith('.pdf') || pdfUrl.includes('application/pdf');

        if (isPDF) {
          const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
          const page = await pdf.getPage(pageIndex + 1);
          
          const viewport = page.getViewport({ scale: 2 });
          const tempCanvas = document.createElement('canvas');
          const context = tempCanvas.getContext('2d')!;
          
          tempCanvas.width = viewport.width;
          tempCanvas.height = viewport.height;
          
          await page.render({ 
            canvasContext: context, 
            viewport,
            canvas: tempCanvas 
          }).promise;
          
          const imageUrl = tempCanvas.toDataURL();
          const img = await FabricImage.fromURL(imageUrl);
          
          fabricCanvasRef.current.clear();
          fabricCanvasRef.current.setWidth(viewport.width);
          fabricCanvasRef.current.setHeight(viewport.height);
          fabricCanvasRef.current.backgroundImage = img;
          fabricCanvasRef.current.renderAll();
        } else {
          const img = await FabricImage.fromURL(pdfUrl);
          fabricCanvasRef.current.clear();
          fabricCanvasRef.current.setWidth(img.width!);
          fabricCanvasRef.current.setHeight(img.height!);
          fabricCanvasRef.current.backgroundImage = img;
          fabricCanvasRef.current.renderAll();
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF');
        setLoading(false);
      }
    };

    loadPDF();
  }, [pdfUrl, pageIndex]);

  // Apply zoom
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.setZoom(zoomLevel);
    fabricCanvasRef.current.renderAll();
  }, [zoomLevel]);

  // Update cursor based on active tool
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    let cursor = 'default';
    if (calibrationMode === 'manual') {
      cursor = 'crosshair';
    } else if (activeTool && activeTool !== 'count') {
      cursor = 'crosshair';
    } else if (activeTool === 'count') {
      cursor = 'pointer';
    } else if (!activeTool) {
      cursor = 'grab';
    }
    
    fabricCanvasRef.current.defaultCursor = cursor;
    fabricCanvasRef.current.hoverCursor = cursor;
  }, [activeTool, calibrationMode]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.25, Math.min(4, zoomLevel + delta));
    onZoomChange(newZoom);
  }, [zoomLevel, onZoomChange]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const canvasEl = canvas.getElement();
    canvasEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvasEl.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Handle calibration clicks
  const handleCalibrationClick = useCallback((e: any) => {
    if (calibrationMode !== 'manual') return;

    const pointer = fabricCanvasRef.current!.getPointer(e.e);
    const point: Point = { x: pointer.x, y: pointer.y };

    if (calibrationPoints.length === 0) {
      // First point
      setCalibrationPoints([point]);
      
      const circle = new Circle({
        left: point.x - 5,
        top: point.y - 5,
        radius: 5,
        fill: 'red',
        selectable: false,
        evented: false
      });
      fabricCanvasRef.current!.add(circle);
    } else if (calibrationPoints.length === 1) {
      // Second point
      const newPoints: [Point, Point] = [calibrationPoints[0], point];
      setCalibrationPoints(newPoints);
      
      const circle = new Circle({
        left: point.x - 5,
        top: point.y - 5,
        radius: 5,
        fill: 'red',
        selectable: false,
        evented: false
      });
      
      const line = new Line([
        calibrationPoints[0].x,
        calibrationPoints[0].y,
        point.x,
        point.y
      ], {
        stroke: 'red',
        strokeWidth: 2,
        selectable: false,
        evented: false
      });
      
      fabricCanvasRef.current!.add(circle, line);
      setCalibrationLine(line);
      
      onCalibrationPointsSet(newPoints);
    }
  }, [calibrationMode, calibrationPoints, onCalibrationPointsSet]);

  // Handle measurement drawing
  const handleMouseDown = useCallback((e: any) => {
    if (!fabricCanvasRef.current) return;
    const pointer = fabricCanvasRef.current.getPointer(e.e);
    const point: Point = { x: pointer.x, y: pointer.y };

    // Handle calibration
    if (calibrationMode === 'manual') {
      handleCalibrationClick(e);
      return;
    }

    // Handle panning
    if (!activeTool) {
      setIsPanning(true);
      setLastPanPoint(point);
      fabricCanvasRef.current.defaultCursor = 'grabbing';
      return;
    }

    // Handle count tool
    if (activeTool === 'count') {
      const marker = new Circle({
        left: point.x - 4,
        top: point.y - 4,
        radius: 4,
        fill: '#FF9800',
        stroke: '#F57C00',
        strokeWidth: 1,
        selectable: false
      });
      fabricCanvasRef.current.add(marker);

      const measurement: Measurement = {
        id: crypto.randomUUID(),
        type: 'circle',
        points: [point],
        pixelValue: 1,
        realValue: 1,
        unit: 'count',
        color: '#FF9800',
        label: 'Count',
        isDeduction: false,
        pageIndex,
        timestamp: new Date()
      };
      onMeasurementComplete(measurement);
      return;
    }

    // Start drawing
    setIsDrawing(true);
    setStartPoint(point);

    if (activeTool === 'polygon') {
      setPolygonPoints(prev => [...prev, point]);
    }
  }, [activeTool, calibrationMode, pageIndex, handleCalibrationClick, onMeasurementComplete]);

  const handleMouseMove = useCallback((e: any) => {
    if (!fabricCanvasRef.current) return;
    const pointer = fabricCanvasRef.current.getPointer(e.e);
    const point: Point = { x: pointer.x, y: pointer.y };

    // Handle panning
    if (isPanning && lastPanPoint) {
      const vpt = fabricCanvasRef.current.viewportTransform!;
      vpt[4] += point.x - lastPanPoint.x;
      vpt[5] += point.y - lastPanPoint.y;
      fabricCanvasRef.current.requestRenderAll();
      setLastPanPoint(point);
      return;
    }

    if (!isDrawing || !startPoint) return;

    // Preview shape while drawing
    if (currentShape) {
      fabricCanvasRef.current.remove(currentShape);
    }

    let shape: any = null;

    if (activeTool === 'line') {
      shape = new Line([startPoint.x, startPoint.y, point.x, point.y], {
        stroke: '#FF6B6B',
        strokeWidth: 2,
        selectable: false,
        strokeDashArray: [5, 5]
      });
    } else if (activeTool === 'rectangle') {
      const width = point.x - startPoint.x;
      const height = point.y - startPoint.y;
      shape = new Rect({
        left: Math.min(startPoint.x, point.x),
        top: Math.min(startPoint.y, point.y),
        width: Math.abs(width),
        height: Math.abs(height),
        fill: 'rgba(76, 175, 80, 0.2)',
        stroke: '#4CAF50',
        strokeWidth: 2,
        selectable: false
      });
    }

    if (shape) {
      fabricCanvasRef.current.add(shape);
      setCurrentShape(shape);
    }
  }, [isDrawing, startPoint, isPanning, lastPanPoint, activeTool, currentShape]);

  const handleMouseUp = useCallback((e: any) => {
    if (!fabricCanvasRef.current || !isCalibrated || !pixelsPerUnit) return;

    const pointer = fabricCanvasRef.current.getPointer(e.e);
    const point: Point = { x: pointer.x, y: pointer.y };

    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      fabricCanvasRef.current.defaultCursor = 'grab';
      return;
    }

    if (!isDrawing || !startPoint) return;

    // Complete measurement
    if (activeTool === 'line') {
      const result = calculateLinear(startPoint, point, pixelsPerUnit);
      const measurement: Measurement = {
        id: crypto.randomUUID(),
        type: 'line',
        points: [startPoint, point],
        pixelValue: result.pixelValue,
        realValue: result.realValue,
        unit: result.unit,
        color: '#FF6B6B',
        label: `Line ${result.realValue.toFixed(2)}m`,
        isDeduction: deductionMode,
        pageIndex,
        timestamp: new Date()
      };
      onMeasurementComplete(measurement);
    } else if (activeTool === 'rectangle') {
      const result = calculateRectangleArea(startPoint, point, pixelsPerUnit);
      const measurement: Measurement = {
        id: crypto.randomUUID(),
        type: 'rectangle',
        points: [startPoint, point],
        pixelValue: result.pixelValue,
        realValue: result.realValue,
        unit: result.unit,
        color: '#4CAF50',
        label: `Rectangle ${result.realValue.toFixed(2)}m²`,
        isDeduction: deductionMode,
        pageIndex,
        timestamp: new Date()
      };
      onMeasurementComplete(measurement);
    }

    // Reset drawing state
    setIsDrawing(false);
    setStartPoint(null);
    if (currentShape) {
      fabricCanvasRef.current.remove(currentShape);
      setCurrentShape(null);
    }
  }, [isDrawing, startPoint, isCalibrated, pixelsPerUnit, activeTool, deductionMode, pageIndex, isPanning, currentShape, onMeasurementComplete]);

  // Handle polygon double-click to complete
  const handleDoubleClick = useCallback(() => {
    if (activeTool !== 'polygon' || polygonPoints.length < 3 || !isCalibrated || !pixelsPerUnit) return;

    const result = calculatePolygonArea(polygonPoints, pixelsPerUnit);
    const measurement: Measurement = {
      id: crypto.randomUUID(),
      type: 'polygon',
      points: polygonPoints,
      pixelValue: result.pixelValue,
      realValue: result.realValue,
      unit: result.unit,
      color: '#2196F3',
      label: `Polygon ${result.realValue.toFixed(2)}m²`,
      isDeduction: deductionMode,
      pageIndex,
      timestamp: new Date()
    };

    onMeasurementComplete(measurement);
    setPolygonPoints([]);
    setIsDrawing(false);
  }, [activeTool, polygonPoints, isCalibrated, pixelsPerUnit, deductionMode, pageIndex, onMeasurementComplete]);

  // Attach event listeners
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:dblclick', handleDoubleClick);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('mouse:dblclick', handleDoubleClick);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleDoubleClick]);

  return (
    <div className="relative border border-border rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <p className="text-destructive">{error}</p>
        </div>
      )}
      <canvas ref={canvasRef} />
    </div>
  );
};
