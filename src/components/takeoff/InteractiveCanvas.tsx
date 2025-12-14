import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, Circle, Line, Rect, Polygon, Text, Point as FabricPoint } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';
import { WorldPoint, ViewPoint, Transform, PDFViewportData, Measurement, ToolType } from '@/lib/takeoff/types';
import { calculateLinearWorld, calculateRectangleAreaWorld, calculatePolygonAreaWorld, calculateCentroidWorld, calculateCircleAreaWorld } from '@/lib/takeoff/calculations';
import { viewToWorld } from '@/lib/takeoff/coordinates';

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

  // Initialize Fabric canvas - SIZE TO CONTAINER with ResizeObserver
  useEffect(() => {
    if (!containerRef.current || fabricCanvasRef.current) return;

    const container = containerRef.current;
    
    // Get initial size with minimum fallback
    const getContainerSize = () => ({
      width: Math.max(container.clientWidth || 0, 800),
      height: Math.max(container.clientHeight || 0, 600)
    });

    const { width: initialWidth, height: initialHeight } = getContainerSize();
    
    const canvasElement = document.createElement('canvas');
    canvasElement.width = initialWidth;
    canvasElement.height = initialHeight;
    container.appendChild(canvasElement);
    canvasRef.current = canvasElement;

    const canvas = new FabricCanvas(canvasElement, {
      width: initialWidth,
      height: initialHeight,
      backgroundColor: '#f5f5f5',
      selection: false,
    });

    fabricCanvasRef.current = canvas;

    // ResizeObserver for dynamic container sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (fabricCanvasRef.current && width > 0 && height > 0) {
          const newWidth = Math.max(width, 800);
          const newHeight = Math.max(height, 600);
          fabricCanvasRef.current.setWidth(newWidth);
          fabricCanvasRef.current.setHeight(newHeight);
          fabricCanvasRef.current.requestRenderAll();
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      if (container && canvasElement.parentNode === container) {
        container.removeChild(canvasElement);
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

        // Render PDF at base scale 1.0 - zoom handled via viewportTransform
        const baseViewport = page.getViewport({ scale: 1.0, rotation: transform.rotation });
        
        console.log('PDF base viewport:', { 
          width: baseViewport.width, 
          height: baseViewport.height
        });

        const pdfViewport: PDFViewportData = {
          width: baseViewport.width,
          height: baseViewport.height,
          scale: 1.0
        };
        setViewport(pdfViewport);
        onViewportReady(pdfViewport);

        // Render PDF to temp canvas at base scale
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
          // Set PDF as background image at origin (0,0)
          // Canvas stays at container size, PDF positioned at origin
          img.set({
            left: 0,
            top: 0,
            originX: 'left',
            originY: 'top',
          });
          
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
    
    // Apply viewportTransform for zoom and pan
    // [scaleX, skewY, skewX, scaleY, translateX, translateY]
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

  // Handle mouse wheel zoom
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      let newZoom = transform.zoom - delta / 1000;
      newZoom = Math.max(0.1, Math.min(5, newZoom));

      // Update state - the transform useEffect will apply it
      onTransformChange({ zoom: newZoom });
    };

    const canvasElement = canvas.getElement();
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvasElement.removeEventListener('wheel', handleWheel);
    };
  }, [onTransformChange, transform.zoom]);

  // Handle calibration click
  const handleCalibrationClick = useCallback((worldPoint: WorldPoint) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport) return;

    const newPoints = [...calibrationPoints, worldPoint];
    const newObjects = [...calibrationObjects];
    
    // Draw at WORLD coordinates - viewportTransform handles zoom/pan
    const marker = new Circle({
      left: worldPoint.x - 5,
      top: worldPoint.y - 5,
      radius: 5,
      fill: 'red',
      stroke: 'white',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    canvas.add(marker);
    newObjects.push(marker);

    // Add label at WORLD position
    const label = new Text(newPoints.length === 1 ? 'A' : 'B', {
      left: worldPoint.x + 10,
      top: worldPoint.y - 10,
      fontSize: 16,
      fill: 'red',
      fontWeight: 'bold',
      selectable: false,
      evented: false,
    });
    canvas.add(label);
    newObjects.push(label);

    if (newPoints.length === 2) {
      // Draw line at WORLD positions
      const line = new Line([newPoints[0].x, newPoints[0].y, newPoints[1].x, newPoints[1].y], {
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
  }, [calibrationPoints, calibrationObjects, viewport, onCalibrationPointsSet]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport) return;

    // CRITICAL FIX: Use getPointer(e.e, false) for scene coordinates
    // This returns coordinates that account for viewportTransform
    const pointer = canvas.getPointer(e.e, false);
    const viewPoint: ViewPoint = { x: pointer.x, y: pointer.y };
    
    // Convert to world coordinates for storage
    const worldPoint = viewToWorld(viewPoint, transform, viewport);

    console.log('Mouse down:', { 
      raw: pointer, 
      world: worldPoint, 
      zoom: transform.zoom,
      pan: { x: transform.panX, y: transform.panY }
    });

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

    // Allow measurements even without calibration
    if (!isCalibrated) {
      console.warn('Measurement made without calibration - values will be in pixels');
    }

    setIsDrawing(true);
    setStartPoint(worldPoint);

    // Handle count tool (single click)
    if (activeTool === 'count') {
      // Draw at WORLD coordinates
      const marker = new Circle({
        left: worldPoint.x - 4,
        top: worldPoint.y - 4,
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
        pageIndex: pageIndex,
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
      
      // Draw point marker at WORLD position
      const marker = new Circle({
        left: worldPoint.x - 3,
        top: worldPoint.y - 3,
        radius: 3,
        fill: 'green',
        stroke: 'white',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      canvas.add(marker);
      setPolygonMarkers([...polygonMarkers, marker]);

      // Add line from previous point at WORLD positions
      if (newPoints.length > 1) {
        const prevWorld = newPoints[newPoints.length - 2];
        const line = new Line([prevWorld.x, prevWorld.y, worldPoint.x, worldPoint.y], {
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
  }, [
    viewport, transform, calibrationMode, isCalibrated, activeTool, 
    polygonPoints, polygonMarkers, polygonLines, pageIndex,
    handleCalibrationClick, onMeasurementComplete
  ]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport) return;

    // Handle panning (use client coordinates for smooth panning)
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

    // CRITICAL FIX: Use getPointer(e.e, false) for scene coordinates
    const pointer = canvas.getPointer(e.e, false);
    const currentWorldPoint: WorldPoint = viewToWorld(
      { x: pointer.x, y: pointer.y }, 
      transform, 
      viewport
    );

    // Remove previous preview
    if (previewShape) {
      canvas.remove(previewShape);
    }

    let shape: any = null;
    const color = isCalibrated ? 'red' : 'orange';

    // Draw preview shapes at WORLD coordinates - viewportTransform handles zoom/pan
    if (activeTool === 'line') {
      shape = new Line([startPoint.x, startPoint.y, currentWorldPoint.x, currentWorldPoint.y], {
        stroke: color,
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
    } else if (activeTool === 'rectangle') {
      shape = new Rect({
        left: Math.min(startPoint.x, currentWorldPoint.x),
        top: Math.min(startPoint.y, currentWorldPoint.y),
        width: Math.abs(currentWorldPoint.x - startPoint.x),
        height: Math.abs(currentWorldPoint.y - startPoint.y),
        fill: isCalibrated ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
        stroke: isCalibrated ? 'green' : 'orange',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
    } else if (activeTool === 'circle') {
      const dx = currentWorldPoint.x - startPoint.x;
      const dy = currentWorldPoint.y - startPoint.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      
      shape = new Circle({
        left: startPoint.x - radius,
        top: startPoint.y - radius,
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
  }, [
    viewport, transform, isPanning, lastClientPos, isDrawing, startPoint, 
    previewShape, activeTool, isCalibrated, onTransformChange
  ]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: any) => {
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

    // CRITICAL FIX: Use getPointer(e.e, false) for scene coordinates
    const pointer = canvas.getPointer(e.e, false);
    const worldEndPoint = viewToWorld({ x: pointer.x, y: pointer.y }, transform, viewport);

    // Remove preview shape
    if (previewShape) {
      canvas.remove(previewShape);
      setPreviewShape(null);
    }

    // Complete measurement based on tool
    if (activeTool === 'line') {
      const effectiveUnits = unitsPerMetre || 1;
      const result = calculateLinearWorld(startPoint, worldEndPoint, effectiveUnits);
      
      // Draw at WORLD coordinates - viewportTransform handles zoom/pan
      const line = new Line([startPoint.x, startPoint.y, worldEndPoint.x, worldEndPoint.y], {
        stroke: isCalibrated ? 'red' : 'orange',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(line);

      // Add label at WORLD position
      const midX = (startPoint.x + worldEndPoint.x) / 2;
      const midY = (startPoint.y + worldEndPoint.y) / 2;
      const displayValue = isCalibrated ? result.realValue : result.worldValue;
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
        unit: 'LM',
        color: isCalibrated ? '#FF6B6B' : '#FF9800',
        label: labelText,
        isDeduction: deductionMode,
        pageIndex: pageIndex,
        timestamp: new Date(),
      };

      onMeasurementComplete(measurement);
    } else if (activeTool === 'rectangle') {
      const effectiveUnits = unitsPerMetre || 1;
      const result = calculateRectangleAreaWorld(startPoint, worldEndPoint, effectiveUnits);
      
      // Draw at WORLD coordinates
      const rect = new Rect({
        left: Math.min(startPoint.x, worldEndPoint.x),
        top: Math.min(startPoint.y, worldEndPoint.y),
        width: Math.abs(worldEndPoint.x - startPoint.x),
        height: Math.abs(worldEndPoint.y - startPoint.y),
        fill: isCalibrated ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)',
        stroke: isCalibrated ? 'green' : 'orange',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(rect);

      // Add label at WORLD position
      const centerX = (startPoint.x + worldEndPoint.x) / 2;
      const centerY = (startPoint.y + worldEndPoint.y) / 2;
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
        unit: 'M2',
        dimensions: result.dimensions,
        color: isCalibrated ? '#4CAF50' : '#FF9800',
        label: labelText,
        isDeduction: deductionMode,
        pageIndex: pageIndex,
        timestamp: new Date(),
      };

      onMeasurementComplete(measurement);
    } else if (activeTool === 'circle') {
      const effectiveUnits = unitsPerMetre || 1;
      const result = calculateCircleAreaWorld(startPoint, worldEndPoint, effectiveUnits);
      
      // Calculate radius in WORLD coords
      const dx = worldEndPoint.x - startPoint.x;
      const dy = worldEndPoint.y - startPoint.y;
      const radiusWorld = Math.sqrt(dx * dx + dy * dy);
      
      // Draw at WORLD coordinates
      const circle = new Circle({
        left: startPoint.x - radiusWorld,
        top: startPoint.y - radiusWorld,
        radius: radiusWorld,
        fill: isCalibrated ? 'rgba(156, 39, 176, 0.3)' : 'rgba(255, 152, 0, 0.3)',
        stroke: isCalibrated ? 'purple' : 'orange',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(circle);

      // Add label at WORLD position
      const displayValue = isCalibrated ? result.realValue : result.worldValue;
      const labelText = isCalibrated ? `${displayValue.toFixed(2)} m²` : `${displayValue.toFixed(0)} px²`;
      const label = new Text(labelText, {
        left: startPoint.x - 30,
        top: startPoint.y - 10,
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
        unit: 'M2',
        color: isCalibrated ? '#9C27B0' : '#FF9800',
        label: labelText,
        isDeduction: deductionMode,
        pageIndex: pageIndex,
        timestamp: new Date(),
      };

      onMeasurementComplete(measurement);
    }

    setIsDrawing(false);
    setStartPoint(null);
    canvas.requestRenderAll();
  }, [
    viewport, transform, isPanning, isDrawing, startPoint, previewShape,
    activeTool, isCalibrated, unitsPerMetre, deductionMode, pageIndex,
    onMeasurementComplete
  ]);

  // Handle double click to close polygon
  const handleDoubleClick = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || activeTool !== 'polygon' || polygonPoints.length < 3 || !viewport) return;

    const effectiveUnits = unitsPerMetre || 1;
    const result = calculatePolygonAreaWorld(polygonPoints, effectiveUnits);
    
    // Draw polygon at WORLD coordinates
    const worldPointsFabric = polygonPoints.map(wp => new FabricPoint(wp.x, wp.y));
    const polygon = new Polygon(worldPointsFabric, {
      fill: isCalibrated ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)',
      stroke: isCalibrated ? 'green' : 'orange',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    canvas.add(polygon);

    // Add label at WORLD centroid
    const worldCentroid = calculateCentroidWorld(polygonPoints);
    const displayValue = isCalibrated ? result.realValue : result.worldValue;
    const labelText = isCalibrated ? `${displayValue.toFixed(2)} m²` : `${displayValue.toFixed(0)} px²`;
    const label = new Text(labelText, {
      left: worldCentroid.x - 30,
      top: worldCentroid.y - 10,
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
      unit: 'M2',
      color: isCalibrated ? '#4CAF50' : '#FF9800',
      label: labelText,
      isDeduction: deductionMode,
      pageIndex: pageIndex,
      timestamp: new Date(),
    };

    onMeasurementComplete(measurement);
    setPolygonPoints([]);
    canvas.requestRenderAll();
  }, [
    viewport, transform, activeTool, polygonPoints, polygonMarkers, polygonLines,
    isCalibrated, unitsPerMetre, deductionMode, pageIndex, onMeasurementComplete
  ]);

  // Attach event handlers with ALL dependencies
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
    <div className="relative w-full min-h-[600px] h-full flex items-center justify-center bg-muted rounded-lg overflow-hidden">
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
