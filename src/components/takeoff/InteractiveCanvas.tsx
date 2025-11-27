import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage, Circle, Line, Rect, Polygon, Text, Point as FabricPoint } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';
import { Point, Measurement, ToolType } from '@/lib/takeoff/types';
import { calculateLinear, calculateRectangleArea, calculatePolygonArea, calculateCentroid } from '@/lib/takeoff/calculations';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface InteractiveCanvasProps {
  pdfUrl: string | null;
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
  onZoomChange?: (zoom: number) => void;
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
  onZoomChange,
}: InteractiveCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [previewShape, setPreviewShape] = useState<any>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [polygonMarkers, setPolygonMarkers] = useState<Circle[]>([]);
  const [polygonLines, setPolygonLines] = useState<Line[]>([]);

  // Calibration state
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [calibrationObjects, setCalibrationObjects] = useState<any[]>([]);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [lastClientPos, setLastClientPos] = useState<{ x: number; y: number } | null>(null);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: '#f5f5f5',
      selection: false,
    });

    fabricCanvasRef.current = canvas;

    return () => {
      canvas.dispose();
    };
  }, []);

  // Load PDF page
  useEffect(() => {
    if (!pdfUrl || !fabricCanvasRef.current) return;

    const loadPDF = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(pageIndex + 1);

        const viewport = page.getViewport({ scale: 2.0, rotation });
        const tempCanvas = document.createElement('canvas');
        const context = tempCanvas.getContext('2d');

        if (!context) throw new Error('Could not get canvas context');

        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: tempCanvas,
        };
        await page.render(renderContext).promise;

        const dataUrl = tempCanvas.toDataURL();
        const img = await FabricImage.fromURL(dataUrl);

        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.setWidth(viewport.width);
          fabricCanvasRef.current.setHeight(viewport.height);
          fabricCanvasRef.current.backgroundImage = img;
          fabricCanvasRef.current.requestRenderAll();
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF');
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [pdfUrl, pageIndex, rotation]);

  // Apply zoom
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    canvas.setZoom(zoomLevel);
    canvas.requestRenderAll();
  }, [zoomLevel]);

  // Update cursor based on active tool
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    if (calibrationMode === 'manual') {
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
    } else if (activeTool === 'pan' || !activeTool) {
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
    } else {
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
    }
  }, [activeTool, calibrationMode]);

  // Clear calibration markers when calibration is complete
  useEffect(() => {
    if (isCalibrated && calibrationObjects.length > 0) {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        calibrationObjects.forEach(obj => canvas.remove(obj));
        setCalibrationObjects([]);
        setCalibrationPoints([]);
        canvas.requestRenderAll();
      }
    }
  }, [isCalibrated, calibrationObjects]);

  // Handle mouse wheel zoom
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      let newZoom = canvas.getZoom();
      newZoom = newZoom - delta / 1000;
      newZoom = Math.max(0.1, Math.min(5, newZoom));

      const point = new FabricPoint(e.offsetX, e.offsetY);
      canvas.zoomToPoint(point, newZoom);
      
      if (onZoomChange) {
        onZoomChange(newZoom);
      }
    };

    const canvasElement = canvas.getElement();
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvasElement.removeEventListener('wheel', handleWheel);
    };
  }, [onZoomChange]);

  // Handle calibration click
  const handleCalibrationClick = (point: Point) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const newPoints = [...calibrationPoints, point];
    const newObjects = [...calibrationObjects];
    
    // Add marker
    const marker = new Circle({
      left: point.x - 5,
      top: point.y - 5,
      radius: 5,
      fill: 'red',
      stroke: 'white',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    canvas.add(marker);
    newObjects.push(marker);

    // Add label
    const label = new Text(newPoints.length === 1 ? 'A' : 'B', {
      left: point.x + 10,
      top: point.y - 10,
      fontSize: 16,
      fill: 'red',
      fontWeight: 'bold',
      selectable: false,
      evented: false,
    });
    canvas.add(label);
    newObjects.push(label);

    if (newPoints.length === 2) {
      // Draw line between points
      const line = new Line([newPoints[0].x, newPoints[0].y, newPoints[1].x, newPoints[1].y], {
        stroke: 'red',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
      canvas.add(line);
      newObjects.push(line);

      // Calculate pixel distance
      const dx = newPoints[1].x - newPoints[0].x;
      const dy = newPoints[1].y - newPoints[0].y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);
      
      console.log('Calibration pixel distance:', pixelDistance);
      
      setCalibrationObjects(newObjects);
      onCalibrationPointsSet([newPoints[0], newPoints[1]]);
      setCalibrationPoints([]);
    } else {
      setCalibrationPoints(newPoints);
      setCalibrationObjects(newObjects);
    }

    canvas.requestRenderAll();
  };

  // Handle mouse down
  const handleMouseDown = (e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const pointer = canvas.getPointer(e.e, true);
    const point: Point = { x: pointer.x, y: pointer.y };

    // Handle calibration
    if (calibrationMode === 'manual' && !isCalibrated) {
      handleCalibrationClick(point);
      return;
    }

    // Handle pan
    if (activeTool === 'pan' || !activeTool) {
      setIsPanning(true);
      setLastClientPos({ x: e.e.clientX, y: e.e.clientY });
      canvas.defaultCursor = 'grabbing';
      return;
    }

    // Prevent drawing if not calibrated
    if (!isCalibrated) {
      return;
    }

    setIsDrawing(true);
    setStartPoint(point);

    // Handle count tool (single click)
    if (activeTool === 'count') {
      const marker = new Circle({
        left: point.x - 4,
        top: point.y - 4,
        radius: 4,
        fill: 'orange',
        stroke: 'white',
        strokeWidth: 2,
        selectable: false,
      });
      canvas.add(marker);

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
        timestamp: new Date(),
      };

      onMeasurementComplete(measurement);
      setIsDrawing(false);
      canvas.requestRenderAll();
      return;
    }

    // Handle polygon tool
    if (activeTool === 'polygon') {
      const newPoints = [...polygonPoints, point];
      
      // Add point marker
      const marker = new Circle({
        left: point.x - 3,
        top: point.y - 3,
        radius: 3,
        fill: 'green',
        stroke: 'white',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      canvas.add(marker);
      setPolygonMarkers([...polygonMarkers, marker]);

      // Add line from previous point
      if (newPoints.length > 1) {
        const prevPoint = newPoints[newPoints.length - 2];
        const line = new Line([prevPoint.x, prevPoint.y, point.x, point.y], {
          stroke: 'green',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
        });
        canvas.add(line);
        setPolygonLines([...polygonLines, line]);
      }

      setPolygonPoints(newPoints);
      canvas.requestRenderAll();
      return;
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Handle panning (use client coordinates, not canvas pointer)
    if (isPanning && lastClientPos) {
      const deltaX = e.e.clientX - lastClientPos.x;
      const deltaY = e.e.clientY - lastClientPos.y;
      
      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[4] += deltaX;
        vpt[5] += deltaY;
        canvas.requestRenderAll();
      }
      
      setLastClientPos({ x: e.e.clientX, y: e.e.clientY });
      return;
    }

    if (!isDrawing || !startPoint || !isCalibrated) return;

    const pointer = canvas.getPointer(e.e, true);

    // Remove previous preview
    if (previewShape) {
      canvas.remove(previewShape);
    }

    let shape: any = null;

    // Update preview shape
    if (activeTool === 'line') {
      shape = new Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
        stroke: 'red',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
    } else if (activeTool === 'rectangle') {
      shape = new Rect({
        left: Math.min(startPoint.x, pointer.x),
        top: Math.min(startPoint.y, pointer.y),
        width: Math.abs(pointer.x - startPoint.x),
        height: Math.abs(pointer.y - startPoint.y),
        fill: 'rgba(76, 175, 80, 0.2)',
        stroke: 'green',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
    } else if (activeTool === 'circle') {
      const dx = pointer.x - startPoint.x;
      const dy = pointer.y - startPoint.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      
      shape = new Circle({
        left: startPoint.x - radius,
        top: startPoint.y - radius,
        radius: radius,
        fill: 'rgba(156, 39, 176, 0.2)',
        stroke: 'purple',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
    }

    if (shape) {
      canvas.add(shape);
      setPreviewShape(shape);
    }

    canvas.requestRenderAll();
  };

  // Handle mouse up
  const handleMouseUp = (e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Handle pan end
    if (isPanning) {
      setIsPanning(false);
      setLastClientPos(null);
      canvas.defaultCursor = 'grab';
      return;
    }

    if (!isDrawing || !startPoint || !isCalibrated || !pixelsPerUnit) return;

    const pointer = canvas.getPointer(e.e, true);
    const endPoint: Point = { x: pointer.x, y: pointer.y };

    // Remove preview shape
    if (previewShape) {
      canvas.remove(previewShape);
      setPreviewShape(null);
    }

    // Complete measurement based on tool
    if (activeTool === 'line') {
      const result = calculateLinear(startPoint, endPoint, pixelsPerUnit);
      
      // Create permanent line
      const line = new Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
        stroke: 'red',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(line);

      // Add label
      const midX = (startPoint.x + endPoint.x) / 2;
      const midY = (startPoint.y + endPoint.y) / 2;
      const label = new Text(`${result.realValue.toFixed(2)} m`, {
        left: midX,
        top: midY - 10,
        fontSize: 14,
        fill: 'red',
        backgroundColor: 'white',
        selectable: false,
        evented: false,
      });
      canvas.add(label);

      const measurement: Measurement = {
        id: crypto.randomUUID(),
        type: 'line',
        points: [startPoint, endPoint],
        pixelValue: result.pixelValue,
        realValue: result.realValue,
        unit: result.unit,
        color: '#FF6B6B',
        label: `${result.realValue.toFixed(2)} m`,
        isDeduction: deductionMode,
        pageIndex,
        timestamp: new Date(),
      };

      onMeasurementComplete(measurement);
    } else if (activeTool === 'rectangle') {
      const result = calculateRectangleArea(startPoint, endPoint, pixelsPerUnit);
      
      // Create permanent rectangle
      const rect = new Rect({
        left: Math.min(startPoint.x, endPoint.x),
        top: Math.min(startPoint.y, endPoint.y),
        width: Math.abs(endPoint.x - startPoint.x),
        height: Math.abs(endPoint.y - startPoint.y),
        fill: 'rgba(76, 175, 80, 0.3)',
        stroke: 'green',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(rect);

      // Add label
      const centerX = (startPoint.x + endPoint.x) / 2;
      const centerY = (startPoint.y + endPoint.y) / 2;
      const label = new Text(`${result.realValue.toFixed(2)} m²`, {
        left: centerX - 30,
        top: centerY - 10,
        fontSize: 14,
        fill: 'green',
        backgroundColor: 'white',
        selectable: false,
        evented: false,
      });
      canvas.add(label);

      const measurement: Measurement = {
        id: crypto.randomUUID(),
        type: 'rectangle',
        points: [startPoint, endPoint],
        pixelValue: result.pixelValue,
        realValue: result.realValue,
        unit: result.unit,
        dimensions: result.dimensions,
        color: '#4CAF50',
        label: `${result.realValue.toFixed(2)} m²`,
        isDeduction: deductionMode,
        pageIndex,
        timestamp: new Date(),
      };

      onMeasurementComplete(measurement);
    } else if (activeTool === 'circle') {
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const radiusPixels = Math.sqrt(dx * dx + dy * dy);
      const radiusMeters = radiusPixels / pixelsPerUnit;
      const areaM2 = Math.PI * radiusMeters * radiusMeters;
      
      // Create permanent circle
      const circle = new Circle({
        left: startPoint.x - radiusPixels,
        top: startPoint.y - radiusPixels,
        radius: radiusPixels,
        fill: 'rgba(156, 39, 176, 0.3)',
        stroke: 'purple',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(circle);

      // Add label
      const label = new Text(`${areaM2.toFixed(2)} m²`, {
        left: startPoint.x - 30,
        top: startPoint.y - 10,
        fontSize: 14,
        fill: 'purple',
        backgroundColor: 'white',
        selectable: false,
        evented: false,
      });
      canvas.add(label);

      const measurement: Measurement = {
        id: crypto.randomUUID(),
        type: 'circle',
        points: [startPoint, endPoint],
        pixelValue: Math.PI * radiusPixels * radiusPixels,
        realValue: areaM2,
        unit: 'M2',
        color: '#9C27B0',
        label: `${areaM2.toFixed(2)} m²`,
        isDeduction: deductionMode,
        pageIndex,
        timestamp: new Date(),
      };

      onMeasurementComplete(measurement);
    }

    setIsDrawing(false);
    setStartPoint(null);
    canvas.requestRenderAll();
  };

  // Handle double click to close polygon
  const handleDoubleClick = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || activeTool !== 'polygon' || polygonPoints.length < 3 || !pixelsPerUnit) return;

    const result = calculatePolygonArea(polygonPoints, pixelsPerUnit);
    
    // Create permanent polygon
    const fabricPoints = polygonPoints.map(p => new FabricPoint(p.x, p.y));
    const polygon = new Polygon(fabricPoints, {
      fill: 'rgba(76, 175, 80, 0.3)',
      stroke: 'green',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    canvas.add(polygon);

    // Add label at centroid
    const centroid = calculateCentroid(polygonPoints);
    const label = new Text(`${result.realValue.toFixed(2)} m²`, {
      left: centroid.x - 30,
      top: centroid.y - 10,
      fontSize: 14,
      fill: 'green',
      backgroundColor: 'white',
      selectable: false,
      evented: false,
    });
    canvas.add(label);

    // Clean up markers and lines
    polygonMarkers.forEach(marker => canvas.remove(marker));
    polygonLines.forEach(line => canvas.remove(line));
    setPolygonMarkers([]);
    setPolygonLines([]);

    const measurement: Measurement = {
      id: crypto.randomUUID(),
      type: 'polygon',
      points: polygonPoints,
      pixelValue: result.pixelValue,
      realValue: result.realValue,
      unit: result.unit,
      color: '#4CAF50',
      label: `${result.realValue.toFixed(2)} m²`,
      isDeduction: deductionMode,
      pageIndex,
      timestamp: new Date(),
    };

    onMeasurementComplete(measurement);
    setPolygonPoints([]);
    canvas.requestRenderAll();
  };

  // Attach event handlers
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
  }, [
    activeTool,
    isCalibrated,
    pixelsPerUnit,
    calibrationMode,
    startPoint,
    isDrawing,
    previewShape,
    polygonPoints,
    polygonMarkers,
    polygonLines,
    isPanning,
    lastClientPos,
    calibrationPoints,
    calibrationObjects,
  ]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-muted rounded-lg">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <p className="text-destructive">{error}</p>
        </div>
      )}
      <canvas ref={canvasRef} />
    </div>
  );
};
