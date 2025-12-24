import { useState, useMemo } from 'react';
import { Check, Trash2, ChevronDown, ChevronRight, Search, X, AlertTriangle, Lightbulb, Calculator, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { calculateRelatedMaterials, MaterialCalculationResult } from '@/lib/takeoff/materialCalculator';
import { calculatedMaterialsToCostItems } from '@/lib/takeoff/estimateConnector';
import { CostItem } from '@/lib/takeoff/types';
import { Measurement, MeasurementUnit, MeasurementArea } from '@/lib/takeoff/types';
import {
  STRUCTURE_TYPES,
  FRAMING_OPTIONS,
  LINING_OPTIONS,
  INSULATION_OPTIONS,
  FLOORING_OPTIONS,
  LINING_SIDES_OPTIONS,
  getNccCode,
} from '@/data/structureOptions';

const AREA_OPTIONS: MeasurementArea[] = [
  'Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Dining Room', 'Laundry',
  'Garage', 'Patio', 'Balcony', 'Hallway', 'Entry', 'Office', 'Storage',
  'Utility', 'Ensuite', 'WC', 'External', 'Other'
];

export interface EnhancedMeasurement extends Measurement {
  area?: MeasurementArea;
  structureType?: string;
  framing?: string;
  lining?: string;
  liningSides?: 'one' | 'both';
  insulation?: string;
  flooring?: string;
  nccCode?: string;
  notes?: string;
  validated?: boolean;
}

interface TakeoffTableEnhancedProps {
  measurements: Measurement[];
  selectedMeasurementId?: string | null;
  onSelectMeasurement?: (id: string | null) => void;
  onUpdateMeasurement: (id: string, updates: Partial<EnhancedMeasurement>) => void;
  onDeleteMeasurement: (id: string) => void;
  onAddToEstimate: (measurementIds: string[]) => void;
  onAddCostItem?: (item: CostItem) => void;
}

export const TakeoffTableEnhanced = ({
  measurements,
  selectedMeasurementId,
  onSelectMeasurement,
  onUpdateMeasurement,
  onDeleteMeasurement,
  onAddToEstimate,
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
      m.label?.toLowerCase().includes(lower) ||
      m.area?.toLowerCase().includes(lower) ||
      m.structureType?.toLowerCase().includes(lower) ||
      m.nccCode?.toLowerCase().includes(lower)
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

  const handleRowClick = (id: string) => {
    if (onSelectMeasurement) {
      onSelectMeasurement(selectedMeasurementId === id ? null : id);
    }
  };

  // Auto-populate NCC code when structure/material selections change
  const handleStructureChange = (measurementId: string, field: string, value: string) => {
    const measurement = enhancedMeasurements.find(m => m.id === measurementId);
    const updates: Partial<EnhancedMeasurement> = { [field]: value };

    // Recalculate NCC code
    const structureType = field === 'structureType' ? value : measurement?.structureType;
    const lining = field === 'lining' ? value : measurement?.lining;
    const framing = field === 'framing' ? value : measurement?.framing;
    const flooring = field === 'flooring' ? value : measurement?.flooring;

    const nccCode = getNccCode(structureType, lining, framing, flooring);
    if (nccCode) {
      updates.nccCode = nccCode;
    }

    onUpdateMeasurement(measurementId, updates);
  };

  const handleValidate = (id: string) => {
    const measurement = enhancedMeasurements.find((m) => m.id === id);
    onUpdateMeasurement(id, { validated: !measurement?.validated });
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'count') return value.toFixed(0);
    if (unit === 'M3') return value.toFixed(3);
    return value.toFixed(2);
  };

  const getUnitLabel = (unit: MeasurementUnit) => {
    switch (unit) {
      case 'LM': return 'LM';
      case 'M2': return 'm²';
      case 'M3': return 'm³';
      case 'count': return 'EA';
      default: return unit;
    }
  };

  const renderMeasurementRow = (m: EnhancedMeasurement) => {
    const isSelected = selectedMeasurementId === m.id;
    const isExpanded = expandedIds.has(m.id);

    return (
      <div key={m.id}>
        <div
          className={cn(
            'grid grid-cols-[40px_minmax(100px,1fr)_80px_100px_120px_100px_100px_100px_100px_minmax(60px,80px)_80px] gap-1 p-2 border-b items-center text-xs cursor-pointer transition-colors',
            m.validated && 'bg-green-50 dark:bg-green-950/30',
            selectedIds.has(m.id) && 'bg-accent/50',
            isSelected && 'ring-2 ring-primary ring-inset bg-primary/10'
          )}
          onClick={() => handleRowClick(m.id)}
        >
          {/* Checkbox */}
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedIds.has(m.id)}
              onCheckedChange={() => toggleSelect(m.id)}
            />
          </div>

          {/* Name/Label */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={m.label || ''}
              onChange={(e) => onUpdateMeasurement(m.id, { label: e.target.value })}
              className="h-7 text-xs"
              placeholder="Label..."
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => toggleExpand(m.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Type */}
          <div className="text-muted-foreground capitalize truncate">
            {m.type}
          </div>

          {/* Value + Unit */}
          <div className="font-mono font-medium">
            {formatValue(m.realValue, m.unit)} {getUnitLabel(m.unit)}
          </div>

          {/* Structure Type */}
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={m.structureType || ''}
              onValueChange={(v) => handleStructureChange(m.id, 'structureType', v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Type..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {STRUCTURE_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Framing */}
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={m.framing || ''}
              onValueChange={(v) => handleStructureChange(m.id, 'framing', v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Frame..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {FRAMING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lining */}
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={m.lining || ''}
              onValueChange={(v) => handleStructureChange(m.id, 'lining', v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Lining..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {LINING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Insulation */}
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={m.insulation || ''}
              onValueChange={(v) => onUpdateMeasurement(m.id, { insulation: v })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Insul..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {INSULATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* NCC Code */}
          <div>
            {m.nccCode ? (
              <Badge variant="outline" className="text-[10px] font-mono">
                {m.nccCode}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-[10px]">—</span>
            )}
          </div>

          {/* Notes indicator */}
          <div className="flex justify-center">
            {m.notes ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-[10px]">
                      Note
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{m.notes}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={m.validated ? 'default' : 'ghost'}
                    size="icon"
                    className="h-6 w-6"
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

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onDeleteMeasurement(m.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Expanded Details Panel */}
        {isExpanded && (
          <div className="p-3 bg-muted/30 border-b space-y-3">
            <div className="grid grid-cols-4 gap-3">
              {/* Area */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Area/Room</label>
                <Select
                  value={m.area || ''}
                  onValueChange={(v: MeasurementArea) => onUpdateMeasurement(m.id, { area: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
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

              {/* Lining Sides */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Lining Sides</label>
                <Select
                  value={m.liningSides || ''}
                  onValueChange={(v: 'one' | 'both') => onUpdateMeasurement(m.id, { liningSides: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {LINING_SIDES_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Flooring */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Flooring</label>
                <Select
                  value={m.flooring || ''}
                  onValueChange={(v) => handleStructureChange(m.id, 'flooring', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {FLOORING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dimensions */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Dimensions</label>
                <div className="text-xs font-mono bg-background rounded px-2 py-1.5 border">
                  {m.dimensions
                    ? `${m.dimensions.width.toFixed(2)}m × ${m.dimensions.height.toFixed(2)}m`
                    : `${m.worldPoints.length} points`}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Notes</label>
              <Textarea
                value={m.notes || ''}
                onChange={(e) => onUpdateMeasurement(m.id, { notes: e.target.value })}
                placeholder="Add notes..."
                className="h-16 text-xs resize-none"
              />
            </div>

            {/* Calculated Materials Panel */}
            {(() => {
              const calculation = calculateRelatedMaterials(m);
              if (calculation.materials.length === 0 && calculation.warnings.length === 0) {
                return (
                  <div className="text-xs text-muted-foreground italic">
                    Select structure type and materials above to calculate related materials.
                  </div>
                );
              }
              
              return (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Calculated Materials & Requirements</span>
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
                    <Alert className="py-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                      <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                        <ul className="list-disc list-inside space-y-1">
                          {calculation.suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Materials Table */}
                  {calculation.materials.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium">Material</th>
                            <th className="text-right p-2 font-medium w-20">Qty</th>
                            <th className="text-left p-2 font-medium w-16">Unit</th>
                            <th className="text-left p-2 font-medium w-32">NCC/AS</th>
                            <th className="text-left p-2 font-medium w-24">Calculation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculation.materials.map((material, idx) => (
                            <tr key={idx} className={cn(
                              "border-t",
                              !material.isRequired && "opacity-60"
                            )}>
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <span>{material.name}</span>
                                  {!material.isRequired && (
                                    <Badge variant="outline" className="text-[9px] py-0">Optional</Badge>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground">{material.description}</div>
                              </td>
                              <td className="p-2 text-right font-mono">{material.quantity.toFixed(2)}</td>
                              <td className="p-2">{material.unit}</td>
                              <td className="p-2">
                                <div className="flex flex-wrap gap-1">
                                  {material.nccCode && (
                                    <Badge variant="secondary" className="text-[9px] py-0">NCC {material.nccCode}</Badge>
                                  )}
                                  {material.asStandard && (
                                    <Badge variant="outline" className="text-[9px] py-0">{material.asStandard}</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="text-[10px] text-primary underline cursor-help">
                                      How calculated?
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-xs font-mono">{material.calculationMethod}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {calculation.materials.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          if (!onAddCostItem) {
                            toast.error('Cost item creation not available');
                            return;
                          }
                          const costItems = calculatedMaterialsToCostItems(calculation.materials, m.id);
                          costItems.forEach(item => onAddCostItem(item));
                          toast.success(`Added ${costItems.length} materials to estimate`);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add All to Estimate ({calculation.materials.length})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          onUpdateMeasurement(m.id, { validated: true });
                          toast.success('Marked as added');
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark as Added
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">Takeoff Measurements</h3>
        <Badge variant="secondary" className="text-xs">
          {filteredMeasurements.length}
        </Badge>
        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs"
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

      {/* Table Header */}
      <div className="grid grid-cols-[40px_minmax(100px,1fr)_80px_100px_120px_100px_100px_100px_100px_minmax(60px,80px)_80px] gap-1 p-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide border-b">
        <div className="flex items-center justify-center">
          <Checkbox
            checked={selectedIds.size === filteredMeasurements.length && filteredMeasurements.length > 0}
            onCheckedChange={toggleSelectAll}
          />
        </div>
        <div>Name</div>
        <div>Type</div>
        <div>Value</div>
        <div>Structure</div>
        <div>Framing</div>
        <div>Lining</div>
        <div>Insulation</div>
        <div>NCC</div>
        <div className="text-center">Notes</div>
        <div className="text-right">Actions</div>
      </div>

      {/* Table Body */}
      <ScrollArea className="h-[280px]">
        {filteredMeasurements.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No measurements yet. Use the tools above to trace walls and areas.
          </div>
        ) : groupByArea ? (
          Object.entries(groupedMeasurements).map(([area, items]) => (
            <div key={area}>
              <div className="bg-muted px-3 py-1.5 text-xs font-semibold border-b sticky top-0 z-10">
                {area} ({items.length})
              </div>
              {items.map(renderMeasurementRow)}
            </div>
          ))
        ) : (
          filteredMeasurements.map(renderMeasurementRow)
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t bg-muted/30 space-y-2">
        {/* Totals Row */}
        <div className="flex items-center gap-4 text-xs">
          <span className="font-medium">Totals:</span>
          {totals.LM > 0 && (
            <span className="font-mono">
              <span className="text-muted-foreground">LM:</span> {totals.LM.toFixed(2)}
            </span>
          )}
          {totals.M2 > 0 && (
            <span className="font-mono">
              <span className="text-muted-foreground">m²:</span> {totals.M2.toFixed(2)}
            </span>
          )}
          {totals.M3 > 0 && (
            <span className="font-mono">
              <span className="text-muted-foreground">m³:</span> {totals.M3.toFixed(3)}
            </span>
          )}
          {totals.count > 0 && (
            <span className="font-mono">
              <span className="text-muted-foreground">EA:</span> {totals.count.toFixed(0)}
            </span>
          )}
          <span className="ml-auto text-muted-foreground">
            Validated: {validatedCount} / {measurements.length}
          </span>
        </div>

        {/* Action Buttons */}
        {selectedIds.size > 0 && (
          <Button
            className="w-full"
            size="sm"
            onClick={() => {
              onAddToEstimate(Array.from(selectedIds));
              setSelectedIds(new Set());
            }}
          >
            Add {selectedIds.size} Selected to Estimate
          </Button>
        )}
      </div>
    </div>
  );
};
