import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, Circle, Line, Rect, Polygon, Text, Point as FabricPoint, FabricObject } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorldPoint, ViewPoint, Transform, PDFViewportData, Measurement, ToolType, EnhancedMeasurement } from '@/lib/takeoff/types';
import { calculateLinearWorld, calculateRectangleAreaWorld, calculatePolygonPerimeterWorld, calculateCentroidWorld, calculateCircleAreaWorld, formatPerimeter } from '@/lib/takeoff/calculations';
import { viewToWorld } from '@/lib/takeoff/coordinates';
import { toast } from 'sonner';

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
  selectedColor?: string;
  selectedMeasurementId?: string | null;
  measurements?: Measurement[];
  onMeasurementComplete: (measurement: Measurement) => void;
  onMeasurementUpdate?: (id: string, updates: Partial<Measurement>) => void;
  onCalibrationPointsSet: (points: [WorldPoint, WorldPoint]) => void;
  onTransformChange: (transform: Partial<Transform>) => void;
  onViewportReady: (viewport: PDFViewportData) => void;
  onDeleteLastMeasurement?: () => void;
  onDeleteMeasurement?: (id: string) => void; // FIX #2: Delete specific measurement
  onSelectMeasurement?: (id: string | null) => void;
}

export const InteractiveCanvas = ({
  pdfUrl,
  pageIndex,
  transform,
  activeTool,
  isCalibrated,
  unitsPerMetre,
  calibrationMode,
  selectedMeasurementId,
  measurements = [],
  onMeasurementComplete,
  onMeasurementUpdate,
  onCalibrationPointsSet,
  onTransformChange,
  onViewportReady,
  onDeleteLastMeasurement,
  onDeleteMeasurement,
  onSelectMeasurement,
}: InteractiveCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<PDFViewportData | null>(null);

  // Measurement tracking - map measurementId to Fabric objects
  const measurementObjectsRef = useRef<Map<string, FabricObject[]>>(new Map());

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<WorldPoint | null>(null);
  const [previewShape, setPreviewShape] = useState<any>(null);
  const [polygonPoints, setPolygonPoints] = useState<WorldPoint[]>([]);
  const [polygonMarkers, setPolygonMarkers] = useState<Circle[]>([]);
  const [polygonLines, setPolygonLines] = useState<Line[]>([]);

  // Count tool state for grouped counting
  const [countMarkers, setCountMarkers] = useState<any[]>([]);
  const [countPoints, setCountPoints] = useState<WorldPoint[]>([]);

  // Vertex editing state
  const [vertexAnchors, setVertexAnchors] = useState<Circle[]>([]);
  const [midEdgeHandles, setMidEdgeHandles] = useState<Rect[]>([]);
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);

  // Calibration state - now supports drag-to-calibrate
  const [calibrationPoints, setCalibrationPoints] = useState<WorldPoint[]>([]);
  const [calibrationObjects, setCalibrationObjects] = useState<any[]>([]);
  const [isCalibrationDragging, setIsCalibrationDragging] = useState(false);
  const [calibrationStartPoint, setCalibrationStartPoint] = useState<WorldPoint | null>(null);
  const [calibrationPreviewLine, setCalibrationPreviewLine] = useState<any>(null);

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
  // Re-render measurements when transform changes for stability
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    
    // Apply viewportTransform for zoom and pan
    // [scaleX, skewY, skewX, scaleY, translateX, translateY]
    canvas.setViewportTransform([
      transform.zoom, 0, 0, 
      transform.zoom, 
      transform.panX, 
      transform.panY
    ]);
    
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

  // Zoom-aware sizes for consistent visual appearance
  const getZoomAwareSize = useCallback((baseSize: number) => {
    return baseSize / transform.zoom;
  }, [transform.zoom]);

  // Render a single measurement on the canvas
  const renderMeasurement = useCallback((measurement: Measurement) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const enhanced = measurement as EnhancedMeasurement;
    const isLocked = enhanced.locked ?? false;
    const isSelected = measurement.id === selectedMeasurementId;

    // Remove existing objects for this measurement
    const existingObjects = measurementObjectsRef.current.get(measurement.id);
    if (existingObjects) {
      existingObjects.forEach(obj => canvas.remove(obj));
    }

    const objects: FabricObject[] = [];
    const strokeWidth = getZoomAwareSize(2);
    const markerRadius = getZoomAwareSize(8);

    // Helper to create start marker (green circle)
    const createStartMarker = (point: WorldPoint) => {
      const marker = new Circle({
        left: point.x - markerRadius / 2,
        top: point.y - markerRadius / 2,
        radius: markerRadius / 2,
        fill: '#22c55e',
        stroke: 'white',
        strokeWidth: getZoomAwareSize(1),
        selectable: false,
        evented: false,
      });
      return marker;
    };

    // Helper to create end marker (red square)
    const createEndMarker = (point: WorldPoint) => {
      const size = markerRadius;
      const marker = new Rect({
        left: point.x - size / 2,
        top: point.y - size / 2,
        width: size,
        height: size,
        fill: '#ef4444',
        stroke: 'white',
        strokeWidth: getZoomAwareSize(1),
        selectable: false,
        evented: false,
      });
      return marker;
    };

    if (measurement.type === 'line' && measurement.worldPoints.length >= 2) {
      const p1 = measurement.worldPoints[0];
      const p2 = measurement.worldPoints[1];

      const line = new Line([p1.x, p1.y, p2.x, p2.y], {
        stroke: isSelected ? '#3b82f6' : measurement.color,
        strokeWidth: strokeWidth,
        selectable: !isLocked,
        evented: !isLocked,
        hasControls: !isLocked,
        hasBorders: !isLocked,
        lockRotation: true,
      });
      // Store measurement data as custom property
      (line as any).measurementId = measurement.id;
      (line as any).measurementType = 'line';
      objects.push(line);
      canvas.add(line);

      // Add start/end markers
      const startMarker = createStartMarker(p1);
      const endMarker = createEndMarker(p2);
      objects.push(startMarker, endMarker);
      canvas.add(startMarker);
      canvas.add(endMarker);

    } else if (measurement.type === 'rectangle' && measurement.worldPoints.length >= 2) {
      const p1 = measurement.worldPoints[0];
      const p2 = measurement.worldPoints[1];

      const rect = new Rect({
        left: Math.min(p1.x, p2.x),
        top: Math.min(p1.y, p2.y),
        width: Math.abs(p2.x - p1.x),
        height: Math.abs(p2.y - p1.y),
        fill: 'rgba(76, 175, 80, 0.2)',
        stroke: isSelected ? '#3b82f6' : measurement.color,
        strokeWidth: strokeWidth,
        selectable: !isLocked,
        evented: !isLocked,
        hasControls: !isLocked,
        hasBorders: !isLocked,
        lockRotation: true,
      });
      // Store measurement data as custom property
      (rect as any).measurementId = measurement.id;
      (rect as any).measurementType = 'rectangle';
      objects.push(rect);
      canvas.add(rect);

      // Add start/end markers at corners
      const startMarker = createStartMarker(p1);
      const endMarker = createEndMarker(p2);
      objects.push(startMarker, endMarker);
      canvas.add(startMarker);
      canvas.add(endMarker);

    } else if (measurement.type === 'circle' && measurement.unit === 'count') {
      // Count markers - larger size (2x)
      const countRadius = getZoomAwareSize(12);
      const fontSize = getZoomAwareSize(16);

      measurement.worldPoints.forEach((point, idx) => {
        const marker = new Circle({
          left: point.x - countRadius,
          top: point.y - countRadius,
          radius: countRadius,
          fill: 'orange',
          stroke: 'white',
          strokeWidth: getZoomAwareSize(3),
          selectable: false,
          evented: false,
        });
        objects.push(marker);
        canvas.add(marker);

        const label = new Text(String(idx + 1), {
          left: point.x - getZoomAwareSize(5),
          top: point.y - getZoomAwareSize(8),
          fontSize: fontSize,
          fill: 'white',
          fontWeight: 'bold',
          selectable: false,
          evented: false,
        });
        objects.push(label);
        canvas.add(label);
      });

    } else if (measurement.type === 'circle' && measurement.worldPoints.length >= 2) {
      const center = measurement.worldPoints[0];
      const edge = measurement.worldPoints[1];
      const dx = edge.x - center.x;
      const dy = edge.y - center.y;
      const radius = Math.sqrt(dx * dx + dy * dy);

      const circle = new Circle({
        left: center.x - radius,
        top: center.y - radius,
        radius: radius,
        fill: 'rgba(156, 39, 176, 0.2)',
        stroke: isSelected ? '#3b82f6' : measurement.color,
        strokeWidth: strokeWidth,
        selectable: !isLocked,
        evented: !isLocked,
        hasControls: !isLocked,
        hasBorders: !isLocked,
        lockRotation: true,
      });
      // Store measurement data as custom property
      (circle as any).measurementId = measurement.id;
      (circle as any).measurementType = 'circle';
      objects.push(circle);
      canvas.add(circle);

      // Green circle at center, red square at edge
      const centerMarker = createStartMarker(center);
      const edgeMarker = createEndMarker(edge);
      objects.push(centerMarker, edgeMarker);
      canvas.add(centerMarker);
      canvas.add(edgeMarker);

    } else if (measurement.type === 'polygon' && measurement.worldPoints.length >= 3) {
      const worldPointsFabric = measurement.worldPoints.map(wp => new FabricPoint(wp.x, wp.y));
      const polygon = new Polygon(worldPointsFabric, {
        fill: 'rgba(33, 150, 243, 0.2)',
        stroke: isSelected ? '#3b82f6' : measurement.color,
        strokeWidth: strokeWidth,
        selectable: !isLocked,
        evented: !isLocked,
        hasControls: !isLocked,
        hasBorders: !isLocked,
        lockRotation: true,
      });
      // Store measurement data as custom property
      (polygon as any).measurementId = measurement.id;
      (polygon as any).measurementType = 'polygon';
      objects.push(polygon);
      canvas.add(polygon);

      // Add vertex markers - green diamond for first, blue for others
      measurement.worldPoints.forEach((point, idx) => {
        const size = getZoomAwareSize(6);
        const marker = new Rect({
          left: point.x - size / 2,
          top: point.y - size / 2,
          width: size,
          height: size,
          fill: idx === 0 ? '#22c55e' : '#3b82f6',
          stroke: 'white',
          strokeWidth: getZoomAwareSize(1),
          angle: 45,
          selectable: false,
          evented: false,
        });
        objects.push(marker);
        canvas.add(marker);
      });
    }

    // Add lock indicator if locked
    if (isLocked && measurement.worldPoints.length > 0) {
      const firstPoint = measurement.worldPoints[0];
      const lockLabel = new Text('🔒', {
        left: firstPoint.x + getZoomAwareSize(10),
        top: firstPoint.y - getZoomAwareSize(10),
        fontSize: getZoomAwareSize(14),
        selectable: false,
        evented: false,
      });
      objects.push(lockLabel);
      canvas.add(lockLabel);
    }

    measurementObjectsRef.current.set(measurement.id, objects);
    canvas.requestRenderAll();
  }, [selectedMeasurementId, getZoomAwareSize]);

  // Render all measurements when they change - SINGLE useEffect handles all sync
  // (Removed duplicate deletion detection useEffect that caused race condition)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.log('🔄 RENDER: Canvas not ready');
      return;
    }

    const previouslyTracked = measurementObjectsRef.current.size;
    console.log('🔄 RENDER: Re-rendering all measurements', {
      totalMeasurements: measurements.length,
      currentPage: pageIndex,
      previouslyTracked
    });

    // Clear all existing measurement objects from canvas
    measurementObjectsRef.current.forEach((objects, id) => {
      console.log(`🧹 Clearing objects for: ${id} (${objects.length} objects)`);
      objects.forEach(obj => canvas.remove(obj));
    });
    measurementObjectsRef.current.clear();

    // Filter measurements for current page and render them
    const pageMeasurements = measurements.filter(m => m.pageIndex === pageIndex);
    console.log(`✏️ Rendering ${pageMeasurements.length} measurements on page ${pageIndex}`);
    
    pageMeasurements.forEach(m => {
      console.log(`  → Rendering: ${m.id} (${m.type}/${m.unit}) "${m.label || 'no label'}"`);
      renderMeasurement(m);
    });

    canvas.requestRenderAll();
    console.log('✅ Render complete');
  }, [measurements, pageIndex, renderMeasurement]);

  // Handle object:modified event for drag/resize
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !onMeasurementUpdate) return;

    const handleObjectModified = (e: any) => {
      const obj = e.target;
      const measurementId = obj.measurementId;
      const measurementType = obj.measurementType;
      if (!measurementId) return;

      let newWorldPoints: WorldPoint[] = [];

      if (measurementType === 'line') {
        // Line object has x1, y1, x2, y2
        newWorldPoints = [
          { x: obj.x1 + obj.left, y: obj.y1 + obj.top },
          { x: obj.x2 + obj.left, y: obj.y2 + obj.top },
        ];
      } else if (measurementType === 'rectangle') {
        // Rect - get corners after transformation
        const left = obj.left;
        const top = obj.top;
        const width = obj.width * obj.scaleX;
        const height = obj.height * obj.scaleY;
        newWorldPoints = [
          { x: left, y: top },
          { x: left + width, y: top + height },
        ];
      } else if (measurementType === 'circle') {
        // Circle - center and edge point
        const radius = obj.radius * obj.scaleX;
        const centerX = obj.left + radius;
        const centerY = obj.top + radius;
        newWorldPoints = [
          { x: centerX, y: centerY },
          { x: centerX + radius, y: centerY },
        ];
      } else if (measurementType === 'polygon') {
        // Polygon - get all points after transformation
        const points = obj.points || [];
        newWorldPoints = points.map((p: any) => ({
          x: p.x + obj.left,
          y: p.y + obj.top,
        }));
      }

      if (newWorldPoints.length === 0) return;

      // Recalculate real value based on measurement type
      const effectiveUnits = unitsPerMetre || 1;
      let updates: Partial<Measurement> = { worldPoints: newWorldPoints };

      if (measurementType === 'line' && newWorldPoints.length >= 2) {
        const result = calculateLinearWorld(newWorldPoints[0], newWorldPoints[1], effectiveUnits);
        updates.worldValue = result.worldValue;
        updates.realValue = result.realValue;
      } else if (measurementType === 'rectangle' && newWorldPoints.length >= 2) {
        const result = calculateRectangleAreaWorld(newWorldPoints[0], newWorldPoints[1], effectiveUnits);
        updates.worldValue = result.worldValue;
        updates.realValue = result.realValue;
        updates.dimensions = result.dimensions;
      } else if (measurementType === 'circle' && newWorldPoints.length >= 2) {
        const result = calculateCircleAreaWorld(newWorldPoints[0], newWorldPoints[1], effectiveUnits);
        updates.worldValue = result.worldValue;
        updates.realValue = result.realValue;
      } else if (measurementType === 'polygon' && newWorldPoints.length >= 3) {
        const result = calculatePolygonPerimeterWorld(newWorldPoints, effectiveUnits);
        updates.worldValue = result.worldValue;
        updates.realValue = result.realValue;
      }

      onMeasurementUpdate(measurementId, updates);
    };

    canvas.on('object:modified', handleObjectModified);

    return () => {
      canvas.off('object:modified', handleObjectModified);
    };
  }, [onMeasurementUpdate, unitsPerMetre]);

  // Handle calibration DRAG (new drag-to-calibrate)
  const handleCalibrationMouseDown = useCallback((worldPoint: WorldPoint) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport) return;

    // Start drag - set start point
    setIsCalibrationDragging(true);
    setCalibrationStartPoint(worldPoint);

    // Zoom-aware sizes for consistent visual appearance
    const markerRadius = getZoomAwareSize(5);
    const strokeWidth = getZoomAwareSize(2);
    const fontSize = getZoomAwareSize(16);

    // Draw start marker at WORLD coordinates
    const marker = new Circle({
      left: worldPoint.x - markerRadius,
      top: worldPoint.y - markerRadius,
      radius: markerRadius,
      fill: 'red',
      stroke: 'white',
      strokeWidth: strokeWidth,
      selectable: false,
      evented: false,
    });
    canvas.add(marker);

    const label = new Text('A', {
      left: worldPoint.x + getZoomAwareSize(10),
      top: worldPoint.y - getZoomAwareSize(10),
      fontSize: fontSize,
      fill: 'red',
      fontWeight: 'bold',
      selectable: false,
      evented: false,
    });
    canvas.add(label);

    setCalibrationObjects([marker, label]);
    canvas.requestRenderAll();
  }, [viewport, getZoomAwareSize]);

  const handleCalibrationMouseMove = useCallback((worldPoint: WorldPoint) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isCalibrationDragging || !calibrationStartPoint) return;

    // Remove previous preview line
    if (calibrationPreviewLine) {
      canvas.remove(calibrationPreviewLine);
    }

    const strokeWidth = getZoomAwareSize(2);
    const dashSize = getZoomAwareSize(5);

    // Draw preview line at WORLD positions
    const line = new Line([
      calibrationStartPoint.x, calibrationStartPoint.y,
      worldPoint.x, worldPoint.y
    ], {
      stroke: 'red',
      strokeWidth: strokeWidth,
      strokeDashArray: [dashSize, dashSize],
      selectable: false,
      evented: false,
    });
    canvas.add(line);
    setCalibrationPreviewLine(line);
    canvas.requestRenderAll();
  }, [isCalibrationDragging, calibrationStartPoint, calibrationPreviewLine, getZoomAwareSize]);

  const handleCalibrationMouseUp = useCallback((worldPoint: WorldPoint) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isCalibrationDragging || !calibrationStartPoint || !viewport) return;

    // Clean up preview line
    if (calibrationPreviewLine) {
      canvas.remove(calibrationPreviewLine);
      setCalibrationPreviewLine(null);
    }

    const strokeWidth = getZoomAwareSize(2);
    const dashSize = getZoomAwareSize(5);
    const markerRadius = getZoomAwareSize(5);
    const fontSize = getZoomAwareSize(16);

    // Draw final line at WORLD positions
    const line = new Line([
      calibrationStartPoint.x, calibrationStartPoint.y,
      worldPoint.x, worldPoint.y
    ], {
      stroke: 'red',
      strokeWidth: strokeWidth,
      strokeDashArray: [dashSize, dashSize],
      selectable: false,
      evented: false,
    });
    canvas.add(line);

    // Add end marker
    const marker = new Circle({
      left: worldPoint.x - markerRadius,
      top: worldPoint.y - markerRadius,
      radius: markerRadius,
      fill: 'red',
      stroke: 'white',
      strokeWidth: strokeWidth,
      selectable: false,
      evented: false,
    });
    canvas.add(marker);

    const label = new Text('B', {
      left: worldPoint.x + getZoomAwareSize(10),
      top: worldPoint.y - getZoomAwareSize(10),
      fontSize: fontSize,
      fill: 'red',
      fontWeight: 'bold',
      selectable: false,
      evented: false,
    });
    canvas.add(label);

    setCalibrationObjects(prev => [...prev, line, marker, label]);

    // Complete calibration
    onCalibrationPointsSet([calibrationStartPoint, worldPoint]);

    setIsCalibrationDragging(false);
    setCalibrationStartPoint(null);
    canvas.requestRenderAll();
  }, [isCalibrationDragging, calibrationStartPoint, calibrationPreviewLine, viewport, onCalibrationPointsSet, getZoomAwareSize]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport) return;

    // CRITICAL FIX: Use getPointer(e.e, true) to get raw canvas pixel coordinates
    // Then manually convert to world coordinates using viewToWorld
    // This is more reliable than getPointer(false) across Fabric.js versions
    const pointer = canvas.getPointer(e.e, true);
    const viewPoint: ViewPoint = { x: pointer.x, y: pointer.y };

    // Convert to world coordinates for storage (applies inverse transform)
    const worldPoint = viewToWorld(viewPoint, transform, viewport);

    console.log('Mouse down:', {
      canvasPixel: pointer,
      world: worldPoint,
      zoom: transform.zoom,
      pan: { x: transform.panX, y: transform.panY }
    });

    // Handle calibration (drag-to-calibrate)
    if (calibrationMode === 'manual' && !isCalibrated) {
      handleCalibrationMouseDown(worldPoint);
      return;
    }

    // Handle pan
    if (activeTool === 'pan' || !activeTool) {
      setIsPanning(true);
      setLastClientPos({ x: e.e.clientX, y: e.e.clientY });
      canvas.defaultCursor = 'grabbing';
      return;
    }

    // FIX #2 + #12: Handle eraser tool - delete the specific clicked measurement
    if (activeTool === 'eraser') {
      const target = canvas.findTarget(e.e);
      console.log('FIX #2: Eraser clicked', {
        hasTarget: !!target,
        targetData: target ? (target as any).measurementId : null,
        measurementId: target ? (target as any).measurementId : null
      });
      
      if (target && (target as any).measurementId) {
        const measurementId = (target as any).measurementId;
        console.log('FIX #2: Eraser deleting measurement:', measurementId);
        if (onDeleteMeasurement) {
          onDeleteMeasurement(measurementId);
          toast.success('Measurement deleted');
        }
      } else {
        console.log('FIX #2: Eraser - no measurement clicked');
        toast.info('Click on a measurement to delete it');
      }
      return;
    }

    // Allow measurements even without calibration
    if (!isCalibrated) {
      console.warn('Measurement made without calibration - values will be in pixels');
    }

    setIsDrawing(true);
    setStartPoint(worldPoint);

    // Handle count tool - add numbered markers for grouped counting
    if (activeTool === 'count') {
      const markerRadius = getZoomAwareSize(6);
      const strokeWidth = getZoomAwareSize(2);
      const fontSize = getZoomAwareSize(12);
      const markerIndex = countPoints.length + 1;

      // Draw numbered marker at WORLD coordinates
      const marker = new Circle({
        left: worldPoint.x - markerRadius,
        top: worldPoint.y - markerRadius,
        radius: markerRadius,
        fill: 'orange',
        stroke: 'white',
        strokeWidth: strokeWidth,
        selectable: false,
        evented: false,
      });
      canvas.add(marker);

      // Add number label
      const numberLabel = new Text(String(markerIndex), {
        left: worldPoint.x - getZoomAwareSize(4),
        top: worldPoint.y - getZoomAwareSize(6),
        fontSize: fontSize,
        fill: 'white',
        fontWeight: 'bold',
        selectable: false,
        evented: false,
      });
      canvas.add(numberLabel);

      setCountMarkers(prev => [...prev, marker, numberLabel]);
      setCountPoints(prev => [...prev, worldPoint]);
      setIsDrawing(false);
      canvas.requestRenderAll();
      return;
    }

    // Handle polygon tool
    if (activeTool === 'polygon') {
      const newPoints = [...polygonPoints, worldPoint];
      const markerRadius = getZoomAwareSize(3);
      const strokeWidth = getZoomAwareSize(2);
      const dashSize = getZoomAwareSize(5);

      // Draw point marker at WORLD position
      const marker = new Circle({
        left: worldPoint.x - markerRadius,
        top: worldPoint.y - markerRadius,
        radius: markerRadius,
        fill: 'green',
        stroke: 'white',
        strokeWidth: getZoomAwareSize(1),
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
          strokeWidth: strokeWidth,
          strokeDashArray: [dashSize, dashSize],
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
    handleCalibrationMouseDown, onMeasurementComplete, onDeleteLastMeasurement, onDeleteMeasurement,
    getZoomAwareSize, countPoints
  ]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport) return;

    // Handle calibration drag preview
    if (calibrationMode === 'manual' && isCalibrationDragging && calibrationStartPoint) {
      const pointer = canvas.getPointer(e.e, true);
      const currentWorld = viewToWorld({ x: pointer.x, y: pointer.y }, transform, viewport);
      handleCalibrationMouseMove(currentWorld);
      return;
    }

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

    // CRITICAL FIX: Use getPointer(e.e, true) for raw canvas coordinates
    const pointer = canvas.getPointer(e.e, true);
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
    const strokeWidth = getZoomAwareSize(2);
    const dashSize = getZoomAwareSize(5);

    // Draw preview shapes at WORLD coordinates - viewportTransform handles zoom/pan
    if (activeTool === 'line') {
      shape = new Line([startPoint.x, startPoint.y, currentWorldPoint.x, currentWorldPoint.y], {
        stroke: color,
        strokeWidth: strokeWidth,
        strokeDashArray: [dashSize, dashSize],
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
        strokeWidth: strokeWidth,
        strokeDashArray: [dashSize, dashSize],
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
        strokeWidth: strokeWidth,
        strokeDashArray: [dashSize, dashSize],
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
    previewShape, activeTool, isCalibrated, onTransformChange,
    calibrationMode, isCalibrationDragging, calibrationStartPoint, handleCalibrationMouseMove,
    getZoomAwareSize
  ]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Handle calibration drag end
    if (calibrationMode === 'manual' && isCalibrationDragging && calibrationStartPoint) {
      const pointer = canvas.getPointer(e.e, true);
      const worldEnd = viewToWorld({ x: pointer.x, y: pointer.y }, transform, viewport);
      handleCalibrationMouseUp(worldEnd);
      return;
    }

    // Handle pan end
    if (isPanning) {
      setIsPanning(false);
      setLastClientPos(null);
      canvas.defaultCursor = 'grab';
      return;
    }

    if (!isDrawing || !startPoint || !viewport) return;

    // CRITICAL FIX: Use getPointer(e.e, true) for raw canvas coordinates
    const pointer = canvas.getPointer(e.e, true);
    const worldEndPoint = viewToWorld({ x: pointer.x, y: pointer.y }, transform, viewport);

    // Remove preview shape
    if (previewShape) {
      canvas.remove(previewShape);
      setPreviewShape(null);
    }

    // Zoom-aware sizes for final shapes
    const strokeWidth = getZoomAwareSize(2);
    const fontSize = getZoomAwareSize(14);

    // Complete measurement based on tool
    if (activeTool === 'line') {
      const effectiveUnits = unitsPerMetre || 1;
      const result = calculateLinearWorld(startPoint, worldEndPoint, effectiveUnits);

      // Draw at WORLD coordinates - viewportTransform handles zoom/pan
      const line = new Line([startPoint.x, startPoint.y, worldEndPoint.x, worldEndPoint.y], {
        stroke: isCalibrated ? 'red' : 'orange',
        strokeWidth: strokeWidth,
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
        top: midY - getZoomAwareSize(10),
        fontSize: fontSize,
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
        strokeWidth: strokeWidth,
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
        left: centerX - getZoomAwareSize(30),
        top: centerY - getZoomAwareSize(10),
        fontSize: fontSize,
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
        strokeWidth: strokeWidth,
        selectable: false,
        evented: false,
      });
      canvas.add(circle);

      // Add label at WORLD position
      const displayValue = isCalibrated ? result.realValue : result.worldValue;
      const labelText = isCalibrated ? `${displayValue.toFixed(2)} m²` : `${displayValue.toFixed(0)} px²`;
      const label = new Text(labelText, {
        left: startPoint.x - getZoomAwareSize(30),
        top: startPoint.y - getZoomAwareSize(10),
        fontSize: fontSize,
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
    activeTool, isCalibrated, unitsPerMetre, pageIndex,
    onMeasurementComplete, calibrationMode, isCalibrationDragging,
    calibrationStartPoint, handleCalibrationMouseUp, getZoomAwareSize
  ]);

  // Handle double click to close polygon - NOW CALCULATES PERIMETER
  const handleDoubleClick = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || activeTool !== 'polygon' || polygonPoints.length < 3 || !viewport) return;

    const effectiveUnits = unitsPerMetre || 1;
    // Use perimeter calculation instead of area
    const result = calculatePolygonPerimeterWorld(polygonPoints, effectiveUnits);

    const strokeWidth = getZoomAwareSize(2);
    const fontSize = getZoomAwareSize(14);

    // Draw polygon at WORLD coordinates
    const worldPointsFabric = polygonPoints.map(wp => new FabricPoint(wp.x, wp.y));
    const polygon = new Polygon(worldPointsFabric, {
      fill: isCalibrated ? 'rgba(33, 150, 243, 0.2)' : 'rgba(255, 152, 0, 0.2)',
      stroke: isCalibrated ? '#2196F3' : 'orange',
      strokeWidth: strokeWidth,
      selectable: false,
      evented: false,
    });
    canvas.add(polygon);

    // Add perimeter label at WORLD centroid
    const worldCentroid = calculateCentroidWorld(polygonPoints);
    const displayValue = isCalibrated ? result.realValue : result.worldValue;
    const labelText = isCalibrated 
      ? `Perimeter: ${formatPerimeter(displayValue)}` 
      : `${displayValue.toFixed(0)} px`;
    const label = new Text(labelText, {
      left: worldCentroid.x - getZoomAwareSize(50),
      top: worldCentroid.y - getZoomAwareSize(10),
      fontSize: fontSize,
      fill: isCalibrated ? '#2196F3' : 'orange',
      backgroundColor: 'rgba(255,255,255,0.9)',
      selectable: false,
      evented: false,
    });
    canvas.add(label);

    // Clean up markers and lines
    polygonMarkers.forEach(marker => canvas.remove(marker));
    polygonLines.forEach(line => canvas.remove(line));
    setPolygonMarkers([]);
    setPolygonLines([]);

    // Create measurement with LM unit for perimeter
    const measurement: Measurement = {
      id: crypto.randomUUID(),
      type: 'polygon',
      worldPoints: polygonPoints,
      worldValue: result.worldValue,
      realValue: isCalibrated ? result.realValue : result.worldValue,
      unit: 'LM', // Changed from M2 to LM for perimeter
      color: isCalibrated ? '#2196F3' : '#FF9800',
      label: labelText,
      pageIndex: pageIndex,
      timestamp: new Date(),
    };

    onMeasurementComplete(measurement);
    setPolygonPoints([]);
    canvas.requestRenderAll();
  }, [
    viewport, transform, activeTool, polygonPoints, polygonMarkers, polygonLines,
    isCalibrated, unitsPerMetre, pageIndex, onMeasurementComplete,
    getZoomAwareSize
  ]);

  // Handle Complete Polygon button click
  const handleCompletePolygon = useCallback(() => {
    handleDoubleClick();
  }, [handleDoubleClick]);

  // Handle Cancel Polygon button click
  const handleCancelPolygon = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    polygonMarkers.forEach(marker => canvas.remove(marker));
    polygonLines.forEach(line => canvas.remove(line));
    setPolygonMarkers([]);
    setPolygonLines([]);
    setPolygonPoints([]);
    canvas.requestRenderAll();
  }, [polygonMarkers, polygonLines]);

  // Handle Finish Count button click
  const handleFinishCount = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || countPoints.length === 0) return;

    const measurement: Measurement = {
      id: crypto.randomUUID(),
      type: 'circle',
      worldPoints: countPoints,
      worldValue: countPoints.length,
      realValue: countPoints.length,
      unit: 'count',
      color: '#FF9800',
      label: `Count: ${countPoints.length}`,
      pageIndex: pageIndex,
      timestamp: new Date(),
    };

    onMeasurementComplete(measurement);
    setCountMarkers([]);
    setCountPoints([]);
  }, [countPoints, pageIndex, onMeasurementComplete]);

  // Handle Cancel Count button click
  const handleCancelCount = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    countMarkers.forEach(marker => canvas.remove(marker));
    setCountMarkers([]);
    setCountPoints([]);
    canvas.requestRenderAll();
  }, [countMarkers]);

  // Reset tool state when tool changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Clear polygon state when switching away from polygon tool
    if (activeTool !== 'polygon' && polygonPoints.length > 0) {
      polygonMarkers.forEach(marker => canvas.remove(marker));
      polygonLines.forEach(line => canvas.remove(line));
      setPolygonMarkers([]);
      setPolygonLines([]);
      setPolygonPoints([]);
      canvas.requestRenderAll();
    }

    // Clear count state when switching away from count tool
    if (activeTool !== 'count' && countPoints.length > 0) {
      countMarkers.forEach(marker => canvas.remove(marker));
      setCountMarkers([]);
      setCountPoints([]);
      canvas.requestRenderAll();
    }
  }, [activeTool, polygonPoints.length, countPoints.length, polygonMarkers, polygonLines, countMarkers]);

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
      {!isCalibrated && activeTool && activeTool !== 'pan' && activeTool !== 'eraser' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-md text-sm font-medium z-10 shadow-lg">
          ⚠️ Set scale first for accurate measurements (currently showing pixel values)
        </div>
      )}

      {/* Polygon Tool Buttons - Show when 3+ points */}
      {activeTool === 'polygon' && polygonPoints.length >= 3 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          <Button
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleCompletePolygon}
          >
            <Check className="h-4 w-4 mr-1" />
            Complete Polygon
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancelPolygon}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      )}

      {/* Polygon Hint - Show when less than 3 points */}
      {activeTool === 'polygon' && polygonPoints.length > 0 && polygonPoints.length < 3 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500/90 text-white px-4 py-2 rounded-md text-sm z-10">
          Click to add points ({polygonPoints.length}/3 minimum)
        </div>
      )}

      {/* Count Tool Buttons - Show when any counts exist */}
      {activeTool === 'count' && countPoints.length > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          <Button
            variant="default"
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={handleFinishCount}
          >
            <Check className="h-4 w-4 mr-1" />
            Finish Count ({countPoints.length})
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancelCount}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      )}

      {/* Count Tool Hint - Show when no counts yet */}
      {activeTool === 'count' && countPoints.length === 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-orange-500/90 text-white px-4 py-2 rounded-md text-sm z-10">
          Click to count items - click Finish Count when done
        </div>
      )}

      {/* Eraser Tool Hint */}
      {activeTool === 'eraser' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-md text-sm z-10">
          Click anywhere to delete the last measurement
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
