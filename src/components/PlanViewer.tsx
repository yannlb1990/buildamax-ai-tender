import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Line, Textbox, FabricImage, Polygon, Rect } from "fabric";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Ruler, ZoomIn, ZoomOut, Move, Trash2, Square, Minus, Scan, Loader2, PenTool } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PlanViewerProps {
  planUrl: string;
  projectId?: string;
}

export const PlanViewer = ({ planUrl, projectId }: PlanViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<"pan" | "measure-line" | "measure-area" | "calibrate">("pan");
  const [scaleFactor, setScaleFactor] = useState<number | null>(null); // mm per canvas pixel
  const [calibratePoints, setCalibratePoints] = useState<{ x: number; y: number }[]>([]);
  const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
  const [calibrationDistance, setCalibrationDistance] = useState("");
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [planPageId, setPlanPageId] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [symbols, setSymbols] = useState<any[]>([]);

  // Initialize canvas and load plan
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1000,
      height: 700,
      backgroundColor: "#f5f5f5",
    });

    setFabricCanvas(canvas);

    // Load plan image
    FabricImage.fromURL(planUrl, {
      crossOrigin: 'anonymous'
    }).then((fabricImg) => {
      fabricImg.set({
        left: 0,
        top: 0,
        selectable: false,
      });

      const canvasWidth = 1000;
      const canvasHeight = 700;
      const imgScale = Math.min(canvasWidth / (fabricImg.width || 1), canvasHeight / (fabricImg.height || 1));
      fabricImg.scale(imgScale);

      canvas.add(fabricImg);
      canvas.renderAll();

      // Create plan_page record
      createPlanPage(canvasWidth, canvasHeight);
    }).catch((err) => {
      console.error("Failed to load plan image:", err);
      toast.error("Failed to load plan image");
    });

    return () => {
      canvas.dispose();
    };
  }, [planUrl]);

  // Create plan page in database
  const createPlanPage = async (width: number, height: number) => {
    if (!projectId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('plan_pages')
      .insert({
        project_id: projectId,
        user_id: user.id,
        file_url: planUrl,
        canvas_width: width,
        canvas_height: height,
        status: 'ready'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating plan page:', error);
    } else {
      setPlanPageId(data.id);
    }
  };

  // Handle mouse interactions based on tool
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (e: any) => {
      if (!e.pointer) return;

      if (tool === "calibrate") {
        handleCalibrateClick(e.pointer);
      } else if (tool === "measure-line") {
        setMeasureStart({ x: e.pointer.x, y: e.pointer.y });
      } else if (tool === "measure-area") {
        handlePolygonClick(e.pointer);
      }
    };

    const handleMouseUp = (e: any) => {
      if (tool === "measure-line" && measureStart && e.pointer) {
        drawLineMeasurement(measureStart, e.pointer);
        setMeasureStart(null);
      }
    };

    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:up", handleMouseUp);

    return () => {
      fabricCanvas.off("mouse:down", handleMouseDown);
      fabricCanvas.off("mouse:up", handleMouseUp);
    };
  }, [tool, fabricCanvas, measureStart, calibratePoints, polygonPoints, scaleFactor]);

  // Handle calibration clicks
  const handleCalibrateClick = (pointer: { x: number; y: number }) => {
    if (calibratePoints.length < 2) {
      const newPoints = [...calibratePoints, pointer];
      setCalibratePoints(newPoints);

      // Draw point marker
      const circle = new Rect({
        left: pointer.x - 3,
        top: pointer.y - 3,
        width: 6,
        height: 6,
        fill: '#FF6B6B',
        selectable: false
      });
      fabricCanvas?.add(circle);
      fabricCanvas?.renderAll();

      if (newPoints.length === 2) {
        // Draw line between points
        const line = new Line(
          [newPoints[0].x, newPoints[0].y, newPoints[1].x, newPoints[1].y],
          { stroke: '#FF6B6B', strokeWidth: 2, selectable: false }
        );
        fabricCanvas?.add(line);
        fabricCanvas?.renderAll();
        setShowCalibrationDialog(true);
      }
    }
  };

  // Apply scale calibration
  const applyScale = async () => {
    const realDistanceMm = parseFloat(calibrationDistance);
    if (isNaN(realDistanceMm) || realDistanceMm <= 0) {
      toast.error("Please enter a valid distance in mm");
      return;
    }

    const canvasDistance = Math.sqrt(
      Math.pow(calibratePoints[1].x - calibratePoints[0].x, 2) +
      Math.pow(calibratePoints[1].y - calibratePoints[0].y, 2)
    );

    const calculatedScaleFactor = realDistanceMm / canvasDistance;
    setScaleFactor(calculatedScaleFactor);

    // Save to database
    if (planPageId) {
      const { error } = await supabase
        .from('plan_pages')
        .update({
          scale_factor: calculatedScaleFactor,
          scale_known_distance_mm: realDistanceMm,
          scale_point_a: calibratePoints[0],
          scale_point_b: calibratePoints[1]
        })
        .eq('id', planPageId);

      if (error) {
        console.error('Error saving scale:', error);
        toast.error("Failed to save scale");
      } else {
        toast.success(`Scale set: 1:${Math.round(1000 / calculatedScaleFactor)}`);
      }
    }

    setShowCalibrationDialog(false);
    setCalibratePoints([]);
    setCalibrationDistance("");
    setTool("pan");
  };

  // Handle polygon area measurement
  const handlePolygonClick = (pointer: { x: number; y: number }) => {
    // Check if closing polygon (clicked near start)
    if (polygonPoints.length >= 3) {
      const startDist = Math.sqrt(
        Math.pow(pointer.x - polygonPoints[0].x, 2) +
        Math.pow(pointer.y - polygonPoints[0].y, 2)
      );

      if (startDist < 20) {
        closeAndMeasurePolygon();
        return;
      }
    }

    const newPoints = [...polygonPoints, pointer];
    setPolygonPoints(newPoints);

    // Draw point marker
    const circle = new Rect({
      left: pointer.x - 3,
      top: pointer.y - 3,
      width: 6,
      height: 6,
      fill: '#4CAF50',
      selectable: false
    });
    fabricCanvas?.add(circle);
    fabricCanvas?.renderAll();
  };

  // Close polygon and calculate area
  const closeAndMeasurePolygon = async () => {
    if (!fabricCanvas || !scaleFactor) {
      toast.error("Please set scale first");
      return;
    }

    // Shoelace formula for area
    let area = 0;
    const n = polygonPoints.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygonPoints[i].x * polygonPoints[j].y;
      area -= polygonPoints[j].x * polygonPoints[i].y;
    }
    area = Math.abs(area) / 2;

    // Convert to m²
    const areaRealMm2 = area * Math.pow(scaleFactor, 2);
    const areaM2 = areaRealMm2 / 1000000;

    // Draw filled polygon
    const polygon = new Polygon(polygonPoints, {
      fill: 'rgba(76, 175, 80, 0.3)',
      stroke: '#4CAF50',
      strokeWidth: 2,
      selectable: true
    });

    // Calculate centroid
    const centroid = {
      x: polygonPoints.reduce((sum, p) => sum + p.x, 0) / n,
      y: polygonPoints.reduce((sum, p) => sum + p.y, 0) / n
    };

    // Add area label
    const label = new Textbox(`${areaM2.toFixed(2)} m²`, {
      left: centroid.x,
      top: centroid.y,
      fontSize: 16,
      fill: '#4CAF50',
      backgroundColor: 'white',
      selectable: true
    });

    fabricCanvas.add(polygon);
    fabricCanvas.add(label);
    fabricCanvas.renderAll();

    // Save measurement
    if (planPageId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('plan_measurements').insert({
          plan_page_id: planPageId,
          user_id: user.id,
          measurement_type: 'polygon',
          points: polygonPoints,
          raw_value: area,
          real_value: areaM2,
          real_unit: 'm²'
        });
      }
    }

    toast.success(`Area: ${areaM2.toFixed(2)} m²`);
    setPolygonPoints([]);
  };

  // Draw line measurement
  const drawLineMeasurement = async (start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!fabricCanvas) return;

    const line = new Line([start.x, start.y, end.x, end.y], {
      stroke: "#FF6B6B",
      strokeWidth: 2,
      selectable: true
    });

    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    let displayText = `${distance.toFixed(2)}px`;
    let realValue = distance;
    let realUnit = 'px';

    if (scaleFactor) {
      const realDistanceMm = distance * scaleFactor;
      const realDistanceM = realDistanceMm / 1000;
      displayText = `${realDistanceM.toFixed(2)} m`;
      realValue = realDistanceM;
      realUnit = 'm';
    }

    const text = new Textbox(displayText, {
      left: (start.x + end.x) / 2,
      top: (start.y + end.y) / 2 - 20,
      fontSize: 14,
      fill: "#FF6B6B",
      backgroundColor: "white",
      selectable: true
    });

    fabricCanvas.add(line);
    fabricCanvas.add(text);
    fabricCanvas.renderAll();

    // Save measurement
    if (planPageId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('plan_measurements').insert({
          plan_page_id: planPageId,
          user_id: user.id,
          measurement_type: 'linear',
          points: [start, end],
          raw_value: distance,
          real_value: realValue,
          real_unit: realUnit
        });
      }
    }

    toast.success(`Measured: ${displayText}`);
  };

  // Detect symbols using AI
  const handleDetectSymbols = async () => {
    if (!planPageId) {
      toast.error("Plan not loaded");
      return;
    }

    setIsDetecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plan-detect-symbols`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            planPageId,
            planUrl
          })
        }
      );

      const result = await response.json();
      if (result.success) {
        setSymbols(result.symbols);
        renderSymbolOverlays(result.symbols);
        toast.success(`Detected ${result.count} symbols`);
      } else {
        toast.error(result.error || "Detection failed");
      }
    } catch (error) {
      console.error('Error detecting symbols:', error);
      toast.error("Failed to detect symbols");
    } finally {
      setIsDetecting(false);
    }
  };

  // Render symbol overlays on canvas
  const renderSymbolOverlays = (detectedSymbols: any[]) => {
    if (!fabricCanvas) return;

    const canvasWidth = 1000;
    const canvasHeight = 700;

    detectedSymbols.forEach((symbol) => {
      const { x, y, width, height } = symbol.bounding_box;

      // Convert percentage to canvas pixels
      const canvasX = (x / 100) * canvasWidth;
      const canvasY = (y / 100) * canvasHeight;
      const canvasW = (width / 100) * canvasWidth;
      const canvasH = (height / 100) * canvasHeight;

      const color = getSymbolColor(symbol.type);

      // Draw bounding box
      const rect = new Rect({
        left: canvasX,
        top: canvasY,
        width: canvasW,
        height: canvasH,
        fill: 'transparent',
        stroke: color,
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false
      });

      // Add label
      const label = new Textbox(symbol.suggested_id || symbol.type.toUpperCase(), {
        left: canvasX,
        top: canvasY - 20,
        fontSize: 12,
        fill: color,
        backgroundColor: 'white',
        selectable: false
      });

      fabricCanvas.add(rect);
      fabricCanvas.add(label);
    });

    fabricCanvas.renderAll();
  };

  const getSymbolColor = (type: string) => {
    switch (type) {
      case 'door': return '#FF6B6B';
      case 'window': return '#4ECDC4';
      case 'toilet':
      case 'basin':
      case 'shower': return '#45B7D1';
      default: return '#95A5A6';
    }
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newScale = scale * 1.2;
    setScale(newScale);
    fabricCanvas.setZoom(newScale);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newScale = scale / 1.2;
    setScale(newScale);
    fabricCanvas.setZoom(newScale);
    fabricCanvas.renderAll();
  };

  const handleClearMeasurements = () => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    objects.forEach((obj) => {
      if (obj instanceof Line || obj instanceof Textbox || obj instanceof Polygon || obj instanceof Rect) {
        if (obj.selectable !== false) {
          fabricCanvas.remove(obj);
        }
      }
    });
    fabricCanvas.renderAll();
    setPolygonPoints([]);
    setCalibratePoints([]);
    toast.success("Measurements cleared");
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {/* Navigation */}
          <Button
            variant={tool === "pan" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("pan")}
          >
            <Move className="h-4 w-4 mr-2" />
            Pan
          </Button>

          {/* Scale Calibration */}
          <Button
            variant={tool === "calibrate" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("calibrate")}
          >
            <Ruler className="h-4 w-4 mr-2" />
            Set Scale
          </Button>

          {/* Measurement Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <PenTool className="h-4 w-4 mr-2" />
                Measure ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTool("measure-line")}>
                <Minus className="h-4 w-4 mr-2" />
                Line (m)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTool("measure-area")}>
                <Square className="h-4 w-4 mr-2" />
                Area (m²)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Zoom Controls */}
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4 mr-2" />
            Zoom In
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4 mr-2" />
            Zoom Out
          </Button>

          {/* AI Detection */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDetectSymbols}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Scan className="h-4 w-4 mr-2" />
            )}
            Auto-Detect
          </Button>

          <Button variant="destructive" size="sm" onClick={handleClearMeasurements}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>

          {/* Scale Display */}
          {scaleFactor && (
            <Badge variant="secondary" className="ml-auto">
              Scale: 1:{Math.round(1000 / scaleFactor)}
            </Badge>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="border border-border rounded-lg overflow-hidden bg-background">
          <canvas ref={canvasRef} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {tool === "calibrate" && "Click two points on a known dimension"}
          {tool === "measure-line" && "Click and drag to measure distances"}
          {tool === "measure-area" && "Click points to create a polygon. Click near start to close."}
          {tool === "pan" && "Pan mode: drag to move the canvas"}
        </p>
      </Card>

      {/* Calibration Dialog */}
      <Dialog open={showCalibrationDialog} onOpenChange={setShowCalibrationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Scale</DialogTitle>
            <DialogDescription>
              Enter the real-world distance between the two points you selected
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Distance (mm)</Label>
            <Input
              type="number"
              value={calibrationDistance}
              onChange={(e) => setCalibrationDistance(e.target.value)}
              placeholder="e.g., 5000 for 5 meters"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCalibrationDialog(false);
              setCalibratePoints([]);
            }}>
              Cancel
            </Button>
            <Button onClick={applyScale}>Apply Scale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
