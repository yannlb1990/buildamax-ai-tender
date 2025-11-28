import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, FabricImage, Circle, Line, Rect, Polygon, Text, Point as FabricPoint } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';
import { WorldPoint, ViewPoint, Transform, PDFViewportData, Measurement, ToolType } from '@/lib/takeoff/types';
import { calculateLinearWorld, calculateRectangleAreaWorld, calculatePolygonAreaWorld, calculateCentroidWorld, calculateCircleAreaWorld } from '@/lib/takeoff/calculations';
import { viewToWorld, worldToView } from '@/lib/takeoff/coordinates';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface InteractiveCanvasProps {
  pdfUrl: string | null;
  pageIndex: number;
  transform: Transform;
  activeTool: ToolType;
  isCalibrated: boolean;
  unitsPerMetre: number | null;
  calibrationMode: 'preset' | 'manual' | null;
  deductionMode: boolean;
  selectedColor?: string;
  onMeasurementComplete: (measurement: Measurement) => void;
  onCalibrationPointsSet: (points: [WorldPoint, WorldPoint]) => void;
  onTransformChange: (transform: Partial<Transform>) => void;
  onViewportReady: (viewport: PDFViewportData) => void;
}

export const InteractiveCanvas = ({
  pdfUrl,
  pageIndex,
  transform,
  activeTool,
  isCalibrated,
  unitsPerMetre,
  calibrationMode,
  deductionMode,
  onMeasurementComplete,
  onCalibrationPointsSet,
  onTransformChange,
  onViewportReady,
}: InteractiveCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<PDFViewportData | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<WorldPoint | null>(null);
  const [previewShape, setPreviewShape] = useState<any>(null);
  const [polygonPoints, setPolygonPoints] = useState<WorldPoint[]>([]);
  const [polygonMarkers, setPolygonMarkers] = useState<Circle[]>([]);
  const [polygonLines, setPolygonLines] = useState<Line[]>([]);

  // Calibration state
  const [calibrationPoints, setCalibrationPoints] = useState<WorldPoint[]>([]);
  const [calibrationObjects, setCalibrationObjects] = useState<any[]>([]);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [lastClientPos, setLastClientPos] = useState<{ x: number; y: number } | null>(null);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!containerRef.current || fabricCanvasRef.current) return;

    // Create canvas element inside the container - use container dimensions
    const containerWidth = containerRef.current.clientWidth || 1200;
    const containerHeight = containerRef.current.clientHeight || 800;
    
    const canvasElement = document.createElement('canvas');
    canvasElement.width = containerWidth;
    canvasElement.height = containerHeight;
    containerRef.current.appendChild(canvasElement);
    canvasRef.current = canvasElement;

    const canvas = new FabricCanvas(canvasElement, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: '#f5f5f5',
      selection: false,
    });

    fabricCanvasRef.current = canvas;

    return () => {
      canvas.dispose();
      if (containerRef.current && canvasElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(canvasElement);
      }
      fabricCanvasRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  // Load PDF page
  useEffect(() => {
    if (!pdfUrl || !fabricCanvasRef.current) return;

    const loadPDF = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('Loading PDF from:', pdfUrl);
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(pageIndex + 1);

        // CRITICAL: Render at base scale 1.0 - let zoom handle all scaling
        const baseViewport = page.getViewport({ scale: 1.0, rotation: transform.rotation });
        
        console.log('PDF viewport:', { 
          baseWidth: baseViewport.width, 
          baseHeight: baseViewport.height
        });

        const pdfViewport: PDFViewportData = {
          width: baseViewport.width,
          height: baseViewport.height,
          scale: 1.0  // Always 1.0 - zoom handles display size
        };
        setViewport(pdfViewport);
        onViewportReady(pdfViewport);

        // Render at base scale 1.0
        const tempCanvas = document.createElement('canvas');
        const context = tempCanvas.getContext('2d');

        if (!context) throw new Error('Could not get canvas context');

        tempCanvas.width = baseViewport.width;
        tempCanvas.height = baseViewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: baseViewport,
          canvas: tempCanvas,
        };
        await page.render(renderContext).promise;

        const dataUrl = tempCanvas.toDataURL();
        const img = await FabricImage.fromURL(dataUrl);

        if (fabricCanvasRef.current) {
          // Resize Fabric canvas to base PDF dimensions
          fabricCanvasRef.current.setWidth(baseViewport.width);
          fabricCanvasRef.current.setHeight(baseViewport.height);
          
          // Update the background image
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
  }, [pdfUrl, pageIndex, transform.rotation, onViewportReady]);

  // Apply zoom and pan transforms - SINGLE SOURCE OF TRUTH
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    
    // ONLY use viewportTransform (never setZoom to avoid double application)
    canvas.viewportTransform = [
      transform.zoom, 0, 0, 
      transform.zoom, 
      transform.panX, 
      transform.panY
    ];
    
    canvas.requestRenderAll();
  }, [transform.zoom, transform.panX, transform.panY]);

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

  // Handle mouse wheel zoom - ONLY update state, useEffect applies it
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      let newZoom = transform.zoom - delta / 1000;
      newZoom = Math.max(0.1, Math.min(5, newZoom));

      // ONLY update state - the transform useEffect will apply it
      onTransformChange({ zoom: newZoom });
    };

    const canvasElement = canvas.getElement();
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvasElement.removeEventListener('wheel', handleWheel);
    };
  }, [onTransformChange, transform.zoom]);

  // Handle calibration click
  const handleCalibrationClick = (worldPoint: WorldPoint) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport) return;
    
    // Convert to view coordinates for rendering
    const viewPoint = worldToView(worldPoint, transform, viewport);

    const newPoints = [...calibrationPoints, worldPoint];
    const newObjects = [...calibrationObjects];
    
    // Add marker (using view coordinates)
    const marker = new Circle({
      left: viewPoint.x - 5,
      top: viewPoint.y - 5,
      radius: 5,
      fill: 'red',
      stroke: 'white',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    canvas.add(marker);
    newObjects.push(marker);

    // Add label (using view coordinates)
    const label = new Text(newPoints.length === 1 ? 'A' : 'B', {
      left: viewPoint.x + 10,
      top: viewPoint.y - 10,
      fontSize: 16,
      fill: 'red',
      fontWeight: 'bold',
      selectable: false,
      evented: false,
    });
    canvas.add(label);
    newObjects.push(label);

    if (newPoints.length === 2) {
      // Draw line between points (using view coordinates)
      const view1 = worldToView(newPoints[0], transform, viewport);
      const view2 = worldToView(newPoints[1], transform, viewport);
      const line = new Line([view1.x, view1.y, view2.x, view2.y], {
        stroke: 'red',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
      canvas.add(line);
      newObjects.push(line);
      
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
    if (!canvas || !viewport) return;

    const pointer = canvas.getPointer(e.e, true);
    const viewPoint: ViewPoint = { x: pointer.x, y: pointer.y };
    
    // Convert to world coordinates
    const worldPoint = viewToWorld(viewPoint, transform, viewport);

    // Handle calibration
    if (calibrationMode === 'manual' && !isCalibrated) {
      handleCalibrationClick(worldPoint);
      return;
    }

    // Handle pan
    if (activeTool === 'pan' || !activeTool) {
      setIsPanning(true);
      setLastClientPos({ x: e.e.clientX, y: e.e.clientY });
      canvas.defaultCursor = 'grabbing';
      return;
    }

    // Allow measurements even without calibration - just warn
    if (!isCalibrated) {
      console.warn('Measurement made without calibration - values will be in pixels');
    }

    setIsDrawing(true);
    setStartPoint(worldPoint);

    // Handle count tool (single click)
    if (activeTool === 'count') {
      const marker = new Circle({
        left: viewPoint.x - 4,
        top: viewPoint.y - 4,
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
        worldPoints: [worldPoint],
        worldValue: 1,
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
      const newPoints = [...polygonPoints, worldPoint];
      
      // Add point marker (using view coordinates)
      const marker = new Circle({
        left: viewPoint.x - 3,
        top: viewPoint.y - 3,
        radius: 3,
        fill: 'green',
        stroke: 'white',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      canvas.add(marker);
      setPolygonMarkers([...polygonMarkers, marker]);

      // Add line from previous point (using view coordinates)
      if (newPoints.length > 1) {
        const prevWorld = newPoints[newPoints.length - 2];
        const prevView = worldToView(prevWorld, transform, viewport);
        const line = new Line([prevView.x, prevView.y, viewPoint.x, viewPoint.y], {
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
    if (!canvas || !viewport) return;

    // Handle panning (use client coordinates, not canvas pointer)
    if (isPanning && lastClientPos) {
      const deltaX = e.e.clientX - lastClientPos.x;
      const deltaY = e.e.clientY - lastClientPos.y;
      
      onTransformChange({ 
        panX: transform.panX + deltaX,
        panY: transform.panY + deltaY
      });
      
      setLastClientPos({ x: e.e.clientX, y: e.e.clientY });
      return;
    }

    // Allow preview even without calibration
    if (!isDrawing || !startPoint) return;

    const pointer = canvas.getPointer(e.e, true);
    const currentViewPoint: ViewPoint = { x: pointer.x, y: pointer.y };

    // Remove previous preview
    if (previewShape) {
      canvas.remove(previewShape);
    }

    let shape: any = null;

    // Convert startPoint (world) to view for preview
    const viewStart = worldToView(startPoint, transform, viewport);
    const color = isCalibrated ? 'red' : 'orange';

    // Update preview shape using view coordinates
    if (activeTool === 'line') {
      shape = new Line([viewStart.x, viewStart.y, currentViewPoint.x, currentViewPoint.y], {
        stroke: color,
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
    } else if (activeTool === 'rectangle') {
      shape = new Rect({
        left: Math.min(viewStart.x, currentViewPoint.x),
        top: Math.min(viewStart.y, currentViewPoint.y),
        width: Math.abs(currentViewPoint.x - viewStart.x),
        height: Math.abs(currentViewPoint.y - viewStart.y),
        fill: isCalibrated ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
        stroke: isCalibrated ? 'green' : 'orange',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
    } else if (activeTool === 'circle') {
      const dx = currentViewPoint.x - viewStart.x;
      const dy = currentViewPoint.y - viewStart.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      
      shape = new Circle({
        left: viewStart.x - radius,
        top: viewStart.y - radius,
        radius: radius,
        fill: isCalibrated ? 'rgba(156, 39, 176, 0.2)' : 'rgba(255, 152, 0, 0.2)',
        stroke: isCalibrated ? 'purple' : 'orange',
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

    if (!isDrawing || !startPoint || !viewport) return;

    const pointer = canvas.getPointer(e.e, true);
    const viewEndPoint: ViewPoint = { x: pointer.x, y: pointer.y };
    const worldEndPoint = viewToWorld(viewEndPoint, transform, viewport);

    // Remove preview shape
    if (previewShape) {
      canvas.remove(previewShape);
      setPreviewShape(null);
    }

    // Complete measurement based on tool
    if (activeTool === 'line') {
      const result = calculateLinearWorld(startPoint, worldEndPoint, unitsPerMetre || 1);
      
      // Create permanent line (using view coordinates)
      const viewStart = worldToView(startPoint, transform, viewport);
      const viewEnd = worldToView(worldEndPoint, transform, viewport);
      const line = new Line([viewStart.x, viewStart.y, viewEnd.x, viewEnd.y], {
        stroke: isCalibrated ? 'red' : 'orange',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(line);

      // Add label (using view coordinates)
      const midX = (viewStart.x + viewEnd.x) / 2;
      const midY = (viewStart.y + viewEnd.y) / 2;
      const displayValue = isCalibrated ? result.realValue : result.worldValue;
      const displayUnit = isCalibrated ? 'm' : 'uncal';
      const labelText = isCalibrated ? `${displayValue.toFixed(2)} m` : `${displayValue.toFixed(0)} px`;
      const label = new Text(labelText, {
        left: midX,
        top: midY - 10,
        fontSize: 14,
        fill: isCalibrated ? 'red' : 'orange',
        backgroundColor: 'white',
        selectable: false,
        evented: false,
      });
      canvas.add(label);

      const measurement: Measurement = {
        id: crypto.randomUUID(),
        type: 'line',
        worldPoints: [startPoint, worldEndPoint],
        worldValue: result.worldValue,
        realValue: isCalibrated ? result.realValue : result.worldValue,
        unit: isCalibrated ? 'LM' : 'LM',  // Always use LM, but realValue will be uncalibrated
        color: isCalibrated ? '#FF6B6B' : '#FF9800',
        label: labelText,
        isDeduction: deductionMode,
        pageIndex,
        timestamp: new Date(),
      };

      onMeasurementComplete(measurement);
    } else if (activeTool === 'rectangle') {
      const result = calculateRectangleAreaWorld(startPoint, worldEndPoint, unitsPerMetre || 1);
      
      // Create permanent rectangle (using view coordinates)
      const viewStart = worldToView(startPoint, transform, viewport);
      const viewEnd = worldToView(worldEndPoint, transform, viewport);
      const rect = new Rect({
        left: Math.min(viewStart.x, viewEnd.x),
        top: Math.min(viewStart.y, viewEnd.y),
        width: Math.abs(viewEnd.x - viewStart.x),
        height: Math.abs(viewEnd.y - viewStart.y),
        fill: isCalibrated ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)',
        stroke: isCalibrated ? 'green' : 'orange',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(rect);

      // Add label (using view coordinates)
      const centerX = (viewStart.x + viewEnd.x) / 2;
      const centerY = (viewStart.y + viewEnd.y) / 2;
      const displayValue = isCalibrated ? result.realValue : result.worldValue;
      const labelText = isCalibrated ? `${displayValue.toFixed(2)} m²` : `${displayValue.toFixed(0)} px²`;
      const label = new Text(labelText, {
        left: centerX - 30,
        top: centerY - 10,
        fontSize: 14,
        fill: isCalibrated ? 'green' : 'orange',
        backgroundColor: 'white',
        selectable: false,
        evented: false,
      });
      canvas.add(label);

      const measurement: Measurement = {
        id: crypto.randomUUID(),
        type: 'rectangle',
        worldPoints: [startPoint, worldEndPoint],
        worldValue: result.worldValue,
        realValue: isCalibrated ? result.realValue : result.worldValue,
        unit: isCalibrated ? 'M2' : 'M2',  // Always use M2, but realValue will be uncalibrated
        dimensions: result.dimensions,
        color: isCalibrated ? '#4CAF50' : '#FF9800',
        label: labelText,
        isDeduction: deductionMode,
        pageIndex,
        timestamp: new Date(),
      };

      onMeasurementComplete(measurement);
    } else if (activeTool === 'circle') {
      // Handle uncalibrated case
      const effectiveUnits = unitsPerMetre || 1;
      const result = calculateCircleAreaWorld(startPoint, worldEndPoint, effectiveUnits);
      
      // Create permanent circle (using view coordinates)
      const viewStart = worldToView(startPoint, transform, viewport);
      const viewEnd = worldToView(worldEndPoint, transform, viewport);
      const dx = viewEnd.x - viewStart.x;
      const dy = viewEnd.y - viewStart.y;
      const radiusPixels = Math.sqrt(dx * dx + dy * dy);
      
      const circle = new Circle({
        left: viewStart.x - radiusPixels,
        top: viewStart.y - radiusPixels,
        radius: radiusPixels,
        fill: isCalibrated ? 'rgba(156, 39, 176, 0.3)' : 'rgba(255, 152, 0, 0.3)',
        stroke: isCalibrated ? 'purple' : 'orange',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(circle);

      // Add label (using view coordinates)
      const displayValue = isCalibrated ? result.realValue : result.worldValue;
      const labelText = isCalibrated ? `${displayValue.toFixed(2)} m²` : `${displayValue.toFixed(0)} px²`;
      const label = new Text(labelText, {
        left: viewStart.x - 30,
        top: viewStart.y - 10,
        fontSize: 14,
        fill: isCalibrated ? 'purple' : 'orange',
        backgroundColor: 'white',
        selectable: false,
        evented: false,
      });
      canvas.add(label);

      const measurement: Measurement = {
        id: crypto.randomUUID(),
        type: 'circle',
        worldPoints: [startPoint, worldEndPoint],
        worldValue: result.worldValue,
        realValue: isCalibrated ? result.realValue : result.worldValue,
        unit: isCalibrated ? 'M2' : 'M2',
        color: isCalibrated ? '#9C27B0' : '#FF9800',
        label: labelText,
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
    if (!canvas || activeTool !== 'polygon' || polygonPoints.length < 3 || !viewport) return;

    // Handle uncalibrated case
    const effectiveUnits = unitsPerMetre || 1;
    const result = calculatePolygonAreaWorld(polygonPoints, effectiveUnits);
    
    // Create permanent polygon (using view coordinates)
    const viewPoints = polygonPoints.map(wp => {
      const vp = worldToView(wp, transform, viewport);
      return new FabricPoint(vp.x, vp.y);
    });
    const polygon = new Polygon(viewPoints, {
      fill: isCalibrated ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)',
      stroke: isCalibrated ? 'green' : 'orange',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    canvas.add(polygon);

    // Add label at centroid (using view coordinates)
    const worldCentroid = calculateCentroidWorld(polygonPoints);
    const viewCentroid = worldToView(worldCentroid, transform, viewport);
    const displayValue = isCalibrated ? result.realValue : result.worldValue;
    const labelText = isCalibrated ? `${displayValue.toFixed(2)} m²` : `${displayValue.toFixed(0)} px²`;
    const label = new Text(labelText, {
      left: viewCentroid.x - 30,
      top: viewCentroid.y - 10,
      fontSize: 14,
      fill: isCalibrated ? 'green' : 'orange',
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
      worldPoints: polygonPoints,
      worldValue: result.worldValue,
      realValue: isCalibrated ? result.realValue : result.worldValue,
      unit: isCalibrated ? 'M2' : 'M2',
      color: isCalibrated ? '#4CAF50' : '#FF9800',
      label: labelText,
      isDeduction: deductionMode,
      pageIndex,
      timestamp: new Date(),
    });

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
    unitsPerMetre,
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
    <div className="relative w-full min-h-[600px] h-full flex items-center justify-center bg-muted rounded-lg">
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
      {!isCalibrated && activeTool && activeTool !== 'pan' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-md text-sm font-medium z-10 shadow-lg">
          ⚠️ Set scale first for accurate measurements (currently showing pixel values)
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
