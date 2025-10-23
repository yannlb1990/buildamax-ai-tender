import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const OVERHEAD_CATEGORIES = [
  "Insurance",
  "Equipment Hire",
  "Site Facilities",
  "Waste Disposal",
  "Permits & Fees",
  "Safety Equipment",
  "Site Security",
  "Utilities",
  "Temporary Works",
  "Other"
];

interface OverheadItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  notes: string;
}

interface OverheadsSectionProps {
  projectId: string;
  onTotalChange: (total: number) => void;
}

export const OverheadsSection = ({ projectId, onTotalChange }: OverheadsSectionProps) => {
  const [overheads, setOverheads] = useState<OverheadItem[]>([]);
  const [newOverhead, setNewOverhead] = useState({
    name: "",
    category: "Insurance",
    amount: "",
    frequency: "one-time",
    notes: ""
  });

  useEffect(() => {
    loadOverheads();
  }, [projectId]);

  useEffect(() => {
    const total = overheads.reduce((sum, item) => sum + item.amount, 0);
    onTotalChange(total);
  }, [overheads, onTotalChange]);

  const loadOverheads = async () => {
    const { data, error } = await supabase
      .from("overhead_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");

    if (error) {
      console.error("Error loading overheads:", error);
      return;
    }

    if (data) {
      const mapped = data.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        amount: parseFloat(item.amount.toString()),
        frequency: item.frequency || "one-time",
        notes: item.notes || ""
      }));
      setOverheads(mapped);
    }
  };

  const addOverhead = async () => {
    if (!newOverhead.name || !newOverhead.amount) {
      toast.error("Please fill in name and amount");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const { data, error } = await supabase
      .from("overhead_items")
      .insert({
        project_id: projectId,
        user_id: user.id,
        name: newOverhead.name,
        category: newOverhead.category,
        amount: parseFloat(newOverhead.amount),
        frequency: newOverhead.frequency,
        notes: newOverhead.notes
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding overhead:", error);
      toast.error("Failed to add overhead");
      return;
    }

    if (data) {
      setOverheads([...overheads, {
        id: data.id,
        name: data.name,
        category: data.category,
        amount: parseFloat(data.amount.toString()),
        frequency: data.frequency || "one-time",
        notes: data.notes || ""
      }]);
      setNewOverhead({ name: "", category: "Insurance", amount: "", frequency: "one-time", notes: "" });
      toast.success("Overhead added");
    }
  };

  const deleteOverhead = async (id: string) => {
    const { error } = await supabase
      .from("overhead_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting overhead:", error);
      toast.error("Failed to delete overhead");
      return;
    }

    setOverheads(overheads.filter(item => item.id !== id));
    toast.success("Overhead removed");
  };

  const total = overheads.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="p-6">
      <h3 className="font-display text-xl font-bold mb-4">Project Overheads</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Fixed overhead costs that are specific to this project (insurance, permits, equipment hire, etc.)
      </p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div>
          <Label>Overhead Name</Label>
          <Input
            value={newOverhead.name}
            onChange={(e) => setNewOverhead({ ...newOverhead, name: e.target.value })}
            placeholder="e.g., Site insurance"
          />
        </div>
        <div>
          <Label>Category</Label>
          <Select
            value={newOverhead.category}
            onValueChange={(value) => setNewOverhead({ ...newOverhead, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OVERHEAD_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Amount ($)</Label>
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
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Notes</Label>
          <Input
            value={newOverhead.notes}
            onChange={(e) => setNewOverhead({ ...newOverhead, notes: e.target.value })}
            placeholder="Optional notes"
          />
        </div>
      </div>

      <Button onClick={addOverhead} variant="outline" className="mb-4">
        <Plus className="h-4 w-4 mr-2" />
        Add Overhead
      </Button>

      {overheads.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overheads.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="capitalize">{item.frequency}</TableCell>
                  <TableCell className="text-right font-mono">${item.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.notes}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteOverhead(item.id)}
                      className="text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Total Project Overheads:</p>
              <p className="text-2xl font-mono font-bold text-primary">${total.toFixed(2)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              These are added on top of percentage-based overheads in the final calculation
            </p>
          </div>
        </>
      )}
    </Card>
  );
};
