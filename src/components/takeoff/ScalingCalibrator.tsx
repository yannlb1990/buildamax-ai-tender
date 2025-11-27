import { useState } from 'react';
import { Ruler, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { calculatePresetScale, calculateManualScale } from '@/lib/takeoff/calculations';
import { ScaleData, Point } from '@/lib/takeoff/types';
import { toast } from 'sonner';

interface ScalingCalibratorProps {
  currentScale: ScaleData | null;
  isCalibrated: boolean;
  onScaleSet: (scale: ScaleData) => void;
  onManualCalibrationStart: () => void;
  manualPoints: [Point, Point] | null;
}

export const ScalingCalibrator = ({
  currentScale,
  isCalibrated,
  onScaleSet,
  onManualCalibrationStart,
  manualPoints
}: ScalingCalibratorProps) => {
  const [calibrationMode, setCalibrationMode] = useState<'preset' | 'manual'>('preset');
  const [selectedScale, setSelectedScale] = useState('1:100');
  const [manualDistance, setManualDistance] = useState('');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');

  const presetScales = ['1:20', '1:50', '1:100', '1:200', '1:500'];

  const handlePresetScale = () => {
    const scale = calculatePresetScale(selectedScale);
    onScaleSet(scale);
    toast.success(`Scale set to ${selectedScale}`);
  };

  const handleManualCalibrationComplete = () => {
    if (!manualPoints || manualPoints.length !== 2) {
      toast.error('Please draw a calibration line on the plan');
      return;
    }

    const distance = parseFloat(manualDistance);
    if (isNaN(distance) || distance <= 0) {
      toast.error('Please enter a valid distance');
      return;
    }

    const scale = calculateManualScale(
      manualPoints[0],
      manualPoints[1],
      distance,
      unit
    );

    onScaleSet(scale);
    toast.success('Manual calibration complete');
    setManualDistance('');
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Ruler className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Scale Calibration</h3>
        {isCalibrated && (
          <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
        )}
      </div>

      {isCalibrated && currentScale && (
        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            ✓ Scale Active: {currentScale.scaleFactor ? `1:${currentScale.scaleFactor}` : 'Manual'}
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            {currentScale.pixelsPerUnit.toFixed(2)} pixels per metre
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant={calibrationMode === 'preset' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCalibrationMode('preset')}
          className="flex-1"
        >
          Preset Scale
        </Button>
        <Button
          variant={calibrationMode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCalibrationMode('manual')}
          className="flex-1"
        >
          Manual Calibration
        </Button>
      </div>

      {calibrationMode === 'preset' && (
        <div className="space-y-3">
          <div>
            <Label>Select Scale</Label>
            <Select value={selectedScale} onValueChange={setSelectedScale}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presetScales.map(scale => (
                  <SelectItem key={scale} value={scale}>
                    {scale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handlePresetScale} className="w-full">
            Apply Scale
          </Button>
        </div>
      )}

      {calibrationMode === 'manual' && (
        <div className="space-y-3">
          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-1">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click "Start Calibration" below</li>
              <li>Click two points on a known dimension</li>
              <li>Enter the real-world distance</li>
              <li>Click "Apply" to set scale</li>
            </ol>
          </div>

          {!manualPoints && (
            <Button onClick={onManualCalibrationStart} className="w-full">
              Start Calibration
            </Button>
          )}

          {manualPoints && (
            <>
              <div className="space-y-2">
                <Label>Real-World Distance</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 5"
                    value={manualDistance}
                    onChange={(e) => setManualDistance(e.target.value)}
                    min="0"
                    step="0.1"
                  />
                  <Select value={unit} onValueChange={(v: 'metric' | 'imperial') => setUnit(v)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">metres</SelectItem>
                      <SelectItem value="imperial">feet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleManualCalibrationComplete} className="w-full">
                Apply Manual Scale
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
};
