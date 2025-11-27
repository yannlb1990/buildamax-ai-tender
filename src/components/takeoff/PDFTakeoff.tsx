import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDFUploadManager } from './PDFUploadManager';
import { PDFRenderer } from './PDFRenderer';
import { ScalingCalibrator } from './ScalingCalibrator';
import { MeasurementToolbar } from './MeasurementToolbar';
import { useTakeoffState } from '@/hooks/useTakeoffState';
import { toast } from 'sonner';

interface PDFTakeoffProps {
  projectId: string;
  estimateId?: string;
  onAddCostItems?: (items: any[]) => void;
}

export const PDFTakeoff = ({ projectId, estimateId, onAddCostItems }: PDFTakeoffProps) => {
  const { state, dispatch } = useTakeoffState();
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [manualCalibrationPoints, setManualCalibrationPoints] = useState<any>(null);

  const handleZoomIn = () => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: Math.min(state.zoomLevel + 0.25, 4) });
  };

  const handleZoomOut = () => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: Math.max(state.zoomLevel - 0.25, 0.25) });
  };

  const handleRotate = () => {
    setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  };

  const handleFitToScreen = () => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: 1 });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="measure" disabled={!state.pdfFile}>Measure</TabsTrigger>
          <TabsTrigger value="costs" disabled={!state.measurements.length}>Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <PDFUploadManager
            projectId={projectId}
            onUploadComplete={(pdfFile) => {
              dispatch({ type: 'SET_PDF_FILE', payload: pdfFile });
              toast.success('PDF uploaded successfully');
            }}
            onError={(error) => {
              dispatch({ type: 'SET_UPLOAD_ERROR', payload: error });
            }}
          />
        </TabsContent>

        <TabsContent value="measure" className="space-y-4">
          {state.pdfFile && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Left Sidebar - Calibration */}
              <div className="lg:col-span-1 space-y-4">
                <ScalingCalibrator
                  currentScale={state.currentScale}
                  isCalibrated={state.isCalibrated}
                  onScaleSet={(scale) => {
                    dispatch({
                      type: 'SET_SCALE',
                      payload: { pageIndex: state.currentPageIndex, scale }
                    });
                  }}
                  onManualCalibrationStart={() => {
                    toast.info('Click two points on a known dimension');
                    // Enable manual calibration mode
                  }}
                  manualPoints={manualCalibrationPoints}
                />
              </div>

              {/* Center - Canvas */}
              <div className="lg:col-span-2 space-y-4">
                <MeasurementToolbar
                  activeTool={state.activeTool}
                  onToolSelect={(tool) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool })}
                  deductionMode={state.deductionMode}
                  onDeductionToggle={() =>
                    dispatch({ type: 'SET_DEDUCTION_MODE', payload: !state.deductionMode })
                  }
                  onUndo={() => dispatch({ type: 'UNDO' })}
                  onRedo={() => dispatch({ type: 'REDO' })}
                  canUndo={state.historyIndex > 0}
                  canRedo={state.historyIndex < state.history.length - 1}
                  disabled={!state.isCalibrated}
                />

                <div className="border border-border rounded-lg p-4">
                  <PDFRenderer
                    pdfUrl={state.pdfFile.url}
                    pageIndex={state.currentPageIndex}
                    zoomLevel={state.zoomLevel}
                    rotation={rotation}
                    onRenderComplete={(canvas, viewport) => {
                      console.log('PDF rendered', viewport);
                    }}
                  />
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-16 text-center">
                    {Math.round(state.zoomLevel * 100)}%
                  </span>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRotate}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleFitToScreen}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Right Sidebar - Measurements */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Measurements</h3>
                  <div className="space-y-2">
                    {state.measurements.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No measurements yet</p>
                    ) : (
                      state.measurements.map((m) => (
                        <div key={m.id} className="text-sm p-2 bg-muted rounded">
                          <p className="font-medium">{m.label || 'Unnamed'}</p>
                          <p className="text-muted-foreground">
                            {m.realValue.toFixed(2)} {m.unit}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="costs">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cost linking functionality coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
