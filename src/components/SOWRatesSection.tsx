import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wrench, Plus, Search } from "lucide-react";
import { SCOPE_OF_WORK_RATES, getSOWCategories } from "@/data/scopeOfWorkRates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type State = "NSW" | "VIC" | "QLD";

export const SOWRatesSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState<State>("NSW");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSOW, setNewSOW] = useState({
    trade: "",
    sowName: "",
    description: "",
    unit: "",
    rate: "",
    state: "NSW"
  });

  const categories = ["all", ...getSOWCategories()];

  const filteredSOW = SCOPE_OF_WORK_RATES.filter(item => {
    const matchesSearch = 
      item.sow.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getRate = (item: typeof SCOPE_OF_WORK_RATES[0]) => {
    switch(selectedState) {
      case "NSW": return item.nswRate;
      case "VIC": return item.vicRate;
      case "QLD": return item.qldRate;
    }
  };

  const handleAddSOW = async () => {
    if (!newSOW.trade || !newSOW.sowName || !newSOW.unit || !newSOW.rate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to add custom SOW rates");
      return;
    }

    const { error } = await supabase.from('custom_sow_rates').insert({
      user_id: user.id,
      trade: newSOW.trade,
      sow_name: newSOW.sowName,
      description: newSOW.description,
      unit: newSOW.unit,
      rate: parseFloat(newSOW.rate),
      state: newSOW.state
    });

    if (error) {
      toast.error("Failed to add SOW rate");
      console.error(error);
      return;
    }

    toast.success("SOW rate added successfully");
    setShowAddDialog(false);
    setNewSOW({ trade: "", sowName: "", description: "", unit: "", rate: "", state: "NSW" });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-accent" />
          <h3 className="font-display text-xl font-bold">Scope of Work Rates</h3>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom SOW
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Complete job pricing including materials and labour by state (100+ items)
      </p>

      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search scope of work, trade, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedState} onValueChange={(v) => setSelectedState(v as State)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NSW">NSW Pricing</SelectItem>
            <SelectItem value="VIC">VIC Pricing</SelectItem>
            <SelectItem value="QLD">QLD Pricing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.slice(1).map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-semibold">Trade</th>
                  <th className="text-left py-3 px-2 font-semibold">Scope of Work</th>
                  <th className="text-left py-3 px-2 font-semibold">Description</th>
                  <th className="text-center py-3 px-2 font-semibold">Unit</th>
                  <th className="text-right py-3 px-2 font-semibold">{selectedState} Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredSOW.slice(0, 100).map((item, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2 text-muted-foreground">{item.trade}</td>
                    <td className="py-3 px-2 font-medium">{item.sow}</td>
                    <td className="py-3 px-2 text-xs text-muted-foreground max-w-xs truncate">
                      {item.description}
                    </td>
                    <td className="py-3 px-2 text-center text-muted-foreground">{item.unit}</td>
                    <td className="py-3 px-2 text-right font-mono font-bold">
                      ${getRate(item).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSOW.length > 100 && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Showing 100 of {filteredSOW.length} results. Refine your search to see more.
              </p>
            )}
            {filteredSOW.length === 0 && (
              <p className="text-sm text-muted-foreground mt-3 text-center py-8">
                No scope of work items found. Try a different search term or category.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Scope of Work Rate</DialogTitle>
            <DialogDescription>
              Add a custom SOW rate for your project-specific pricing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trade">Trade *</Label>
                <Input
                  id="trade"
                  value={newSOW.trade}
                  onChange={(e) => setNewSOW({ ...newSOW, trade: e.target.value })}
                  placeholder="e.g., Carpenter"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sowName">SOW Name *</Label>
                <Input
                  id="sowName"
                  value={newSOW.sowName}
                  onChange={(e) => setNewSOW({ ...newSOW, sowName: e.target.value })}
                  placeholder="e.g., Wall Framing"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newSOW.description}
                onChange={(e) => setNewSOW({ ...newSOW, description: e.target.value })}
                placeholder="e.g., Supply and install wall framing"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  value={newSOW.unit}
                  onChange={(e) => setNewSOW({ ...newSOW, unit: e.target.value })}
                  placeholder="e.g., m², lm, unit"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rate">Rate ($) *</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={newSOW.rate}
                  onChange={(e) => setNewSOW({ ...newSOW, rate: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select value={newSOW.state} onValueChange={(v) => setNewSOW({ ...newSOW, state: v })}>
                  <SelectTrigger id="state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NSW">NSW</SelectItem>
                    <SelectItem value="VIC">VIC</SelectItem>
                    <SelectItem value="QLD">QLD</SelectItem>
                    <SelectItem value="SA">SA</SelectItem>
                    <SelectItem value="WA">WA</SelectItem>
                    <SelectItem value="TAS">TAS</SelectItem>
                    <SelectItem value="NT">NT</SelectItem>
                    <SelectItem value="ACT">ACT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSOW}>
              Add SOW Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
