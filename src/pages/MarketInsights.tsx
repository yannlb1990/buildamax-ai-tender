import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, DollarSign, Search, Download } from "lucide-react";
import { toast } from "sonner";

interface CostItem {
  category: string;
  description: string;
  unit: string;
  min_rate: number;
  avg_rate: number;
  max_rate: number;
  region?: string;
}

const MarketInsights = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [costData] = useState<CostItem[]>([
    // Labour Rates
    { category: "Labour", description: "Carpenter", unit: "$/hr", min_rate: 85, avg_rate: 95, max_rate: 110, region: "NSW" },
    { category: "Labour", description: "Electrician", unit: "$/hr", min_rate: 90, avg_rate: 105, max_rate: 125, region: "NSW" },
    { category: "Labour", description: "Plumber", unit: "$/hr", min_rate: 88, avg_rate: 100, max_rate: 120, region: "NSW" },
    { category: "Labour", description: "Painter", unit: "$/hr", min_rate: 70, avg_rate: 80, max_rate: 95, region: "NSW" },
    { category: "Labour", description: "Bricklayer", unit: "$/hr", min_rate: 85, avg_rate: 98, max_rate: 115, region: "NSW" },
    { category: "Labour", description: "Plasterer", unit: "$/hr", min_rate: 75, avg_rate: 88, max_rate: 105, region: "NSW" },
    { category: "Labour", description: "Tiler", unit: "$/hr", min_rate: 80, avg_rate: 92, max_rate: 110, region: "NSW" },
    { category: "Labour", description: "Labourer General", unit: "$/hr", min_rate: 45, avg_rate: 55, max_rate: 65, region: "NSW" },
    
    // Materials - Framing
    { category: "Framing", description: "90x45 MGP10 Pine", unit: "$/LM", min_rate: 2.80, avg_rate: 3.20, max_rate: 3.80 },
    { category: "Framing", description: "90x35 MGP10 Pine", unit: "$/LM", min_rate: 2.40, avg_rate: 2.80, max_rate: 3.30 },
    { category: "Framing", description: "140x45 MGP10 Pine", unit: "$/LM", min_rate: 4.20, avg_rate: 4.80, max_rate: 5.50 },
    { category: "Framing", description: "LVL Beam 240x45", unit: "$/LM", min_rate: 18.50, avg_rate: 22.00, max_rate: 26.00 },
    { category: "Framing", description: "Steel Beam 150UB18", unit: "$/LM", min_rate: 35.00, avg_rate: 42.00, max_rate: 50.00 },
    
    // Materials - Plasterboard
    { category: "Plasterboard", description: "10mm Standard Sheet 2400x1200", unit: "$/sheet", min_rate: 14.50, avg_rate: 16.80, max_rate: 19.50 },
    { category: "Plasterboard", description: "13mm Standard Sheet 2700x1200", unit: "$/sheet", min_rate: 18.50, avg_rate: 21.50, max_rate: 25.00 },
    { category: "Plasterboard", description: "13mm Fire Rated Sheet", unit: "$/sheet", min_rate: 28.00, avg_rate: 32.50, max_rate: 38.00 },
    { category: "Plasterboard", description: "13mm Moisture Resistant", unit: "$/sheet", min_rate: 22.00, avg_rate: 26.00, max_rate: 30.00 },
    
    // Materials - Bricks & Blocks
    { category: "Masonry", description: "Clay Bricks Standard", unit: "$/1000", min_rate: 950, avg_rate: 1150, max_rate: 1400 },
    { category: "Masonry", description: "Concrete Blocks 200mm", unit: "$/block", min_rate: 3.80, avg_rate: 4.50, max_rate: 5.50 },
    { category: "Masonry", description: "Hebel Blocks 600x200x200", unit: "$/block", min_rate: 8.50, avg_rate: 10.20, max_rate: 12.50 },
    
    // Materials - Roofing
    { category: "Roofing", description: "Colorbond Roofing 0.42mm", unit: "$/m²", min_rate: 28.00, avg_rate: 35.00, max_rate: 45.00 },
    { category: "Roofing", description: "Concrete Roof Tiles", unit: "$/m²", min_rate: 35.00, avg_rate: 42.00, max_rate: 52.00 },
    { category: "Roofing", description: "Terracotta Roof Tiles", unit: "$/m²", min_rate: 55.00, avg_rate: 68.00, max_rate: 85.00 },
    { category: "Roofing", description: "Roof Insulation Batts R4.0", unit: "$/m²", min_rate: 12.00, avg_rate: 15.50, max_rate: 19.00 },
    
    // Materials - Flooring
    { category: "Flooring", description: "Floor Tiles 600x600 Porcelain", unit: "$/m²", min_rate: 35.00, avg_rate: 55.00, max_rate: 85.00 },
    { category: "Flooring", description: "Timber Flooring Spotted Gum", unit: "$/m²", min_rate: 95.00, avg_rate: 125.00, max_rate: 165.00 },
    { category: "Flooring", description: "Carpet Mid-Range", unit: "$/m²", min_rate: 35.00, avg_rate: 50.00, max_rate: 75.00 },
    { category: "Flooring", description: "Vinyl Plank Premium", unit: "$/m²", min_rate: 45.00, avg_rate: 65.00, max_rate: 95.00 },
    
    // Materials - Concrete
    { category: "Concrete", description: "Ready Mix Concrete 20MPa", unit: "$/m³", min_rate: 220, avg_rate: 255, max_rate: 295 },
    { category: "Concrete", description: "Ready Mix Concrete 25MPa", unit: "$/m³", min_rate: 235, avg_rate: 270, max_rate: 310 },
    { category: "Concrete", description: "Ready Mix Concrete 32MPa", unit: "$/m³", min_rate: 250, avg_rate: 290, max_rate: 335 },
    { category: "Concrete", description: "Concrete Pump (per hour)", unit: "$/hr", min_rate: 180, avg_rate: 220, max_rate: 280 },
    
    // Materials - Electrical
    { category: "Electrical", description: "Power Point Installation", unit: "$/point", min_rate: 120, avg_rate: 155, max_rate: 195 },
    { category: "Electrical", description: "Light Point Installation", unit: "$/point", min_rate: 95, avg_rate: 125, max_rate: 165 },
    { category: "Electrical", description: "Switchboard Upgrade", unit: "$/unit", min_rate: 1500, avg_rate: 2200, max_rate: 3200 },
    
    // Materials - Plumbing
    { category: "Plumbing", description: "Toilet Suite Mid-Range", unit: "$/unit", min_rate: 350, avg_rate: 550, max_rate: 850 },
    { category: "Plumbing", description: "Shower Installation", unit: "$/unit", min_rate: 800, avg_rate: 1250, max_rate: 1850 },
    { category: "Plumbing", description: "Kitchen Sink & Mixer", unit: "$/unit", min_rate: 450, avg_rate: 750, max_rate: 1250 },
    
    // Materials - Joinery
    { category: "Joinery", description: "Kitchen Cabinets Standard", unit: "$/LM", min_rate: 850, avg_rate: 1250, max_rate: 1850 },
    { category: "Joinery", description: "Stone Benchtop 20mm", unit: "$/m²", min_rate: 450, avg_rate: 650, max_rate: 950 },
    { category: "Joinery", description: "Wardrobe Built-in", unit: "$/LM", min_rate: 650, avg_rate: 950, max_rate: 1450 },
    
    // Materials - Windows & Doors
    { category: "Windows & Doors", description: "Aluminium Window Standard", unit: "$/m²", min_rate: 450, avg_rate: 650, max_rate: 950 },
    { category: "Windows & Doors", description: "Aluminium Sliding Door 2100x1800", unit: "$/unit", min_rate: 1200, avg_rate: 1650, max_rate: 2400 },
    { category: "Windows & Doors", description: "Timber Entry Door", unit: "$/unit", min_rate: 950, avg_rate: 1450, max_rate: 2200 },
    { category: "Windows & Doors", description: "Internal Hollow Core Door", unit: "$/unit", min_rate: 180, avg_rate: 250, max_rate: 350 },
  ]);

  const categories = ["all", ...Array.from(new Set(costData.map(item => item.category)))];
  
  const filteredData = costData.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const exportToCSV = () => {
    const headers = ["Category", "Description", "Unit", "Min Rate", "Avg Rate", "Max Rate"];
    const rows = filteredData.map(item => [
      item.category,
      item.description,
      item.unit,
      item.min_rate.toFixed(2),
      item.avg_rate.toFixed(2),
      item.max_rate.toFixed(2)
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "market-insights.csv";
    a.click();
    toast.success("Cost data exported successfully");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <nav className="border-b border-border bg-background">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-2">Market Insights</h1>
          <p className="text-muted-foreground">
            Current Australian construction costs and labour rates
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-accent" />
              <span className="text-sm text-muted-foreground">Avg Labour Rate</span>
            </div>
            <div className="font-mono text-3xl font-bold">$90/hr</div>
            <div className="text-xs text-muted-foreground mt-1">NSW Metro</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              <span className="text-sm text-muted-foreground">Material Inflation</span>
            </div>
            <div className="font-mono text-3xl font-bold">+4.2%</div>
            <div className="text-xs text-muted-foreground mt-1">YoY Average</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-accent" />
              <span className="text-sm text-muted-foreground">Concrete Price</span>
            </div>
            <div className="font-mono text-3xl font-bold">$270/m³</div>
            <div className="text-xs text-muted-foreground mt-1">25MPa Average</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === "all" ? "All Categories" : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Results</label>
              <div className="h-10 flex items-center px-3 bg-muted/50 rounded-md">
                <span className="text-sm font-medium">{filteredData.length} items</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Cost Data Table */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Category</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                  <th className="text-center py-3 px-4 font-semibold">Unit</th>
                  <th className="text-right py-3 px-4 font-semibold">Min Rate</th>
                  <th className="text-right py-3 px-4 font-semibold">Avg Rate</th>
                  <th className="text-right py-3 px-4 font-semibold">Max Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{item.description}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{item.unit}</td>
                    <td className="py-3 px-4 text-right font-mono">${item.min_rate.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-accent">
                      ${item.avg_rate.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">${item.max_rate.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Disclaimer */}
        <Card className="p-6 mt-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>Disclaimer:</strong> These rates are indicative and based on NSW metro averages. 
            Actual costs may vary depending on project complexity, location, market conditions, and supplier agreements. 
            Always obtain multiple quotes for accurate pricing.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default MarketInsights;
