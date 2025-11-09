import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";

export const MaterialsPricingSection = () => {
  const materialData = [
    { name: "90x45 MGP10 Pine", unit: "lm", avgPrice: 3.20, category: "Timber - Structural" },
    { name: "90x35 MGP10 Pine", unit: "lm", avgPrice: 2.80, category: "Timber - Structural" },
    { name: "140x45 MGP10 Pine", unit: "lm", avgPrice: 4.78, category: "Timber - Structural" },
    { name: "Plasterboard 10mm", unit: "sheet", avgPrice: 16.76, category: "Plasterboard" },
    { name: "Plasterboard 13mm", unit: "sheet", avgPrice: 21.50, category: "Plasterboard" },
    { name: "Clay Bricks Standard", unit: "/1000", avgPrice: 1152, category: "Masonry" },
    { name: "Ready Mix Concrete 25MPa", unit: "m³", avgPrice: 270, category: "Concrete" },
    { name: "Colorbond Roofing 0.42mm", unit: "m²", avgPrice: 35.60, category: "Roofing" },
    { name: "Floor Tiles 600x600", unit: "m²", avgPrice: 56, category: "Tiling" },
    { name: "Interior Paint Premium", unit: "L", avgPrice: 40.60, category: "Paint" },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-accent" />
        <h3 className="font-display text-xl font-bold">Materials Pricing</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Current market prices for common building materials across Australia
      </p>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-semibold">Category</th>
              <th className="text-left py-3 px-2 font-semibold">Material</th>
              <th className="text-center py-3 px-2 font-semibold">Unit</th>
              <th className="text-right py-3 px-2 font-semibold">Avg Price</th>
            </tr>
          </thead>
          <tbody>
            {materialData.map((item, idx) => (
              <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                <td className="py-3 px-2 text-muted-foreground">{item.category}</td>
                <td className="py-3 px-2 font-medium">{item.name}</td>
                <td className="py-3 px-2 text-center text-muted-foreground">{item.unit}</td>
                <td className="py-3 px-2 text-right font-mono font-bold">${item.avgPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
