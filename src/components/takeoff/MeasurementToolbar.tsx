import { Minus, Square, Pentagon, Circle, Hash, Scissors, Undo, Redo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToolType } from '@/lib/takeoff/types';
import { cn } from '@/lib/utils';

interface MeasurementToolbarProps {
  activeTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
  deductionMode: boolean;
  onDeductionToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  disabled: boolean;
}

export const MeasurementToolbar = ({
  activeTool,
  onToolSelect,
  deductionMode,
  onDeductionToggle,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  disabled
}: MeasurementToolbarProps) => {
  const tools = [
    { id: 'line' as const, icon: Minus, label: 'Line (LM)', color: 'text-red-500' },
    { id: 'rectangle' as const, icon: Square, label: 'Rectangle (M²)', color: 'text-green-500' },
    { id: 'polygon' as const, icon: Pentagon, label: 'Polygon (M²)', color: 'text-blue-500' },
    { id: 'circle' as const, icon: Circle, label: 'Circle (M²)', color: 'text-purple-500' },
    { id: 'count' as const, icon: Hash, label: 'Count', color: 'text-orange-500' },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg">
      {tools.map(({ id, icon: Icon, label, color }) => (
        <Button
          key={id}
          variant={activeTool === id ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToolSelect(id)}
          disabled={disabled}
          title={label}
          className={cn(activeTool === id && color)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}

      <Separator orientation="vertical" className="h-8" />

      <Button
        variant={deductionMode ? 'destructive' : 'ghost'}
        size="sm"
        onClick={onDeductionToggle}
        disabled={disabled}
        title="Deduction Mode"
      >
        <Scissors className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-8" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo || disabled}
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo || disabled}
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
};
