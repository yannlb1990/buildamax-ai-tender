import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDFUploadManager } from './PDFUploadManager';
import { InteractiveCanvas } from './InteractiveCanvas';
import { ScalingCalibrator } from './ScalingCalibrator';
import { MeasurementToolbar } from './MeasurementToolbar';
import { useTakeoffState } from '@/hooks/useTakeoffState';
import { Point } from '@/lib/takeoff/types';
import { toast } from 'sonner';

interface PDFTakeoffProps {
  projectId: string;
  estimateId?: string;
  onAddCostItems?: (items: any[]) => void;
}

export const PDFTakeoff = ({ projectId, estimateId, onAddCostItems }: PDFTakeoffProps) => {
  const { state, dispatch } = useTakeoffState();
  const [activeTab, setActiveTab] = React.useState('upload');
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [manualCalibrationPoints, setManualCalibrationPoints] = useState<[Point, Point] | null>(null);
  const [pdfViewport, setPdfViewport] = useState<{ width: number; height: number } | null>(null);

  // Auto-switch to measure tab after upload
  React.useEffect(() => {
    if (state.pdfFile && activeTab === 'upload') {
      setActiveTab('measure');
      toast.success('PDF uploaded! Set scale to start measuring');
    }
  }, [state.pdfFile, activeTab]);

  const handleZoomIn = () => {
    dispatch({ 
      type: 'SET_TRANSFORM', 
      payload: { zoom: Math.min(state.transform.zoom + 0.25, 4) } 
    });
  };

  const handleZoomOut = () => {
    dispatch({ 
      type: 'SET_TRANSFORM', 
      payload: { zoom: Math.max(state.transform.zoom - 0.25, 0.1) } 
    });
  };

  const handleRotate = () => {
    const newRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
    setRotation(newRotation);
    dispatch({ 
      type: 'SET_TRANSFORM', 
      payload: { rotation: newRotation } 
    });
  };

  const handleFitToScreen = () => {
    if (pdfViewport) {
      // Calculate fit zoom based on viewport and container size
      const containerWidth = Math.max(1200, 800);
      const containerHeight = Math.max(800, 600);
      const fitZoom = Math.min(
        containerWidth / pdfViewport.width,
        containerHeight / pdfViewport.height
      );
      dispatch({ 
        type: 'SET_TRANSFORM', 
        payload: { zoom: fitZoom, panX: 0, panY: 0 } 
      });
    } else {
      dispatch({ 
        type: 'SET_TRANSFORM', 
        payload: { zoom: 1, panX: 0, panY: 0 } 
      });
    }
  };

  const handlePagePrevious = () => {
    if (state.currentPageIndex > 0) {
      dispatch({ type: 'SET_CURRENT_PAGE', payload: state.currentPageIndex - 1 });
    }
  };

  const handlePageNext = () => {
    if (state.pdfFile && state.currentPageIndex < state.pdfFile.pageCount - 1) {
      dispatch({ type: 'SET_CURRENT_PAGE', payload: state.currentPageIndex + 1 });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            }}
            onError={(error) => {
              dispatch({ type: 'SET_UPLOAD_ERROR', payload: error });
              toast.error(error);
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
                    toast.success('Scale set successfully');
                  }}
                  onManualCalibrationStart={() => {
                    dispatch({ type: 'SET_CALIBRATION_MODE', payload: 'manual' });
                    toast.info('Click two points on a known dimension');
                  }}
                  manualPoints={manualCalibrationPoints}
                  onCalibrationComplete={() => {
                    setManualCalibrationPoints(null);
                    dispatch({ type: 'SET_CALIBRATION_MODE', payload: null });
                  }}
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
                  disabled={!state.isCalibrated && state.activeTool !== 'pan'}
                />

                {/* Canvas Controls */}
                <div className="flex items-center gap-2 justify-between p-2 bg-card border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-16 text-center">
                      {Math.round(state.transform.zoom * 100)}%
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

                  {/* Page Navigation */}
                  {state.pdfFile && state.pdfFile.pageCount > 1 && (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handlePagePrevious}
                        disabled={state.currentPageIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">
                        Page {state.currentPageIndex + 1} / {state.pdfFile.pageCount}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handlePageNext}
                        disabled={state.currentPageIndex === state.pdfFile.pageCount - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="h-[800px]">
                  <InteractiveCanvas
                    pdfUrl={state.pdfFile.url}
                    pageIndex={state.currentPageIndex}
                    transform={state.transform}
                    activeTool={state.activeTool}
                    isCalibrated={state.isCalibrated}
                    unitsPerMetre={state.currentScale?.unitsPerMetre || null}
                    calibrationMode={state.calibrationMode}
                    deductionMode={state.deductionMode}
                    selectedColor={state.selectedColor}
                    onMeasurementComplete={(measurement) => {
                      dispatch({ type: 'ADD_MEASUREMENT', payload: measurement });
                      toast.success('Measurement added');
                    }}
                    onCalibrationPointsSet={(points) => {
                      setManualCalibrationPoints(points);
                      toast.info('Enter real-world distance below');
                    }}
                    onTransformChange={(transform) => {
                      dispatch({ type: 'SET_TRANSFORM', payload: transform });
                    }}
                    onViewportReady={(viewport) => {
                      setPdfViewport({ width: viewport.width, height: viewport.height });
                      // Auto-fit to container on initial load
                      const containerWidth = Math.max(1200, 800);
                      const containerHeight = Math.max(800, 600);
                      const fitZoom = Math.min(
                        containerWidth / viewport.width,
                        containerHeight / viewport.height
                      );
                      dispatch({ 
                        type: 'SET_TRANSFORM', 
                        payload: { zoom: fitZoom, panX: 0, panY: 0 } 
                      });
                    }}
                  />
                </div>
              </div>

              {/* Right Sidebar - Measurements */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Measurements</h3>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {state.measurements.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No measurements yet</p>
                    ) : (
                      state.measurements.map((m) => (
                        <div key={m.id} className="text-sm p-2 bg-muted rounded">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="font-medium capitalize">{m.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(m.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                            <span className="font-semibold">
                              {m.realValue.toFixed(2)} {m.unit}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {state.measurements.length > 0 && (
                    <div className="mt-4 pt-4 border-t space-y-1">
                      <div className="text-sm flex justify-between">
                        <span>Total Measurements:</span>
                        <span className="font-semibold">{state.measurements.length}</span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span>Total Value:</span>
                        <span className="font-semibold">
                          {state.measurements.reduce((sum, m) => sum + m.realValue, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
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
