import React, { useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDFUploadManager } from './PDFUploadManager';
import { InteractiveCanvas } from './InteractiveCanvas';
import { ScalingCalibrator } from './ScalingCalibrator';
import { MeasurementToolbar } from './MeasurementToolbar';
import { useTakeoffState } from '@/hooks/useTakeoffState';
import { WorldPoint, MeasurementUnit } from '@/lib/takeoff/types';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportMeasurementsToCSV, exportMeasurementsToJSON } from '@/lib/takeoff/export';
import { Card } from '@/components/ui/card';

interface PDFTakeoffProps {
  projectId: string;
  estimateId?: string;
  onAddCostItems?: (items: any[]) => void;
}

export const PDFTakeoff = ({ projectId, estimateId, onAddCostItems }: PDFTakeoffProps) => {
  const { state, dispatch } = useTakeoffState();
  const [activeTab, setActiveTab] = React.useState('upload');
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [manualCalibrationPoints, setManualCalibrationPoints] = useState<[WorldPoint, WorldPoint] | null>(null);
  const [pdfViewport, setPdfViewport] = useState<{ width: number; height: number } | null>(null);
  const [pageFilter, setPageFilter] = useState<number | 'all'>('all');
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Filter measurements by page
  const filteredMeasurements = useMemo(() => {
    if (pageFilter === 'all') return state.measurements;
    return state.measurements.filter((m) => m.pageIndex === pageFilter);
  }, [pageFilter, state.measurements]);

  // Calculate totals by unit type
  const totalsByUnit = useMemo(() => {
    return filteredMeasurements.reduce<Record<MeasurementUnit, number>>((acc, measurement) => {
      const current = acc[measurement.unit] || 0;
      acc[measurement.unit] = current + measurement.realValue * (measurement.isDeduction ? -1 : 1);
      return acc;
    }, { LM: 0, M2: 0, M3: 0, count: 0 });
  }, [filteredMeasurements]);

  // Download helper
  const downloadFile = (filename: string, content: string, mime = 'text/plain') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

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
    const container = canvasContainerRef.current;
    const containerWidth = container?.clientWidth || 1200;
    const containerHeight = container?.clientHeight || 800;

    if (pdfViewport) {
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
                  pdfViewport={pdfViewport}
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

                <div className="h-[800px]" ref={canvasContainerRef}>
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
                      const container = canvasContainerRef.current;
                      const containerWidth = container?.clientWidth || 1200;
                      const containerHeight = container?.clientHeight || 800;
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
              <div className="lg:col-span-1 space-y-4">
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Measurements</h3>
                    <Select
                      value={String(pageFilter)}
                      onValueChange={(val) => setPageFilter(val === 'all' ? 'all' : Number(val))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="All pages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All pages</SelectItem>
                        {Array.from({ length: state.pageCount || 1 }).map((_, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            Page {idx + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      size="sm"
                      onClick={() =>
                        downloadFile(
                          'measurements.csv',
                          exportMeasurementsToCSV(filteredMeasurements),
                          'text/csv'
                        )
                      }
                      disabled={!filteredMeasurements.length}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      size="sm"
                      onClick={() =>
                        downloadFile(
                          'measurements.json',
                          exportMeasurementsToJSON(filteredMeasurements),
                          'application/json'
                        )
                      }
                      disabled={!filteredMeasurements.length}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="space-y-3 max-h-[520px] overflow-y-auto">
                    {filteredMeasurements.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No measurements yet</p>
                    ) : (
                      filteredMeasurements.map((m) => (
                        <div key={m.id} className="p-3 border border-border/60 rounded-md space-y-2 bg-muted/40">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="capitalize">{m.type}</span>
                            <span className="font-medium">Page {m.pageIndex + 1}</span>
                          </div>
                          <Input
                            value={m.label}
                            onChange={(e) =>
                              dispatch({
                                type: 'UPDATE_MEASUREMENT',
                                payload: { id: m.id, updates: { label: e.target.value } }
                              })
                            }
                            placeholder="Label"
                            className="h-8"
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold">{m.realValue.toFixed(2)}</span>
                            <Select
                              value={m.unit}
                              onValueChange={(unit: MeasurementUnit) =>
                                dispatch({
                                  type: 'UPDATE_MEASUREMENT',
                                  payload: { id: m.id, updates: { unit } }
                                })
                              }
                            >
                              <SelectTrigger className="w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LM">LM</SelectItem>
                                <SelectItem value="M2">M²</SelectItem>
                                <SelectItem value="M3">M³</SelectItem>
                                <SelectItem value="count">Count</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="ml-auto flex items-center gap-2">
                              <span 
                                className="inline-flex h-3 w-3 rounded-full" 
                                style={{ backgroundColor: m.color }} 
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => dispatch({ type: 'DELETE_MEASUREMENT', payload: m.id })}
                                aria-label="Delete measurement"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(m.timestamp).toLocaleString()} | {m.isDeduction ? 'Deduction' : 'Primary'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {filteredMeasurements.length > 0 && (
                    <div className="mt-4 pt-3 border-t space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total measurements</span>
                        <span className="font-semibold">{filteredMeasurements.length}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>LM: {totalsByUnit.LM.toFixed(2)}</span>
                        <span>M²: {totalsByUnit.M2.toFixed(2)}</span>
                        <span>M³: {totalsByUnit.M3.toFixed(2)}</span>
                        <span>Count: {totalsByUnit.count.toFixed(0)}</span>
                      </div>
                    </div>
                  )}
                </Card>
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
