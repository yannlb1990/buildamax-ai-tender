import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Ruler, Square } from "lucide-react";
import { exportMeasurementsToCSV, exportMeasurementsToJSON } from "@/utils/measurementExport";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Measurement {
  id: string;
  measurement_type: 'linear' | 'area';
  label: string | null;
  real_value: number | null;
  real_unit: string | null;
  trade: string | null;
  points: any;
}

interface MeasurementsSidebarProps {
  measurements: Measurement[];
  onDelete: (id: string) => void;
  planPageId: string;
}

export const MeasurementsSidebar = ({ measurements, onDelete, planPageId }: MeasurementsSidebarProps) => {
  const linesMeasurements = measurements.filter(m => m.measurement_type === 'linear');
  const areaMeasurements = measurements.filter(m => m.measurement_type === 'area');
  
  const totalArea = areaMeasurements.reduce((sum, m) => sum + (m.real_value || 0), 0);

  const handleExport = (format: 'csv' | 'json') => {
    try {
      if (format === 'csv') {
        exportMeasurementsToCSV(measurements, planPageId);
      } else {
        exportMeasurementsToJSON(measurements, planPageId);
      }
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Export failed");
    }
  };

  return (
    <Card className="w-80 h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Measurements</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>
              Export JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {measurements.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No measurements yet</p>
              <p className="text-xs mt-1">Use tools to measure</p>
            </div>
          ) : (
            measurements.map((measurement) => (
              <Card key={measurement.id} className="p-3 hover:bg-accent/50 transition-colors">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-1">
                    {measurement.measurement_type === 'linear' ? (
                      <Ruler className="h-4 w-4 text-red-500" />
                    ) : (
                      <Square className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {measurement.label || `Measurement ${measurement.id.slice(0, 8)}`}
                    </div>
                    <div className="text-lg font-bold text-primary mt-1">
                      {measurement.real_value?.toFixed(2)} {measurement.real_unit}
                    </div>
                    {measurement.trade && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {measurement.trade}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(measurement.id)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {measurements.length > 0 && (
        <div className="p-4 border-t bg-muted/50">
          <div className="text-sm font-medium mb-2">Summary</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Lines</div>
              <div className="font-semibold">{linesMeasurements.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Areas</div>
              <div className="font-semibold">{areaMeasurements.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total m²</div>
              <div className="font-semibold">{totalArea.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
