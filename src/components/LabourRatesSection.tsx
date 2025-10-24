import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

const AU_TRADES = [
  "Carpenter", "Plumber", "Electrician", "Bricklayer", "Plasterer",
  "Painter", "Tiler", "Concreter", "Roofer", "Landscaper"
];

const DEFAULT_RATES: Record<string, number> = {
  Carpenter: 90,
  Plumber: 95,
  Electrician: 100,
  Bricklayer: 85,
  Plasterer: 80,
  Painter: 75,
  Tiler: 85,
  Concreter: 90,
  Roofer: 95,
  Landscaper: 80
};

interface LabourRatesSectionProps {
  rates: Record<string, number>;
  onRatesChange: (rates: Record<string, number>) => void;
}

export const LabourRatesSection = ({ rates, onRatesChange }: LabourRatesSectionProps) => {
  const handleRateChange = (trade: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    onRatesChange({ ...rates, [trade]: numValue });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-accent" />
        <h3 className="font-display text-xl font-bold">Labour Hourly Rates by Trade</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {AU_TRADES.map(trade => (
          <div key={trade}>
            <Label className="text-sm">{trade}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.50"
                value={rates[trade] || DEFAULT_RATES[trade]}
                onChange={(e) => handleRateChange(trade, e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">per hour</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
