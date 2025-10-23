import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Line, Textbox, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler, ZoomIn, ZoomOut, Move, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PlanViewerProps {
  planUrl: string;
}

export const PlanViewer = ({ planUrl }: PlanViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<"pan" | "measure">("pan");
  const [scaleRatio, setScaleRatio] = useState("");
  const [measuring, setMeasuring] = useState(false);
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1000,
      height: 700,
      backgroundColor: "#f5f5f5",
    });

    setFabricCanvas(canvas);

    // Load plan image using FabricImage
    FabricImage.fromURL(planUrl, {
      crossOrigin: 'anonymous'
    }).then((fabricImg) => {
      fabricImg.set({
        left: 0,
        top: 0,
        selectable: false,
      });

      // Scale image to fit canvas
      const canvasWidth = 1000;
      const canvasHeight = 700;
      const imgScale = Math.min(canvasWidth / (fabricImg.width || 1), canvasHeight / (fabricImg.height || 1));
      fabricImg.scale(imgScale);

      canvas.add(fabricImg);
      canvas.renderAll();
    }).catch((err) => {
      console.error("Failed to load plan image:", err);
      toast.error("Failed to load plan image");
    });

    // Mouse down handler for measuring
    const handleMouseDown = (e: any) => {
      if (tool !== "measure" || !e.pointer) return;
      setMeasureStart({ x: e.pointer.x, y: e.pointer.y });
      setMeasuring(true);
    };

    // Mouse up handler for measuring
    const handleMouseUp = (e: any) => {
      if (tool !== "measure" || !measuring || !measureStart || !e.pointer) return;

      const line = new Line(
        [measureStart.x, measureStart.y, e.pointer.x, e.pointer.y],
        {
          stroke: "#FF6B6B",
          strokeWidth: 2,
          selectable: true,
        }
      );

      const distance = Math.sqrt(
        Math.pow(e.pointer.x - measureStart.x, 2) +
        Math.pow(e.pointer.y - measureStart.y, 2)
      );

      const pixelDistance = distance.toFixed(2);
      let realDistance = pixelDistance;

      if (scaleRatio) {
        const ratio = parseFloat(scaleRatio);
        if (!isNaN(ratio)) {
          realDistance = (distance * ratio).toFixed(2);
        }
      }

      const text = new Textbox(`${realDistance}px`, {
        left: (measureStart.x + e.pointer.x) / 2,
        top: (measureStart.y + e.pointer.y) / 2 - 20,
        fontSize: 14,
        fill: "#FF6B6B",
        backgroundColor: "white",
        selectable: true,
      });

      canvas.add(line);
      canvas.add(text);
      canvas.renderAll();

      setMeasuring(false);
      setMeasureStart(null);

      toast.success(`Measured: ${realDistance} units`);
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:up", handleMouseUp);

    return () => {
      canvas.dispose();
    };
  }, [planUrl]);

  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = tool === "pan";
  }, [tool, fabricCanvas]);

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
      if (obj instanceof Line || obj instanceof Textbox) {
        fabricCanvas.remove(obj);
      }
    });
    fabricCanvas.renderAll();
    toast.success("Measurements cleared");
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex gap-2">
            <Button
              variant={tool === "pan" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("pan")}
            >
              <Move className="h-4 w-4 mr-2" />
              Pan
            </Button>
            <Button
              variant={tool === "measure" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("measure")}
            >
              <Ruler className="h-4 w-4 mr-2" />
              Measure
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4 mr-2" />
              Zoom In
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4 mr-2" />
              Zoom Out
            </Button>
          </div>

          <div className="flex-1">
            <Label className="text-xs">Scale Ratio (px to real unit)</Label>
            <Input
              type="number"
              step="0.01"
              value={scaleRatio}
              onChange={(e) => setScaleRatio(e.target.value)}
              placeholder="e.g., 0.1 (10px = 1m)"
              className="h-9"
            />
          </div>

          <Button variant="destructive" size="sm" onClick={handleClearMeasurements}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Measurements
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="border border-border rounded-lg overflow-hidden bg-background">
          <canvas ref={canvasRef} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Use the Measure tool to click and drag on the plan to measure distances. Set the scale ratio for accurate measurements.
        </p>
      </Card>
    </div>
  );
};
