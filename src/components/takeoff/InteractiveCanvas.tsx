import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, Circle, Line, Rect, Polygon, Text, Point as FabricPoint } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorldPoint, ViewPoint, Transform, PDFViewportData, Measurement, ToolType } from '@/lib/takeoff/types';
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
  measurements: Measurement[]; // NEW - array of all measurements for rendering
  onMeasurementComplete: (measurement: Measurement) => void;
  onCalibrationPointsSet: (points: [WorldPoint, WorldPoint]) => void;
  onTransformChange: (transform: Partial<Transform>) => void;
  onViewportReady: (viewport: PDFViewportData) => void;
  onDeleteLastMeasurement?: () => void;
  onMeasurementUpdate?: (id: string, updates: Partial<Measurement>) => void; // NEW - for editing
  onDeleteMeasurement?: (id: string) => void; // FIX #2 - for eraser to delete specific measurement
}

export const InteractiveCanvas = ({
  pdfUrl,
  pageIndex,
  transform,
  activeTool,
  isCalibrated,
  unitsPerMetre,
  calibrationMode,
  measurements,
  onMeasurementComplete,
  onCalibrationPointsSet,
  onTransformChange,
  onViewportReady,
  onDeleteLastMeasurement,
  onMeasurementUpdate,
  onDeleteMeasurement,
}: InteractiveCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);

  // STAGE 1: Track rendered measurement objects for edit/delete/move/resize
  const measurementObjectsRef = useRef<Map<string, any[]>>(new Map());

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

  // Count tool state for grouped counting
  const [countMarkers, setCountMarkers] = useState<any[]>([]);
  const [countPoints, setCountPoints] = useState<WorldPoint[]>([]);

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

  // FIX #1: Detect and remove deleted measurements from canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.log('FIX #1: Canvas not ready, skipping deletion check');
      return;
    }

    // Get current measurement IDs
    const currentMeasurementIds = new Set(measurements.map(m => m.id));
    const renderedMeasurementIds = Array.from(measurementObjectsRef.current.keys());

    console.log('FIX #1: Deletion check - Current measurements:', currentMeasurementIds.size, 'Rendered:', renderedMeasurementIds.length);

    // Find and remove deleted measurements
    let deletedCount = 0;
    renderedMeasurementIds.forEach(renderedId => {
      if (!currentMeasurementIds.has(renderedId)) {
        console.log('FIX #1: ⚠️ DELETING measurement from canvas:', renderedId);
        const objects = measurementObjectsRef.current.get(renderedId);
        if (objects && objects.length > 0) {
          console.log(`  - Found ${objects.length} canvas objects to remove`);
          objects.forEach((obj, index) => {
            try {
              canvas.remove(obj);
              console.log(`  - ✓ Removed object ${index + 1}/${objects.length}`);
              deletedCount++;
            } catch (error) {
              console.error(`  - ✗ Error removing object ${index + 1}:`, error);
            }
          });
          measurementObjectsRef.current.delete(renderedId);
          console.log('  - ✓ Cleared from ref map');
        } else {
          console.warn('  - ⚠️ No objects found in ref for this measurement!');
        }
      }
    });

    if (deletedCount > 0) {
      console.log(`FIX #1: ✅ Deleted ${deletedCount} canvas objects, requesting re-render`);
      canvas.requestRenderAll();
    } else {
      console.log('FIX #1: No deletions needed');
    }
  }, [measurements]); // Trigger whenever measurements array changes

  // STAGE 1: Render all measurements when they change
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport) return;

    console.log('Re-rendering all measurements. Total:', measurements.length, 'Page:', pageIndex);

    // Clear all previously rendered measurement objects
    measurementObjectsRef.current.forEach((objects, measurementId) => {
      console.log('Removing old objects for measurement:', measurementId);
      objects.forEach(obj => canvas.remove(obj));
    });
    measurementObjectsRef.current.clear();

    // Render all measurements for current page
    const pageMeasurements = measurements.filter(m => m.pageIndex === pageIndex);
    console.log('Measurements on this page:', pageMeasurements.length);

    pageMeasurements.forEach(measurement => {
      renderMeasurement(measurement);
    });

    canvas.requestRenderAll();
  }, [measurements, pageIndex, viewport, renderMeasurement]);

  // STAGE 1: Re-render measurements when zoom changes (for zoom-aware sizing)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport) return;

    // Clear and re-render with new zoom-aware sizes
    measurementObjectsRef.current.forEach((objects) => {
      objects.forEach(obj => canvas.remove(obj));
    });
    measurementObjectsRef.current.clear();

    const pageMeasurements = measurements.filter(m => m.pageIndex === pageIndex);
    pageMeasurements.forEach(measurement => {
      renderMeasurement(measurement);
    });

    canvas.requestRenderAll();
  }, [transform.zoom, measurements, pageIndex, viewport, renderMeasurement]);

  // STAGE 4: Handle measurement movement and resizing
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport || !onMeasurementUpdate) return;

    const handleObjectModified = (e: any) => {
      const obj = e.target;
      if (!obj || !obj.data || !obj.data.measurementId) return;

      const measurementId = obj.data.measurementId;
      const measurementType = obj.data.measurementType;

      console.log('Object modified:', measurementId, measurementType);

      // Extract new positions and update measurement
      let newWorldPoints: WorldPoint[] = [];
      let newRealValue = 0;
      const effectiveUnits = unitsPerMetre || 1;

      if (measurementType === 'line') {
        // Line: extract x1, y1, x2, y2
        const line = obj as any;
        newWorldPoints = [
          { x: line.x1 + line.left, y: line.y1 + line.top },
          { x: line.x2 + line.left, y: line.y2 + line.top }
        ];
        const result = calculateLinearWorld(newWorldPoints[0], newWorldPoints[1], effectiveUnits);
        newRealValue = result.realValue;

      } else if (measurementType === 'rectangle') {
        // Rectangle: extract corners from left, top, width, height
        const rect = obj as any;
        newWorldPoints = [
          { x: rect.left, y: rect.top },
          { x: rect.left + rect.width * rect.scaleX, y: rect.top + rect.height * rect.scaleY }
        ];
        const result = calculateRectangleAreaWorld(newWorldPoints[0], newWorldPoints[1], effectiveUnits);
        newRealValue = result.realValue;

      } else if (measurementType === 'circle') {
        // Circle: extract center and radius
        const circle = obj as any;
        const centerX = circle.left + circle.radius * circle.scaleX;
        const centerY = circle.top + circle.radius * circle.scaleY;
        const radius = circle.radius * circle.scaleX;
        newWorldPoints = [
          { x: centerX, y: centerY },
          { x: centerX + radius, y: centerY }
        ];
        const result = calculateCircleAreaWorld(newWorldPoints[0], newWorldPoints[1], effectiveUnits);
        newRealValue = result.realValue;

      } else if (measurementType === 'polygon') {
        // Polygon: extract all points
        const polygon = obj as any;
        if (polygon.points) {
          newWorldPoints = polygon.points.map((p: any) => ({
            x: p.x * polygon.scaleX + polygon.left,
            y: p.y * polygon.scaleY + polygon.top
          }));
          const result = calculatePolygonPerimeterWorld(newWorldPoints, effectiveUnits);
          newRealValue = result.realValue;
        }
      }

      // FIX DUPLICATION BUG: Remove modified object from canvas before updating state
      // This prevents the re-render from creating a duplicate
      if (newWorldPoints.length > 0 && onMeasurementUpdate) {
        console.log('Updating measurement with new points:', newWorldPoints);

        // Remove the old Fabric objects for this measurement
        const oldObjects = measurementObjectsRef.current.get(measurementId);
        if (oldObjects) {
          oldObjects.forEach(oldObj => canvas.remove(oldObj));
          measurementObjectsRef.current.delete(measurementId);
        }

        // Update state - the useEffect will create new objects with correct positions
        onMeasurementUpdate(measurementId, {
          worldPoints: newWorldPoints,
          realValue: newRealValue
        });
      }
    };

    canvas.on('object:modified', handleObjectModified);

    return () => {
      canvas.off('object:modified', handleObjectModified);
    };
  }, [viewport, unitsPerMetre, onMeasurementUpdate]);

  // Update cursor based on active tool
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    if (calibrationMode === 'manual') {
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      canvas.selection = false;
    } else if (activeTool === 'select') {
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      canvas.selection = true; // Enable Fabric.js selection
    } else if (activeTool === 'pan' || !activeTool) {
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
      canvas.selection = false;
    } else {
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      canvas.selection = false;
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

  // STAGE 1: Render a measurement on the canvas
  const renderMeasurement = useCallback((measurement: Measurement) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !viewport) return;

    console.log('Rendering measurement:', measurement.id, measurement.type);

    const strokeWidth = getZoomAwareSize(2);
    const fontSize = getZoomAwareSize(14);
    const objects: any[] = [];

    // STAGE 4: Check if measurement is locked (prevent interaction)
    const enhancedMeasurement = measurement as any;
    const isLocked = enhancedMeasurement.locked || false;

    // Render based on type
    if (measurement.type === 'line' && measurement.worldPoints.length >= 2) {
      const [p1, p2] = measurement.worldPoints;
      const line = new Line([p1.x, p1.y, p2.x, p2.y], {
        stroke: measurement.color,
        strokeWidth: strokeWidth,
        selectable: !isLocked, // STAGE 4: Allow selection if not locked
        evented: !isLocked,
        hasControls: true,
        hasBorders: true,
        lockRotation: true, // Only allow move, not rotate
        lockScalingFlip: true,
        data: { measurementId: measurement.id, measurementType: 'line' }, // Store ID for event handlers
      });
      canvas.add(line);
      objects.push(line);

      // STAGE 6: Add start point marker (green circle)
      const startMarker = new Circle({
        left: p1.x - getZoomAwareSize(4),
        top: p1.y - getZoomAwareSize(4),
        radius: getZoomAwareSize(4),
        fill: '#22c55e', // Green
        stroke: 'white',
        strokeWidth: getZoomAwareSize(1.5),
        selectable: false,
        evented: false,
      });
      canvas.add(startMarker);
      objects.push(startMarker);

      // STAGE 6: Add end point marker (red square)
      const endMarker = new Rect({
        left: p2.x - getZoomAwareSize(4),
        top: p2.y - getZoomAwareSize(4),
        width: getZoomAwareSize(8),
        height: getZoomAwareSize(8),
        fill: '#ef4444', // Red
        stroke: 'white',
        strokeWidth: getZoomAwareSize(1.5),
        selectable: false,
        evented: false,
      });
      canvas.add(endMarker);
      objects.push(endMarker);

      // Add label
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const label = new Text(measurement.label, {
        left: midX,
        top: midY - getZoomAwareSize(10),
        fontSize: fontSize,
        fill: measurement.color,
        backgroundColor: 'white',
        selectable: false,
        evented: false,
      });
      canvas.add(label);
      objects.push(label);

    } else if (measurement.type === 'rectangle' && measurement.worldPoints.length >= 2) {
      const [p1, p2] = measurement.worldPoints;
      const rect = new Rect({
        left: Math.min(p1.x, p2.x),
        top: Math.min(p1.y, p2.y),
        width: Math.abs(p2.x - p1.x),
        height: Math.abs(p2.y - p1.y),
        fill: `${measurement.color}33`, // Add transparency
        stroke: measurement.color,
        strokeWidth: strokeWidth,
        selectable: !isLocked, // STAGE 4: Allow selection if not locked
        evented: !isLocked,
        hasControls: true,
        hasBorders: true,
        lockRotation: true,
        lockScalingFlip: true,
        data: { measurementId: measurement.id, measurementType: 'rectangle' },
      });
      canvas.add(rect);
      objects.push(rect);

      // STAGE 6: Add corner markers (green circle for first corner, red square for opposite)
      const corner1Marker = new Circle({
        left: p1.x - getZoomAwareSize(4),
        top: p1.y - getZoomAwareSize(4),
        radius: getZoomAwareSize(4),
        fill: '#22c55e', // Green
        stroke: 'white',
        strokeWidth: getZoomAwareSize(1.5),
        selectable: false,
        evented: false,
      });
      canvas.add(corner1Marker);
      objects.push(corner1Marker);

      const corner2Marker = new Rect({
        left: p2.x - getZoomAwareSize(4),
        top: p2.y - getZoomAwareSize(4),
        width: getZoomAwareSize(8),
        height: getZoomAwareSize(8),
        fill: '#ef4444', // Red
        stroke: 'white',
        strokeWidth: getZoomAwareSize(1.5),
        selectable: false,
        evented: false,
      });
      canvas.add(corner2Marker);
      objects.push(corner2Marker);

      // Add label
      const centerX = (p1.x + p2.x) / 2;
      const centerY = (p1.y + p2.y) / 2;
      const label = new Text(measurement.label, {
        left: centerX - getZoomAwareSize(30),
        top: centerY - getZoomAwareSize(10),
        fontSize: fontSize,
        fill: measurement.color,
        backgroundColor: 'white',
        selectable: false,
        evented: false,
      });
      canvas.add(label);
      objects.push(label);

    } else if (measurement.type === 'polygon' && measurement.worldPoints.length >= 3) {
      const worldPointsFabric = measurement.worldPoints.map(wp => new FabricPoint(wp.x, wp.y));
      const polygon = new Polygon(worldPointsFabric, {
        fill: `${measurement.color}33`, // Add transparency
        stroke: measurement.color,
        strokeWidth: strokeWidth,
        selectable: !isLocked, // STAGE 4: Allow selection if not locked
        evented: !isLocked,
        hasControls: true,
        hasBorders: true,
        lockRotation: true,
        lockScalingFlip: true,
        data: { measurementId: measurement.id, measurementType: 'polygon' },
      });
      canvas.add(polygon);
      objects.push(polygon);

      // STAGE 6: Add blue diamond markers at each vertex
      measurement.worldPoints.forEach((point, index) => {
        const diamond = new Rect({
          left: point.x - getZoomAwareSize(4),
          top: point.y - getZoomAwareSize(4),
          width: getZoomAwareSize(8),
          height: getZoomAwareSize(8),
          fill: index === 0 ? '#22c55e' : '#3b82f6', // Green for first, blue for others
          stroke: 'white',
          strokeWidth: getZoomAwareSize(1.5),
          angle: 45, // Rotate 45 degrees to make diamond shape
          selectable: false,
          evented: false,
        });
        canvas.add(diamond);
        objects.push(diamond);
      });

      // Add label at centroid
      const worldCentroid = calculateCentroidWorld(measurement.worldPoints);
      const label = new Text(measurement.label, {
        left: worldCentroid.x - getZoomAwareSize(50),
        top: worldCentroid.y - getZoomAwareSize(10),
        fontSize: fontSize,
        fill: measurement.color,
        backgroundColor: 'rgba(255,255,255,0.9)',
        selectable: false,
        evented: false,
      });
      canvas.add(label);
      objects.push(label);

    } else if (measurement.type === 'circle') {
      if (measurement.unit === 'count') {
        // Count markers - render each point
        // STAGE 6: 2x larger count markers for better visibility
        measurement.worldPoints.forEach((point, index) => {
          const markerRadius = getZoomAwareSize(12); // 2x larger (was 6)
          const markerStrokeWidth = getZoomAwareSize(3); // Proportionally larger (was 2)
          const markerFontSize = getZoomAwareSize(16); // Larger font (was 12)

          const marker = new Circle({
            left: point.x - markerRadius,
            top: point.y - markerRadius,
            radius: markerRadius,
            fill: 'orange',
            stroke: 'white',
            strokeWidth: markerStrokeWidth,
            selectable: false,
            evented: false,
          });
          canvas.add(marker);
          objects.push(marker);

          // Add number label
          const numberLabel = new Text(String(index + 1), {
            left: point.x - getZoomAwareSize(6), // Adjusted for larger marker
            top: point.y - getZoomAwareSize(9), // Adjusted for larger marker
            fontSize: markerFontSize,
            fill: 'white',
            fontWeight: 'bold',
            selectable: false,
            evented: false,
          });
          canvas.add(numberLabel);
          objects.push(numberLabel);
        });
      } else if (measurement.worldPoints.length >= 2) {
        // Circle/area measurement
        const [center, radiusPoint] = measurement.worldPoints;
        const dx = radiusPoint.x - center.x;
        const dy = radiusPoint.y - center.y;
        const radiusWorld = Math.sqrt(dx * dx + dy * dy);

        const circle = new Circle({
          left: center.x - radiusWorld,
          top: center.y - radiusWorld,
          radius: radiusWorld,
          fill: `${measurement.color}33`, // Add transparency
          stroke: measurement.color,
          strokeWidth: strokeWidth,
          selectable: !isLocked, // STAGE 4: Allow selection if not locked
          evented: !isLocked,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          lockScalingFlip: true,
          data: { measurementId: measurement.id, measurementType: 'circle' },
        });
        canvas.add(circle);
        objects.push(circle);

        // STAGE 6: Add center marker (green circle) and radius marker (red square)
        const centerMarker = new Circle({
          left: center.x - getZoomAwareSize(4),
          top: center.y - getZoomAwareSize(4),
          radius: getZoomAwareSize(4),
          fill: '#22c55e', // Green
          stroke: 'white',
          strokeWidth: getZoomAwareSize(1.5),
          selectable: false,
          evented: false,
        });
        canvas.add(centerMarker);
        objects.push(centerMarker);

        const radiusMarker = new Rect({
          left: radiusPoint.x - getZoomAwareSize(4),
          top: radiusPoint.y - getZoomAwareSize(4),
          width: getZoomAwareSize(8),
          height: getZoomAwareSize(8),
          fill: '#ef4444', // Red
          stroke: 'white',
          strokeWidth: getZoomAwareSize(1.5),
          selectable: false,
          evented: false,
        });
        canvas.add(radiusMarker);
        objects.push(radiusMarker);

        // Add label
        const label = new Text(measurement.label, {
          left: center.x - getZoomAwareSize(30),
          top: center.y - getZoomAwareSize(10),
          fontSize: fontSize,
          fill: measurement.color,
          backgroundColor: 'white',
          selectable: false,
          evented: false,
        });
        canvas.add(label);
        objects.push(label);
      }
    }

    // STAGE 3: Add lock indicator for locked measurements
    if (enhancedMeasurement.locked) {
      // Calculate position for lock icon (top-left of measurement bounds)
      let lockX = 0;
      let lockY = 0;

      if (measurement.worldPoints.length > 0) {
        // Use first point as reference, offset slightly
        lockX = measurement.worldPoints[0].x + getZoomAwareSize(5);
        lockY = measurement.worldPoints[0].y - getZoomAwareSize(15);
      }

      // Create lock icon using a small text symbol
      const lockIcon = new Text('🔒', {
        left: lockX,
        top: lockY,
        fontSize: getZoomAwareSize(12),
        fill: '#f59e0b', // Amber color to match table UI
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        selectable: false,
        evented: false,
      });
      canvas.add(lockIcon);
      objects.push(lockIcon);
    }

    // Store objects for this measurement
    measurementObjectsRef.current.set(measurement.id, objects);
  }, [viewport, transform, getZoomAwareSize]);

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

    // Handle SELECT mode - allow Fabric.js selection, don't intercept
    if (activeTool === 'select') {
      // Let Fabric.js handle object selection and movement
      return;
    }

    // Handle pan
    if (activeTool === 'pan' || !activeTool) {
      setIsPanning(true);
      setLastClientPos({ x: e.e.clientX, y: e.e.clientY });
      canvas.defaultCursor = 'grabbing';
      return;
    }

    // FIX #2: Handle eraser tool - delete clicked measurement
    if (activeTool === 'eraser') {
      const target = e.target;
      console.log('FIX #2: Eraser clicked - target:', target?.type, 'has measurementId:', !!target?.data?.measurementId);

      if (target && target.data && target.data.measurementId) {
        // Clicked on a measurement - delete it
        const measurementId = target.data.measurementId;
        console.log('FIX #2: ✓ Eraser deleting measurement:', measurementId);

        if (onDeleteMeasurement) {
          onDeleteMeasurement(measurementId);
          toast.success('Measurement deleted');
          console.log('FIX #2: ✓ Delete dispatched');
        } else {
          console.error('FIX #2: ✗ onDeleteMeasurement not available!');
        }
      } else {
        // Clicked on empty space - fallback to delete last
        console.log('FIX #2: Clicked empty space, deleting last measurement');
        if (onDeleteLastMeasurement) {
          onDeleteLastMeasurement();
          toast.info('Last measurement deleted');
        }
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
    // STAGE 6: 2x larger count markers for better visibility
    if (activeTool === 'count') {
      const markerRadius = getZoomAwareSize(12); // 2x larger (was 6)
      const strokeWidth = getZoomAwareSize(3); // Proportionally larger (was 2)
      const fontSize = getZoomAwareSize(16); // Larger font (was 12)
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
        left: worldPoint.x - getZoomAwareSize(6), // Adjusted for larger marker
        top: worldPoint.y - getZoomAwareSize(9), // Adjusted for larger marker
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
    handleCalibrationMouseDown, onMeasurementComplete, onDeleteLastMeasurement,
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
