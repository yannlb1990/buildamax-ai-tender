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
import { toast } from "sonner";
import { Plus, Trash2, DollarSign } from "lucide-react";

const SUGGESTED_OVERHEADS = [
  { category: "Transport", items: ["Fuel", "Vehicle Lease", "Rego & Insurance", "Tolls", "Parking"] },
  { category: "Communication", items: ["Mobile Phone", "Internet", "Software (Xero, etc)", "Cloud Storage"] },
  { category: "Equipment", items: ["Tool Hire", "Equipment Maintenance", "Safety Gear PPE", "First Aid Supplies"] },
  { category: "Insurance", items: ["Public Liability", "Workers Comp", "Professional Indemnity", "Vehicle Insurance"] },
  { category: "Office", items: ["Rent", "Electricity", "Stationery", "Accountant Fees", "Legal Fees"] },
  { category: "Marketing", items: ["Advertising", "Website Hosting", "Business Cards", "Trade Shows"] },
  { category: "Compliance", items: ["Licenses & Permits", "QBCC Fees", "Industry Association Fees", "Training & Certs"] },
];

interface OverheadManagerProps {
  projectId: string;
}

export const OverheadManager = ({ projectId }: OverheadManagerProps) => {
  const [overheads, setOverheads] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [newOverhead, setNewOverhead] = useState({
    name: "",
    category: "",
    amount: "",
    frequency: "one-time",
    cost_center_id: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [overheadsData, centersData] = await Promise.all([
      supabase.from("overhead_items").select("*").eq("project_id", projectId),
      supabase.from("cost_centers").select("*").eq("user_id", user.id).eq("is_active", true),
    ]);

    if (overheadsData.data) setOverheads(overheadsData.data);
    if (centersData.data) setCostCenters(centersData.data);
  };

  const addOverhead = async () => {
    if (!newOverhead.name || !newOverhead.category || !newOverhead.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("overhead_items").insert({
      project_id: projectId,
      user_id: user.id,
      name: newOverhead.name,
      category: newOverhead.category,
      amount: parseFloat(newOverhead.amount),
      frequency: newOverhead.frequency,
      cost_center_id: newOverhead.cost_center_id || null,
      notes: newOverhead.notes,
    });

    if (error) {
      toast.error("Failed to add overhead");
      return;
    }

    toast.success("Overhead added");
    setNewOverhead({
      name: "",
      category: "",
      amount: "",
      frequency: "one-time",
      cost_center_id: "",
      notes: "",
    });
    loadData();
  };

  const deleteOverhead = async (id: string) => {
    const { error } = await supabase.from("overhead_items").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete overhead");
      return;
    }
    toast.success("Overhead deleted");
    loadData();
  };

  const totalOverheads = overheads.reduce((sum, oh) => sum + parseFloat(oh.amount), 0);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-display text-xl font-bold mb-4">Add Overhead</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Category *</Label>
            <Select
              value={newOverhead.category}
              onValueChange={(value) => setNewOverhead({ ...newOverhead, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {SUGGESTED_OVERHEADS.map((cat) => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Item Name *</Label>
            <Select
              value={newOverhead.name}
              onValueChange={(value) => setNewOverhead({ ...newOverhead, name: value })}
              disabled={!newOverhead.category}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {SUGGESTED_OVERHEADS.find((c) => c.category === newOverhead.category)?.items.map(
                  (item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  )
                )}
                <SelectItem value="custom">Custom...</SelectItem>
              </SelectContent>
            </Select>
            {newOverhead.name === "custom" && (
              <Input
                className="mt-2"
                placeholder="Enter custom item name"
                onChange={(e) => setNewOverhead({ ...newOverhead, name: e.target.value })}
              />
            )}
          </div>

          <div>
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              value={newOverhead.amount}
              onChange={(e) => setNewOverhead({ ...newOverhead, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Frequency</Label>
            <Select
              value={newOverhead.frequency}
              onValueChange={(value) => setNewOverhead({ ...newOverhead, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-time">One-time</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {costCenters.length > 0 && (
            <div>
              <Label>Cost Center</Label>
              <Select
                value={newOverhead.cost_center_id}
                onValueChange={(value) => setNewOverhead({ ...newOverhead, cost_center_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Input
              value={newOverhead.notes}
              onChange={(e) => setNewOverhead({ ...newOverhead, notes: e.target.value })}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <Button onClick={addOverhead} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Overhead
        </Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold">Project Overheads</h3>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" />
            <span className="font-mono text-2xl font-bold">${totalOverheads.toFixed(2)}</span>
          </div>
        </div>

        {overheads.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No overheads added yet</p>
        ) : (
          <div className="space-y-2">
            {overheads.map((overhead) => (
              <div
                key={overhead.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{overhead.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {overhead.category} • {overhead.frequency}
                    {overhead.notes && ` • ${overhead.notes}`}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold">${parseFloat(overhead.amount).toFixed(2)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteOverhead(overhead.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};