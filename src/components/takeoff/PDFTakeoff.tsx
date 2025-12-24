import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Download, ZoomIn, ZoomOut, RotateCw, Maximize2, ChevronLeft, ChevronRight, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDFUploadManager } from './PDFUploadManager';
import { InteractiveCanvas } from './InteractiveCanvas';
import { ScalingCalibrator } from './ScalingCalibrator';
import { MeasurementToolbar } from './MeasurementToolbar';
import { TakeoffTableEnhanced } from './TakeoffTableEnhanced';
import { CostEstimator } from './CostEstimator';
import { useTakeoffState } from '@/hooks/useTakeoffState';
import { WorldPoint, MeasurementUnit, Measurement, PDFViewportData, CostItem } from '@/lib/takeoff/types';
import { fetchNCCCode } from '@/lib/takeoff/nccCodeFetcher';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportMeasurementsToCSV, exportMeasurementsToJSON } from '@/lib/takeoff/export';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [calibrationOpen, setCalibrationOpen] = useState(true);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initialFitDoneRef = useRef(false);

  // Reset initial fit when PDF changes
  React.useEffect(() => {
    if (state.pdfFile) {
      initialFitDoneRef.current = false;
    }
  }, [state.pdfFile?.url]);

  // Filter measurements by page
  const filteredMeasurements = useMemo(() => {
    if (pageFilter === 'all') return state.measurements;
    return state.measurements.filter((m) => m.pageIndex === pageFilter);
  }, [pageFilter, state.measurements]);

  // Calculate totals by unit type
  const totalsByUnit = useMemo(() => {
    return filteredMeasurements.reduce<Record<MeasurementUnit, number>>((acc, measurement) => {
      const current = acc[measurement.unit] || 0;
      acc[measurement.unit] = current + measurement.realValue;
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

  // FIX: Memoize callbacks to prevent infinite re-renders
  const handleMeasurementComplete = useCallback((measurement: Measurement) => {
    dispatch({ type: 'ADD_MEASUREMENT', payload: measurement });
    toast.success('Measurement added');
  }, [dispatch]);

  const handleCalibrationPointsSet = useCallback((points: [WorldPoint, WorldPoint]) => {
    setManualCalibrationPoints(points);
    toast.info('Enter real-world distance below');
  }, []);

  const handleTransformChange = useCallback((transform: Partial<typeof state.transform>) => {
    dispatch({ type: 'SET_TRANSFORM', payload: transform });
  }, [dispatch]);

  const handleViewportReady = useCallback((viewport: PDFViewportData) => {
    setPdfViewport({ width: viewport.width, height: viewport.height });
    
    // CRITICAL: Only fit on initial load, not on every callback
    if (!initialFitDoneRef.current) {
      initialFitDoneRef.current = true;
      
      // Use setTimeout to ensure container has been laid out
      setTimeout(() => {
        const container = canvasContainerRef.current;
        const containerWidth = container?.clientWidth || 1200;
        const containerHeight = container?.clientHeight || 800;
        
        const fitZoom = Math.min(
          containerWidth / viewport.width,
          containerHeight / viewport.height,
          1.5 // Cap at 150% to prevent oversized display
        );
        
        dispatch({ type: 'SET_TRANSFORM', payload: { zoom: fitZoom, panX: 0, panY: 0 } });
      }, 50);
    }
  }, [dispatch]);

  // New callbacks for upgraded components
  const handleCalibrationCancel = useCallback(() => {
    setManualCalibrationPoints(null);
    dispatch({ type: 'SET_CALIBRATION_MODE', payload: null });
  }, [dispatch]);

  const handleResetScale = useCallback(() => {
    dispatch({ type: 'RESET_SCALE', payload: state.currentPageIndex });
  }, [dispatch, state.currentPageIndex]);

  const handleFetchNCCCode = useCallback(async (id: string, area: string, materials: string[]) => {
    return await fetchNCCCode(area, materials);
  }, []);

  const handleAddToEstimate = useCallback((measurementIds: string[]) => {
    toast.success(`Added ${measurementIds.length} items to estimate`);
    // Future: integrate with cost items
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Tool selection shortcuts
      if (e.key === '1' || e.key.toLowerCase() === 'l') {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'line' });
        toast.info('Line tool selected');
      }
      if (e.key === '2' || e.key.toLowerCase() === 'r') {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'rectangle' });
        toast.info('Rectangle tool selected');
      }
      if (e.key === '3' || e.key.toLowerCase() === 'p') {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'polygon' });
        toast.info('Polygon tool selected');
      }
      if (e.key === '4' || e.key.toLowerCase() === 'c') {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'circle' });
        toast.info('Circle tool selected');
      }
      if (e.key === '5' || e.key.toLowerCase() === 'n') {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'count' });
        toast.info('Count tool selected');
      }
      if (e.key.toLowerCase() === 'h' || e.key === ' ') {
        e.preventDefault();
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'pan' });
      }
      if (e.key.toLowerCase() === 'v') {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
      if (e.key.toLowerCase() === 'e') {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'eraser' });
      }
      
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
      
      // Escape - cancel current tool
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
      
      // Delete - remove last measurement
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!(e.target instanceof HTMLInputElement)) {
          dispatch({ type: 'DELETE_LAST_MEASUREMENT' });
        }
      }
      
      // Zoom shortcuts
      if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      }
      if (e.key === '-') {
        handleZoomOut();
      }
      if (e.key === '0') {
        handleFitToScreen();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, handleZoomIn, handleZoomOut, handleFitToScreen]);

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
            <div className="space-y-4">
              {/* Top Bar: Toolbar + Controls + Page Nav */}
              <div className="flex items-center gap-4 flex-wrap">
                <MeasurementToolbar
                  activeTool={state.activeTool}
                  onToolSelect={(tool) => {
                    dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool });
                    if (tool === 'eraser') {
                      dispatch({ type: 'DELETE_LAST_MEASUREMENT' });
                      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
                    }
                  }}
                  onUndo={() => dispatch({ type: 'UNDO' })}
                  onRedo={() => dispatch({ type: 'REDO' })}
                  canUndo={state.historyIndex > 0}
                  canRedo={state.historyIndex < state.history.length - 1}
                  measurementToolsDisabled={!state.isCalibrated}
                />

                {/* Zoom/Rotate Controls */}
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-14 text-center">
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

                {/* Export Buttons */}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
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
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
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
                    <Download className="h-4 w-4 mr-1" />
                    JSON
                  </Button>
                </div>
              </div>

              {/* Main Content: Calibration (collapsible) + Canvas */}
              <div className="flex gap-4">
                {/* Collapsible Calibration Panel */}
                <Collapsible open={calibrationOpen} onOpenChange={setCalibrationOpen}>
                  <Card className="w-72 shrink-0">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                        <span className="font-semibold text-sm">Scale Calibration</span>
                        {calibrationOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-3 pt-0">
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
                          onManualCalibrationCancel={handleCalibrationCancel}
                          onResetScale={handleResetScale}
                          manualPoints={manualCalibrationPoints}
                          onCalibrationComplete={() => {
                            setManualCalibrationPoints(null);
                            dispatch({ type: 'SET_CALIBRATION_MODE', payload: null });
                          }}
                          pdfViewport={pdfViewport}
                        />
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Canvas */}
                <div className="flex-1 h-[60vh] min-h-[500px]" ref={canvasContainerRef}>
                  <InteractiveCanvas
                    pdfUrl={state.pdfFile.url}
                    pageIndex={state.currentPageIndex}
                    transform={state.transform}
                    activeTool={state.activeTool}
                    isCalibrated={state.isCalibrated}
                    unitsPerMetre={state.currentScale?.unitsPerMetre || null}
                    calibrationMode={state.calibrationMode}
                    selectedColor={state.selectedColor}
                    onMeasurementComplete={handleMeasurementComplete}
                    onCalibrationPointsSet={handleCalibrationPointsSet}
                    onTransformChange={handleTransformChange}
                    onViewportReady={handleViewportReady}
                    onDeleteLastMeasurement={() => dispatch({ type: 'DELETE_LAST_MEASUREMENT' })}
                  />
                </div>
              </div>

              {/* Takeoff Table - Full Width Below Canvas */}
              <TakeoffTableEnhanced
                measurements={filteredMeasurements}
                selectedMeasurementId={selectedMeasurementId}
                onSelectMeasurement={setSelectedMeasurementId}
                onUpdateMeasurement={(id, updates) => {
                  dispatch({
                    type: 'UPDATE_MEASUREMENT',
                    payload: { id, updates }
                  });
                }}
                onDeleteMeasurement={(id) => {
                  dispatch({ type: 'DELETE_MEASUREMENT', payload: id });
                }}
                onAddToEstimate={handleAddToEstimate}
                onAddCostItem={(item) => {
                  dispatch({ type: 'ADD_COST_ITEM', payload: item });
                }}
              />

              {/* Summary Footer */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm">
                    <span className="font-medium">Summary:</span>
                    <span>
                      <span className="text-muted-foreground">Total:</span>{' '}
                      <span className="font-semibold">{filteredMeasurements.length}</span> measurements
                    </span>
                    {totalsByUnit.LM > 0 && (
                      <span className="font-mono">
                        <span className="text-muted-foreground">LM:</span> {totalsByUnit.LM.toFixed(2)}
                      </span>
                    )}
                    {totalsByUnit.M2 > 0 && (
                      <span className="font-mono">
                        <span className="text-muted-foreground">m²:</span> {totalsByUnit.M2.toFixed(2)}
                      </span>
                    )}
                    {totalsByUnit.M3 > 0 && (
                      <span className="font-mono">
                        <span className="text-muted-foreground">m³:</span> {totalsByUnit.M3.toFixed(3)}
                      </span>
                    )}
                    {totalsByUnit.count > 0 && (
                      <span className="font-mono">
                        <span className="text-muted-foreground">EA:</span> {totalsByUnit.count.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(pageFilter)}
                      onValueChange={(val) => setPageFilter(val === 'all' ? 'all' : Number(val))}
                    >
                      <SelectTrigger className="w-32 h-8">
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
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="costs">
          <CostEstimator
            measurements={state.measurements}
            costItems={state.costItems}
            onAddCostItem={(item) => dispatch({ type: 'ADD_COST_ITEM', payload: item })}
            onUpdateCostItem={(id, updates) => dispatch({ type: 'UPDATE_COST_ITEM', payload: { id, updates } })}
            onDeleteCostItem={(id) => dispatch({ type: 'DELETE_COST_ITEM', payload: id })}
            onLinkMeasurement={(measurementId, costItemId) => {
              dispatch({ type: 'UPDATE_MEASUREMENT', payload: { id: measurementId, updates: { linkedCostItem: costItemId } } });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
