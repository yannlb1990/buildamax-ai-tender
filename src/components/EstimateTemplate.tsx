import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight, DollarSign } from "lucide-react";
import { AIPlanAnalyzer } from "./AIPlanAnalyzer";

const AU_TRADES = [
  "Carpenter", "Plumber", "Electrician", "Bricklayer", "Plasterer",
  "Painter", "Tiler", "Concreter", "Roofer", "Landscaper"
];

const SCOPE_OF_WORK = {
  Carpenter: ["Framing", "Fix out", "Cladding", "Decking", "Stairs"],
  Plumber: ["Rough-in", "Fix out", "Drainage", "Gas"],
  Electrician: ["Rough-in", "Fit-off", "Solar", "Data"],
  Bricklayer: ["External walls", "Fencing", "Paving"],
  Plasterer: ["Internal walls", "Ceilings", "Cornice"],
  Painter: ["Interior", "Exterior", "Preparation"],
  Tiler: ["Floor tiling", "Wall tiling", "Splashbacks"],
  Concreter: ["Footings", "Slab", "Driveway", "Paths"],
  Roofer: ["Roof frame", "Tiles/Metal", "Gutters", "Flashings"],
  Landscaper: ["Retaining walls", "Fencing", "Gardens", "Paving"]
};

interface EstimateItem {
  id: string;
  section_id: string | null;
  area: string;
  trade: string;
  scope_of_work: string;
  material_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  labour_hours: number;
  labour_rate: number;
  material_wastage_pct: number;
  labour_wastage_pct: number;
  notes: string;
  expanded: boolean;
}

interface EstimateTemplateProps {
  projectId: string;
  estimateId?: string;
}

export const EstimateTemplate = ({ projectId, estimateId }: EstimateTemplateProps) => {
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [overheadTotal, setOverheadTotal] = useState(0);
  const [config, setConfig] = useState({
    defaultLabourRate: 90,
    materialWastage: 10,
    labourWastage: 5,
    supervisionPct: 8,
    overheadPct: 12,
    marginPct: 15,
    gstPct: 10
  });
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    loadOverheads();
  }, [projectId]);

  const loadOverheads = async () => {
    const { data } = await supabase
      .from("overhead_items")
      .select("amount")
      .eq("project_id", projectId);
    
    if (data) {
      const total = data.reduce((sum, item) => sum + item.amount, 0);
      setOverheadTotal(total);
    }
  };

  const [newItem, setNewItem] = useState({
    area: "",
    trade: "",
    scope_of_work: "",
    material_type: "",
    quantity: "",
    unit: "m²",
    unit_price: "",
    labour_hours: "",
  });

  useEffect(() => {
    if (estimateId) loadItems();
  }, [estimateId]);

  const loadItems = async () => {
    if (!estimateId) return;

    const { data, error } = await supabase
      .from("estimate_items")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("created_at");

    if (error) {
      console.error("Load error:", error);
      toast.error("Failed to load items");
      return;
    }

    if (data) {
      const mappedItems = data.map((item: any) => ({
        id: item.id,
        section_id: item.section_id,
        area: item.description?.split(" - ")[0] || "",
        trade: item.category || "",
        scope_of_work: item.item_type || "",
        material_type: item.description?.split(" - ")[1] || item.description || "",
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || "m²",
        unit_price: parseFloat(item.unit_price) || 0,
        labour_hours: parseFloat(item.labour_hours) || 0,
        labour_rate: parseFloat(item.labour_rate) || config.defaultLabourRate,
        material_wastage_pct: parseFloat(item.material_wastage_pct) || config.materialWastage,
        labour_wastage_pct: parseFloat(item.labour_wastage_pct) || config.labourWastage,
        notes: "",
        expanded: false
      }));
      setItems(mappedItems);
    }
  };

  const addItem = async () => {
    if (!newItem.area || !newItem.trade || !newItem.material_type) {
      toast.error("Please fill in required fields");
      return;
    }

    if (!estimateId) {
      toast.error("No estimate found");
      return;
    }

    const qty = parseFloat(newItem.quantity) || 0;
    const unitPrice = parseFloat(newItem.unit_price) || 0;
    const labourHrs = parseFloat(newItem.labour_hours) || 0;

    if (qty === 0 || unitPrice === 0) {
      toast.error("Quantity and unit price must be greater than 0");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("estimate_items").insert({
      estimate_id: estimateId,
      category: newItem.trade,
      item_type: newItem.scope_of_work,
      description: `${newItem.area} - ${newItem.material_type}`,
      quantity: qty,
      unit: newItem.unit,
      unit_price: unitPrice,
      total_price: 0, // Will be calculated on load
      labour_hours: labourHrs,
      labour_rate: config.defaultLabourRate,
      material_wastage_pct: config.materialWastage,
      labour_wastage_pct: config.labourWastage,
    });

    if (error) {
      console.error("Insert error:", error);
      toast.error("Failed to add item: " + error.message);
      return;
    }

    toast.success("Item added successfully");
    setNewItem({
      area: "",
      trade: "",
      scope_of_work: "",
      material_type: "",
      quantity: "",
      unit: "m²",
      unit_price: "",
      labour_hours: "",
    });
    await loadItems();
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("estimate_items").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Item deleted");
    loadItems();
  };

  const calculateTotals = () => {
    let totalMaterials = 0;
    let totalLabour = 0;

    items.forEach(item => {
      // Material calculation with wastage
      const matBase = (item.quantity || 0) * (item.unit_price || 0);
      const matWaste = matBase * ((item.material_wastage_pct || 0) / 100);
      totalMaterials += matBase + matWaste;

      // Labour calculation with wastage
      const labBase = (item.labour_hours || 0) * (item.labour_rate || config.defaultLabourRate);
      const labWaste = labBase * ((item.labour_wastage_pct || 0) / 100);
      totalLabour += labBase + labWaste;
    });

    const baseSubtotal = totalMaterials + totalLabour;
    const supervision = totalLabour * (config.supervisionPct / 100);
    const overheadsPct = (baseSubtotal + supervision) * (config.overheadPct / 100);
    const totalOverheads = overheadsPct + overheadTotal;
    const preMargin = baseSubtotal + supervision + totalOverheads;
    const margin = preMargin * (config.marginPct / 100);
    const taxable = preMargin + margin;
    const gst = taxable * (config.gstPct / 100);
    const totalPrice = taxable + gst;

    return {
      totalMaterials,
      totalLabour,
      baseSubtotal,
      supervision,
      overheadsPct,
      overheadTotal,
      totalOverheads,
      preMargin,
      margin,
      taxable,
      gst,
      totalPrice
    };
  };

  const totals = calculateTotals();

  const handleAIItems = (aiItems: any[]) => {
    aiItems.forEach(item => {
      setNewItem({
        area: item.area,
        trade: item.trade,
        scope_of_work: item.scope_of_work,
        material_type: item.material_type,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        labour_hours: item.labour_hours
      });
      setTimeout(() => addItem(), 100);
    });
  };

  return (
    <div className="space-y-6">
      {/* AI Plan Analyzer */}
      <AIPlanAnalyzer 
        projectId={projectId} 
        estimateId={estimateId}
        onAddItems={handleAIItems}
      />

      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/20 to-accent/20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Materials</p>
            <p className="text-2xl font-mono font-bold">
              ${totals.totalMaterials.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Labour</p>
            <p className="text-2xl font-mono font-bold">
              ${totals.totalLabour.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Supervision</p>
            <p className="text-2xl font-mono font-bold text-secondary">
              ${totals.supervision.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overheads</p>
            <p className="text-2xl font-mono font-bold text-secondary">
              ${totals.totalOverheads.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Margin</p>
            <p className="text-2xl font-mono font-bold text-secondary">
              ${totals.margin.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">GST ({config.gstPct}%)</p>
            <p className="text-xl font-mono font-bold">${totals.gst.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">TOTAL PRICE (inc GST)</p>
            <p className="text-4xl font-mono font-bold text-accent">
              ${totals.totalPrice.toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {/* Configuration Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold">Estimate Configuration</h3>
          <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}>
            <DollarSign className="h-4 w-4 mr-2" />
            {showConfig ? "Hide" : "Show"} Settings
          </Button>
        </div>
        {showConfig && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label>Labour Rate ($/hr)</Label>
              <Input
                type="number"
                step="1"
                value={config.defaultLabourRate}
                onChange={(e) => setConfig({ ...config, defaultLabourRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Material Waste (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={config.materialWastage}
                onChange={(e) => setConfig({ ...config, materialWastage: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Labour Waste (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={config.labourWastage}
                onChange={(e) => setConfig({ ...config, labourWastage: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Supervision (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={config.supervisionPct}
                onChange={(e) => setConfig({ ...config, supervisionPct: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Overheads (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={config.overheadPct}
                onChange={(e) => setConfig({ ...config, overheadPct: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Margin (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={config.marginPct}
                onChange={(e) => setConfig({ ...config, marginPct: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Add Item Form */}
      <Card className="p-6">
        <h3 className="font-display text-xl font-bold mb-4">Add Line Item</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Area *</Label>
            <Input
              value={newItem.area}
              onChange={(e) => setNewItem({ ...newItem, area: e.target.value })}
              placeholder="e.g., Kitchen"
            />
          </div>
          <div>
            <Label>Trade *</Label>
            <Select
              value={newItem.trade}
              onValueChange={(value) => setNewItem({ ...newItem, trade: value, scope_of_work: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select trade" />
              </SelectTrigger>
              <SelectContent>
                {AU_TRADES.map(trade => (
                  <SelectItem key={trade} value={trade}>{trade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scope of Work *</Label>
            <Select
              value={newItem.scope_of_work}
              onValueChange={(value) => setNewItem({ ...newItem, scope_of_work: value })}
              disabled={!newItem.trade}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                {newItem.trade && SCOPE_OF_WORK[newItem.trade as keyof typeof SCOPE_OF_WORK]?.map(scope => (
                  <SelectItem key={scope} value={scope}>{scope}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Material Type *</Label>
            <Input
              value={newItem.material_type}
              onChange={(e) => setNewItem({ ...newItem, material_type: e.target.value })}
              placeholder="e.g., MGP12 90x45"
            />
          </div>
          <div>
            <Label>Qty *</Label>
            <Input
              type="number"
              step="0.01"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
            />
          </div>
          <div>
            <Label>Unit</Label>
            <Select
              value={newItem.unit}
              onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="m²">m² (square metres)</SelectItem>
                <SelectItem value="lm">lm (linear metres)</SelectItem>
                <SelectItem value="m³">m³ (cubic metres)</SelectItem>
                <SelectItem value="ea">ea (each)</SelectItem>
                <SelectItem value="sets">sets</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unit Cost ($) *</Label>
            <Input
              type="number"
              step="0.01"
              value={newItem.unit_price}
              onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
            />
          </div>
          <div>
            <Label>Labour Hrs</Label>
            <Input
              type="number"
              step="0.5"
              value={newItem.labour_hours}
              onChange={(e) => setNewItem({ ...newItem, labour_hours: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
        <Button onClick={addItem} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </Card>

      {/* Items Table */}
      <Card className="p-6">
        <h3 className="font-display text-xl font-bold mb-4">Estimate Lines</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>SOW</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">$/Unit</TableHead>
                <TableHead className="text-right">Labour Hrs</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const matBase = item.quantity * item.unit_price;
                const matWaste = matBase * (item.material_wastage_pct / 100);
                const labBase = item.labour_hours * item.labour_rate;
                const labWaste = labBase * (item.labour_wastage_pct / 100);
                const lineTotal = matBase + matWaste + labBase + labWaste;

                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.area}</TableCell>
                    <TableCell>{item.trade}</TableCell>
                    <TableCell>{item.scope_of_work}</TableCell>
                    <TableCell>{item.material_type}</TableCell>
                    <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right font-mono">${item.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{item.labour_hours}</TableCell>
                    <TableCell className="text-right font-mono font-bold">${lineTotal.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteItem(item.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};