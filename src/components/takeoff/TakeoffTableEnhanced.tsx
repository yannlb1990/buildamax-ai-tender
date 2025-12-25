import { useState, useMemo } from 'react';
import { Check, Trash2, ChevronDown, ChevronRight, Plus, Search, X, Calculator, AlertTriangle, Lightbulb, Package, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Measurement, MeasurementUnit, MeasurementArea, MATERIAL_CATEGORIES, StructureType, LiningSides, CostItem } from '@/lib/takeoff/types';
import { calculateRelatedMaterials } from '@/lib/takeoff/materialCalculator';
import { calculatedMaterialsToCostItems } from '@/lib/takeoff/estimateConnector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const AREA_OPTIONS: MeasurementArea[] = [
  'Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Dining Room', 'Laundry',
  'Garage', 'Patio', 'Balcony', 'Hallway', 'Entry', 'Office', 'Storage',
  'Utility', 'Ensuite', 'WC', 'External', 'Other'
];

const STRUCTURE_OPTIONS: { value: StructureType; label: string }[] = [
  { value: 'external_wall', label: 'External Wall' },
  { value: 'internal_wall', label: 'Internal Wall' },
  { value: 'load_bearing', label: 'Load Bearing Wall' },
  { value: 'non_load_bearing', label: 'Non-Load Bearing' },
  { value: 'column', label: 'Column' },
  { value: 'floor', label: 'Floor' },
  { value: 'wet_area', label: 'Wet Area' },
];

const FRAMING_OPTIONS = [
  '90mm Timber Stud',
  '70mm Timber Stud',
  '90mm Steel Stud',
  '70mm Steel Stud',
  'Concrete Block',
  'Brick',
  'None'
];

const LINING_OPTIONS = [
  '10mm Plasterboard',
  '13mm Plasterboard',
  '16mm Plasterboard',
  '6mm Villaboard',
  'Tiles',
  'Render',
  'Cladding',
  'None'
];

const INSULATION_OPTIONS = [
  'R2.5 Batts',
  'R3.0 Batts',
  'R4.0 Batts',
  'Foam Board',
  'Reflective',
  'None'
];

const FLOORING_OPTIONS = [
  'Tiles',
  'Timber',
  'Carpet',
  'Vinyl',
  'Concrete',
  'Epoxy',
  'Polished Concrete',
  'None'
];

interface EnhancedMeasurement extends Measurement {
  area?: MeasurementArea;
  materials?: string[];
  nccCode?: string;
  validated?: boolean;
  addedToEstimate?: boolean;
  structureType?: StructureType;
  framing?: string;
  lining?: { type: string; sides: LiningSides };
  insulation?: string;
  flooring?: string;
  notes?: string;
}

interface TakeoffTableEnhancedProps {
  measurements: Measurement[];
  onUpdateMeasurement: (id: string, updates: Partial<EnhancedMeasurement>) => void;
  onDeleteMeasurement: (id: string) => void;
  onAddToEstimate: (measurementIds: string[]) => void;
  onFetchNCCCode?: (measurementId: string, area: string, materials: string[]) => Promise<string>;
  onAddCostItem?: (item: CostItem) => void;
}

export const TakeoffTableEnhanced = ({
  measurements,
  onUpdateMeasurement,
  onDeleteMeasurement,
  onAddToEstimate,
  onFetchNCCCode,
  onAddCostItem,
}: TakeoffTableEnhancedProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [groupByArea, setGroupByArea] = useState(false);

  const enhancedMeasurements = measurements as EnhancedMeasurement[];

  const filteredMeasurements = useMemo(() => {
    if (!searchFilter) return enhancedMeasurements;
    const lower = searchFilter.toLowerCase();
    return enhancedMeasurements.filter(m =>
      m.label.toLowerCase().includes(lower) ||
      m.area?.toLowerCase().includes(lower) ||
      m.materials?.some(mat => mat.toLowerCase().includes(lower)) ||
      m.structureType?.toLowerCase().includes(lower)
    );
  }, [enhancedMeasurements, searchFilter]);

  const groupedMeasurements = useMemo(() => {
    if (!groupByArea) return { All: filteredMeasurements };
    return filteredMeasurements.reduce((acc, m) => {
      const area = m.area || 'Unassigned';
      if (!acc[area]) acc[area] = [];
      acc[area].push(m);
      return acc;
    }, {} as Record<string, EnhancedMeasurement[]>);
  }, [filteredMeasurements, groupByArea]);

  const totals = useMemo(() => {
    return enhancedMeasurements.reduce(
      (acc, m) => {
        acc[m.unit] = (acc[m.unit] || 0) + m.realValue;
        return acc;
      },
      { LM: 0, M2: 0, M3: 0, count: 0 } as Record<MeasurementUnit, number>
    );
  }, [enhancedMeasurements]);

  const validatedCount = useMemo(
    () => enhancedMeasurements.filter((m) => m.validated).length,
    [enhancedMeasurements]
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMeasurements.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMeasurements.map((m) => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // FIX #8: Auto-generate meaningful label from area and structure type
  const generateLabel = (area?: string, structureType?: string, type?: string, unit?: string): string => {
    if (area && structureType) {
      const structureLabel = STRUCTURE_OPTIONS.find(s => s.value === structureType)?.label;
      return `${area} ${structureLabel}`;
    } else if (area && type) {
      const typeLabel = type === 'line' ? 'Wall' : type === 'rectangle' ? 'Floor' : unit === 'count' ? 'Items' : type;
      return `${area} ${typeLabel}`;
    } else if (area) {
      return area;
    } else if (structureType) {
      const structureLabel = STRUCTURE_OPTIONS.find(s => s.value === structureType)?.label;
      return structureLabel || '';
    }
    return '';
  };

  // FIX #7: Export to Estimate - Create cost items from selected measurements
  const handleExportToEstimate = () => {
    if (!onAddCostItem) {
      toast.error('Cost item creation not available');
      return;
    }

    const selectedMeasurements = enhancedMeasurements.filter(m => selectedIds.has(m.id));

    if (selectedMeasurements.length === 0) {
      toast.error('No measurements selected');
      return;
    }

    const costItems: CostItem[] = selectedMeasurements.map(m => {
      // Determine which quantity and unit to use
      let quantity = m.realValue;
      let unit = m.unit;
      let notes = `Measurement: ${m.realValue.toFixed(2)} ${m.unit}`;

      // If calculated area exists (wall with height), use that
      if (m.calculatedArea && m.calculatedArea > 0) {
        quantity = m.calculatedArea;
        unit = 'M2';
        notes += ` × ${m.height}m height = ${m.calculatedArea.toFixed(2)} M²`;
      }
      // If calculated volume exists (slab with depth), use that
      else if (m.calculatedVolume && m.calculatedVolume > 0) {
        quantity = m.calculatedVolume;
        unit = 'M3';
        notes += ` × ${m.depth}m depth = ${m.calculatedVolume.toFixed(2)} M³`;
      }

      // Add structure info to notes
      if (m.structureType) {
        const structureLabel = STRUCTURE_OPTIONS.find(s => s.value === m.structureType)?.label;
        notes += ` | Structure: ${structureLabel}`;
      }

      // Create the cost item
      const item: CostItem = {
        id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: m.label || `${m.type} measurement`,
        category: m.area || 'General',
        description: m.materialDescription || '',
        quantity: quantity,
        unit: unit as MeasurementUnit,
        unitCost: 0, // User will fill in pricing
        totalCost: 0,
        linkedMeasurements: [m.id],
        notes: notes
      };

      return item;
    });

    // Add all cost items to estimate
    costItems.forEach(item => onAddCostItem(item));

    // Mark measurements as added to estimate
    selectedMeasurements.forEach(m => {
      onUpdateMeasurement(m.id, { addedToEstimate: true });
    });

    toast.success(`Exported ${costItems.length} item${costItems.length > 1 ? 's' : ''} to estimate`);
    setSelectedIds(new Set()); // Clear selection
  };

  const handleMaterialToggle = (measurementId: string, material: string) => {
    const measurement = enhancedMeasurements.find((m) => m.id === measurementId);
    const currentMaterials = measurement?.materials || [];
    const newMaterials = currentMaterials.includes(material)
      ? currentMaterials.filter((m) => m !== material)
      : [...currentMaterials, material];
    onUpdateMeasurement(measurementId, { materials: newMaterials });
  };

  const handleFetchNCC = async (measurement: EnhancedMeasurement) => {
    if (!onFetchNCCCode || !measurement.area) return;
    const code = await onFetchNCCCode(
      measurement.id,
      measurement.area,
      measurement.materials || []
    );
    onUpdateMeasurement(measurement.id, { nccCode: code });
  };

  const handleValidate = (id: string) => {
    const measurement = enhancedMeasurements.find((m) => m.id === id);
    onUpdateMeasurement(id, { validated: !measurement?.validated });
  };

  const renderMeasurementRow = (m: EnhancedMeasurement) => (
    <div key={m.id}>
      <div
        className={cn(
          'grid grid-cols-18 gap-2 p-2 border-b items-center text-sm',
          m.validated && 'bg-green-50 dark:bg-green-950/30',
          selectedIds.has(m.id) && 'bg-accent/50'
        )}
      >
        {/* Checkbox */}
        <div className="col-span-1 flex items-center">
          <Checkbox
            checked={selectedIds.has(m.id)}
            onCheckedChange={() => toggleSelect(m.id)}
          />
        </div>

        {/* Name - FIXED: Removed debug badge that was blocking input */}
        <div className="col-span-2">
          <Input
            value={m.label}
            onChange={(e) => onUpdateMeasurement(m.id, { label: e.target.value })}
            className="h-8 text-xs w-full"
            placeholder="Enter name..."
          />
        </div>

        {/* Area - FIX #8: Auto-generate label when area changes */}
        <div className="col-span-2">
          <Select
            value={m.area || ''}
            onValueChange={(v: MeasurementArea) => {
              const newLabel = generateLabel(v, m.structureType, m.type, m.unit);
              onUpdateMeasurement(m.id, {
                area: v,
                label: newLabel || m.label
              });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {AREA_OPTIONS.map((area) => (
                <SelectItem key={area} value={area} className="text-xs">
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Qty */}
        <div className="col-span-1 font-mono text-xs">
          {m.realValue.toFixed(2)}
        </div>

        {/* Unit */}
        <div className="col-span-1">
          <Select
            value={m.unit}
            onValueChange={(v: MeasurementUnit) => onUpdateMeasurement(m.id, { unit: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="LM">LM</SelectItem>
              <SelectItem value="M2">M²</SelectItem>
              <SelectItem value="M3">M³</SelectItem>
              <SelectItem value="count">EA</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* FIX #3-4: HEIGHT - Shows for walls (LM measurements) */}
        <div className="col-span-1">
          {(m.unit === 'LM' && (m.structureType === 'external_wall' || m.structureType === 'internal_wall' || m.structureType === 'load_bearing' || m.structureType === 'non_load_bearing')) ? (
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={m.height || ''}
                onChange={(e) => {
                  const height = parseFloat(e.target.value) || 0;

                  // FIX #4: Validation with warnings
                  if (height > 10) {
                    toast.error('Height cannot exceed 10m');
                    return;
                  }
                  if (height > 4.0 && height <= 10) {
                    toast.warning(`Height ${height.toFixed(1)}m is unusually high (typical: 2.4-3.0m)`);
                  }

                  // FIX #6: Precise calculation
                  const calculatedArea = parseFloat((m.realValue * height).toFixed(2));
                  onUpdateMeasurement(m.id, {
                    height,
                    calculatedArea
                  });
                }}
                className="h-8 text-xs pr-6"
                placeholder="2.4"
              />
              {/* FIX #7: Unit indicator */}
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium pointer-events-none">
                m
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        {/* FIX #4-5: DEPTH - Shows for floors/slabs (M2 measurements) */}
        <div className="col-span-1">
          {(m.unit === 'M2' && (m.structureType === 'floor' || m.flooring)) ? (
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="0.5"
                value={m.depth || ''}
                onChange={(e) => {
                  const depth = parseFloat(e.target.value) || 0;

                  // FIX #5: Validation with warnings
                  if (depth > 0.5) {
                    toast.error('Depth cannot exceed 0.5m (500mm)');
                    return;
                  }
                  if (depth > 0.3 && depth <= 0.5) {
                    toast.warning(`Depth ${depth.toFixed(2)}m is unusually deep (typical: 0.10-0.15m)`);
                  }

                  // FIX #6: Precise calculation
                  const calculatedVolume = depth > 0
                    ? parseFloat((m.realValue * depth).toFixed(3))
                    : 0;
                  onUpdateMeasurement(m.id, {
                    depth,
                    calculatedVolume
                  });
                }}
                className="h-8 text-xs pr-6"
                placeholder="0.15"
              />
              {/* FIX #7: Unit indicator */}
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium pointer-events-none">
                m
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        {/* CALCULATED VALUES - Shows calculated M2 or M3 */}
        <div className="col-span-2 font-mono text-xs">
          {m.calculatedArea ? (
            <span className="text-green-600 font-medium">
              {m.calculatedArea.toFixed(2)} M²
            </span>
          ) : m.calculatedVolume ? (
            <span className="text-blue-600 font-medium">
              {m.calculatedVolume.toFixed(2)} M³
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>

        {/* Structure Type */}
        <div className="col-span-2">
          {m.structureType ? (
            <Badge variant="secondary" className="text-[10px] px-1">
              {STRUCTURE_OPTIONS.find(s => s.value === m.structureType)?.label}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        {/* FIX #6: MATERIAL DESCRIPTION - Freetext with dropdown option */}
        <div className="col-span-2">
          <Input
            type="text"
            value={m.materialDescription || ''}
            onChange={(e) => onUpdateMeasurement(m.id, { materialDescription: e.target.value })}
            className="h-8 text-xs"
            placeholder="e.g., 90mm Timber Stud, Concrete 25MPa..."
          />
        </div>

        {/* NCC */}
        <div className="col-span-1">
          {m.nccCode ? (
            <Badge variant="outline" className="text-xs">
              {m.nccCode}
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleFetchNCC(m)}
              disabled={!m.area}
            >
              Fetch NCC
            </Button>
          )}
        </div>

        {/* Actions - FIX #10: Increased span to prevent button overlap */}
        <div className="col-span-2 flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={expandedIds.has(m.id) ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => toggleExpand(m.id)}
                >
                  {expandedIds.has(m.id) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {expandedIds.has(m.id) ? 'Collapse' : 'Expand Details'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={m.validated ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleValidate(m.id)}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {m.validated ? 'Validated' : 'Validate'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* STAGE 3: Lock Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7",
                    m.locked ? "text-amber-600 hover:text-amber-700" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onUpdateMeasurement(m.id, { locked: !m.locked })}
                >
                  {m.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {m.locked ? 'Locked - Click to unlock' : 'Unlocked - Click to lock'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => {
              console.log('🗑️ TABLE DELETE BUTTON clicked for:', m.id, m.label);
              if (m.locked) {
                console.log('  🔒 Measurement is locked, cannot delete');
                toast.error('Cannot delete locked measurement. Unlock it first.');
                return;
              }
              console.log('  📤 Dispatching DELETE_MEASUREMENT for:', m.id);
              onDeleteMeasurement(m.id);
              console.log('  ✅ Delete action dispatched');
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Expanded Details Panel */}
      {expandedIds.has(m.id) && (
        <div className="p-4 bg-muted/30 border-b space-y-4">
          {/* DEBUG: Log measurement properties */}
          {console.log('EXPANDED PANEL DEBUG:', {
            id: m.id,
            type: m.type,
            unit: m.unit,
            isCount: m.unit === 'count',
            label: m.label
          })}
          {/* FIX #9: Simplified form for COUNT measurements */}
          {m.unit === 'count' ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Item Details</h4>
              <div className="grid grid-cols-3 gap-3">
                {/* Common Item Type Dropdown */}
                <div>
                  <label className="text-xs text-muted-foreground">Item Type</label>
                  <Select
                    value={m.structureType || ''}
                    onValueChange={(v: string) => {
                      // Auto-populate label based on selection
                      const itemLabels: Record<string, string> = {
                        'toilet': 'Toilet',
                        'door': 'Door',
                        'window': 'Window',
                        'light_fixture': 'Light Fixture',
                        'power_point': 'Power Point',
                        'switch': 'Switch',
                        'tap': 'Tap/Fixture',
                        'downlight': 'Downlight',
                        'exhaust_fan': 'Exhaust Fan',
                        'other': ''
                      };
                      onUpdateMeasurement(m.id, {
                        structureType: v as StructureType,
                        label: itemLabels[v] || m.label
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="toilet" className="text-xs">🚽 Toilet</SelectItem>
                      <SelectItem value="door" className="text-xs">🚪 Door</SelectItem>
                      <SelectItem value="window" className="text-xs">🪟 Window</SelectItem>
                      <SelectItem value="light_fixture" className="text-xs">💡 Light Fixture</SelectItem>
                      <SelectItem value="power_point" className="text-xs">🔌 Power Point</SelectItem>
                      <SelectItem value="switch" className="text-xs">💡 Switch</SelectItem>
                      <SelectItem value="tap" className="text-xs">🚰 Tap/Fixture</SelectItem>
                      <SelectItem value="downlight" className="text-xs">🔆 Downlight</SelectItem>
                      <SelectItem value="exhaust_fan" className="text-xs">🌀 Exhaust Fan</SelectItem>
                      <SelectItem value="other" className="text-xs">📦 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Item Name</label>
                  <Input
                    value={m.label}
                    onChange={(e) => onUpdateMeasurement(m.id, { label: e.target.value })}
                    placeholder="e.g., Vitreous China WC"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Count</label>
                  <Input
                    value={`${m.realValue} EA`}
                    readOnly
                    className="mt-1 h-8 text-xs bg-muted font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Brand/Model</label>
                  <Input
                    value={m.materialDescription || ''}
                    onChange={(e) => onUpdateMeasurement(m.id, { materialDescription: e.target.value })}
                    className="h-8 text-xs mt-1"
                    placeholder="e.g., Caroma Profile 5"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Area Location</label>
                  <Select
                    value={m.area || ''}
                    onValueChange={(v: MeasurementArea) => onUpdateMeasurement(m.id, { area: v })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Select area..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {AREA_OPTIONS.map((area) => (
                        <SelectItem key={area} value={area} className="text-xs">
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Notes / Specifications</label>
                <Input
                  value={m.notes || ''}
                  onChange={(e) => onUpdateMeasurement(m.id, { notes: e.target.value })}
                  className="h-8 text-xs mt-1"
                  placeholder="Optional: color, finish, special requirements..."
                />
              </div>
            </div>
          ) : (
            <>
              {/* Structure Assembly Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Structure Assembly</h4>
            <div className="grid grid-cols-3 gap-3">
              {/* Structure Type - FIX #8: Auto-generate label */}
              <div>
                <label className="text-xs text-muted-foreground">Structure Type</label>
                <Select
                  value={m.structureType || ''}
                  onValueChange={(v: StructureType) => {
                    const newLabel = generateLabel(m.area, v, m.type, m.unit);
                    onUpdateMeasurement(m.id, {
                      structureType: v,
                      label: newLabel || m.label
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {STRUCTURE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-xs">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Framing */}
              <div>
                <label className="text-xs text-muted-foreground">Framing</label>
                <Select
                  value={m.framing || ''}
                  onValueChange={(v: string) => onUpdateMeasurement(m.id, { framing: v })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {FRAMING_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Insulation */}
              <div>
                <label className="text-xs text-muted-foreground">Insulation</label>
                <Select
                  value={m.insulation || ''}
                  onValueChange={(v: string) => onUpdateMeasurement(m.id, { insulation: v })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {INSULATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lining Section */}
            <div className="grid grid-cols-3 gap-3">
              {/* Lining Type */}
              <div>
                <label className="text-xs text-muted-foreground">Lining Type</label>
                <Select
                  value={m.lining?.type || ''}
                  onValueChange={(v: string) =>
                    onUpdateMeasurement(m.id, {
                      lining: { type: v, sides: m.lining?.sides || 'one' }
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {LINING_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lining Sides */}
              <div>
                <label className="text-xs text-muted-foreground">Lining Sides</label>
                <Select
                  value={m.lining?.sides || 'one'}
                  onValueChange={(v: LiningSides) =>
                    onUpdateMeasurement(m.id, {
                      lining: { type: m.lining?.type || '', sides: v }
                    })
                  }
                  disabled={!m.lining?.type}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="one" className="text-xs">One Side</SelectItem>
                    <SelectItem value="both" className="text-xs">Both Sides</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AUTO-CALCULATED: Lining Area */}
              {m.lining?.type && m.calculatedArea && (
                <div>
                  <label className="text-xs text-muted-foreground">Lining M² (Auto-calculated)</label>
                  <div className="mt-1 h-8 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-400">
                      {(m.calculatedArea * (m.lining.sides === 'both' ? 2 : 1)).toFixed(2)} M²
                    </span>
                    <Badge variant="secondary" className="text-[9px] px-1">
                      {m.calculatedArea.toFixed(2)} × {m.lining.sides === 'both' ? '2' : '1'} sides
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Wall area: {m.calculatedArea.toFixed(2)} M² × {m.lining.sides === 'both' ? 'Both Sides' : 'One Side'}
                  </p>
                </div>
              )}

              {/* Flooring */}
              <div>
                <label className="text-xs text-muted-foreground">Flooring</label>
                <Select
                  value={m.flooring || ''}
                  onValueChange={(v: string) => onUpdateMeasurement(m.id, { flooring: v })}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {FLOORING_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Materials Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Materials</h4>
            {Object.entries(MATERIAL_CATEGORIES).map(([category, materials]) => (
              <div key={category} className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {category}
                </span>
                <div className="flex flex-wrap gap-1">
                  {materials.map((material) => (
                    <Badge
                      key={material}
                      variant={m.materials?.includes(material) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => handleMaterialToggle(m.id, material)}
                    >
                      {material}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Notes Section */}
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <Input
              value={m.notes || ''}
              onChange={(e) => onUpdateMeasurement(m.id, { notes: e.target.value })}
              className="h-8 text-xs mt-1"
              placeholder="Add notes..."
            />
          </div>

          {/* Calculated Materials Section */}
          {(() => {
            const enhancedM = m as EnhancedMeasurement;
            const calculation = calculateRelatedMaterials(enhancedM);

            if (calculation.materials.length === 0 && calculation.warnings.length === 0 && calculation.suggestions.length === 0) {
              return null;
            }

            return (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <h4 className="text-sm font-semibold">Calculated Materials & Requirements</h4>
                </div>

                {/* Warnings */}
                {calculation.warnings.length > 0 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <ul className="list-disc list-inside space-y-1">
                        {calculation.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Suggestions */}
                {calculation.suggestions.length > 0 && (
                  <Alert className="py-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
                      <ul className="list-disc list-inside space-y-1">
                        {calculation.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Calculated Materials Table */}
                {calculation.materials.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 flex items-center gap-2">
                      <Package className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Required Materials ({calculation.materials.length})</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/30 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium">Material</th>
                            <th className="text-right p-2 font-medium">Qty</th>
                            <th className="text-left p-2 font-medium">Unit</th>
                            <th className="text-left p-2 font-medium">NCC/AS</th>
                            <th className="text-left p-2 font-medium">Calculation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculation.materials.map((material, idx) => (
                            <tr key={idx} className={cn(
                              'border-t',
                              material.isRequired ? 'bg-background' : 'bg-muted/20'
                            )}>
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <span className={material.isRequired ? 'font-medium' : ''}>
                                    {material.name}
                                  </span>
                                  {!material.isRequired && (
                                    <Badge variant="outline" className="text-[9px] px-1">Optional</Badge>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {material.description}
                                </div>
                              </td>
                              <td className="p-2 text-right font-mono font-medium">
                                {material.quantity.toFixed(material.unit.includes('ea') ? 0 : 2)}
                              </td>
                              <td className="p-2">{material.unit}</td>
                              <td className="p-2">
                                <div className="space-y-1">
                                  {material.nccCode && (
                                    <Badge variant="secondary" className="text-[9px] px-1">
                                      NCC {material.nccCode}
                                    </Badge>
                                  )}
                                  {material.asStandard && (
                                    <Badge variant="outline" className="text-[9px] px-1">
                                      {material.asStandard}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-[10px] text-muted-foreground cursor-help underline decoration-dotted">
                                      How calculated?
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-xs">
                                    {material.calculationMethod}
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      if (!onAddCostItem) {
                        toast.error('Cost item creation not available');
                        return;
                      }

                      const costItems = calculatedMaterialsToCostItems(
                        calculation.materials,
                        enhancedM.id
                      );

                      costItems.forEach(item => onAddCostItem(item));

                      toast.success(`Added ${costItems.length} materials to estimate`);
                    }}
                    disabled={!onAddCostItem}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add All to Estimate ({calculation.materials.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      // Mark this measurement as added to estimate
                      onUpdateMeasurement(enhancedM.id, { addedToEstimate: true });
                      toast.success('Measurement marked as added to estimate');
                    }}
                  >
                    Mark as Added
                  </Button>
                </div>
              </div>
            );
          })()}
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Search and Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search measurements..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
          {searchFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5"
              onClick={() => setSearchFilter('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          variant={groupByArea ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setGroupByArea(!groupByArea)}
        >
          Group by Area
        </Button>
      </div>

      {/* Table Header - FIX #10: Optimized spacing to prevent button overlap */}
      <div className="grid grid-cols-18 gap-2 p-2 bg-muted/50 rounded-t-md text-xs font-medium text-muted-foreground">
        <div className="col-span-1 flex items-center">
          <Checkbox
            checked={selectedIds.size === filteredMeasurements.length && filteredMeasurements.length > 0}
            onCheckedChange={toggleSelectAll}
          />
        </div>
        <div className="col-span-2">Name</div>
        <div className="col-span-2">Area</div>
        <div className="col-span-1">Qty</div>
        <div className="col-span-1">Unit</div>
        <div className="col-span-1">Height</div>
        <div className="col-span-1">Depth</div>
        <div className="col-span-2">Calculated</div>
        <div className="col-span-2">Structure</div>
        <div className="col-span-2">Material</div>
        <div className="col-span-1">NCC</div>
        <div className="col-span-2">Actions</div>
      </div>

      {/* Table Body */}
      <div className="max-h-[500px] overflow-y-auto border rounded-md">
        {filteredMeasurements.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No measurements yet. Use the tools to add items.
          </div>
        ) : groupByArea ? (
          Object.entries(groupedMeasurements).map(([area, items]) => (
            <div key={area}>
              <div className="bg-muted px-3 py-1.5 text-xs font-semibold border-b sticky top-0">
                {area} ({items.length})
              </div>
              {items.map(renderMeasurementRow)}
            </div>
          ))
        ) : (
          filteredMeasurements.map(renderMeasurementRow)
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-muted/30 rounded-md space-y-3">
        {/* Totals */}
        <div className="flex items-center gap-4 text-xs">
          <span className="font-medium">Totals:</span>
          {totals.LM > 0 && <span>LM: {totals.LM.toFixed(2)}</span>}
          {totals.M2 > 0 && <span>M²: {totals.M2.toFixed(2)}</span>}
          {totals.M3 > 0 && <span>M³: {totals.M3.toFixed(3)}</span>}
          {totals.count > 0 && <span>EA: {totals.count}</span>}
          <span className="ml-auto text-muted-foreground">
            Validated: {validatedCount} / {measurements.length}
          </span>
        </div>

        {/* Export to Estimate Button - FIX #7 */}
        {selectedIds.size > 0 && (
          <Button
            className="w-full"
            onClick={handleExportToEstimate}
            disabled={!onAddCostItem}
          >
            <Plus className="h-4 w-4 mr-2" />
            Export {selectedIds.size} to Estimate
          </Button>
        )}
      </div>
    </div>
  );
};
