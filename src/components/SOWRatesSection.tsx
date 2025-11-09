import { Card } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export const SOWRatesSection = () => {
  const sowData = [
    { trade: "Carpenter", sow: "Wall Framing", unit: "m²", avgRate: 44.20 },
    { trade: "Carpenter", sow: "Roof Framing", unit: "m²", avgRate: 57.20 },
    { trade: "Electrician", sow: "Power Point Install", unit: "point", avgRate: 150.60 },
    { trade: "Electrician", sow: "Light Point Install", unit: "point", avgRate: 125.00 },
    { trade: "Plumber", sow: "Rough-in Complete", unit: "m²", avgRate: 89.90 },
    { trade: "Plumber", sow: "Toilet Installation", unit: "unit", avgRate: 400.00 },
    { trade: "Bricklayer", sow: "Bricklaying", unit: "m²", avgRate: 98.50 },
    { trade: "Plasterer", sow: "Plasterboard Install & Stop", unit: "m²", avgRate: 44.90 },
    { trade: "Painter", sow: "Interior Painting 2 Coats", unit: "m²", avgRate: 30.60 },
    { trade: "Tiler", sow: "Floor Tiling Supply & Install", unit: "m²", avgRate: 101.40 },
    { trade: "Concreter", sow: "Slab Pour & Finish", unit: "m²", avgRate: 77.20 },
    { trade: "Roofer", sow: "Roof Installation Metal", unit: "m²", avgRate: 69.60 },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="h-5 w-5 text-accent" />
        <h3 className="font-display text-xl font-bold">Scope of Work Rates</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Complete job pricing including materials and labour (market averages)
      </p>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-semibold">Trade</th>
              <th className="text-left py-3 px-2 font-semibold">Scope of Work</th>
              <th className="text-center py-3 px-2 font-semibold">Unit</th>
              <th className="text-right py-3 px-2 font-semibold">Avg Rate</th>
            </tr>
          </thead>
          <tbody>
            {sowData.map((item, idx) => (
              <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                <td className="py-3 px-2 text-muted-foreground">{item.trade}</td>
                <td className="py-3 px-2 font-medium">{item.sow}</td>
                <td className="py-3 px-2 text-center text-muted-foreground">{item.unit}</td>
                <td className="py-3 px-2 text-right font-mono font-bold">${item.avgRate.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
