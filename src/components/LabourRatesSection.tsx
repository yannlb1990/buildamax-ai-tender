import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [customTrades, setCustomTrades] = useState<string[]>([]);
  const [allTrades, setAllTrades] = useState<string[]>(AU_TRADES);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTradeName, setNewTradeName] = useState("");
  const [newTradeRate, setNewTradeRate] = useState("90");
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCustomTrades();
  }, []);

  const loadCustomTrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("custom_trades")
      .select("trade_name, default_rate")
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to load custom trades:", error);
      return;
    }

    if (data && data.length > 0) {
      const customTradeNames = data.map(t => t.trade_name);
      setCustomTrades(customTradeNames);
      setAllTrades([...AU_TRADES, ...customTradeNames]);
      
      // Set default rates for custom trades
      const customRates: Record<string, number> = {};
      data.forEach(t => {
        customRates[t.trade_name] = t.default_rate;
      });
      onRatesChange({ ...rates, ...customRates });
    }
  };

  const handleRateChange = (trade: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    onRatesChange({ ...rates, [trade]: numValue });
  };

  const toggleTrade = (trade: string) => {
    const newExpanded = new Set(expandedTrades);
    if (newExpanded.has(trade)) {
      newExpanded.delete(trade);
    } else {
      newExpanded.add(trade);
    }
    setExpandedTrades(newExpanded);
  };

  const addCustomTrade = async () => {
    if (!newTradeName.trim()) {
      toast.error("Please enter a trade name");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to add custom trades");
      return;
    }

    const { error } = await supabase
      .from("custom_trades")
      .insert({
        user_id: user.id,
        trade_name: newTradeName.trim(),
        default_rate: parseFloat(newTradeRate) || 90
      });

    if (error) {
      toast.error("Failed to add custom trade");
      console.error(error);
      return;
    }

    toast.success(`${newTradeName} added successfully`);
    setNewTradeName("");
    setNewTradeRate("90");
    setShowAddDialog(false);
    loadCustomTrades();
  };

  const deleteCustomTrade = async (tradeName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("custom_trades")
      .delete()
      .eq("user_id", user.id)
      .eq("trade_name", tradeName);

    if (error) {
      toast.error("Failed to delete trade");
      return;
    }

    toast.success(`${tradeName} removed`);
    loadCustomTrades();
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" />
            <h3 className="font-display text-xl font-bold">Labour Hourly Rates by Trade</h3>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Trade
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Click on a trade to view state-based rate variations (coming soon)
        </p>
        
        <div className="space-y-2">
          {allTrades.map(trade => {
            const isCustom = customTrades.includes(trade);
            const isExpanded = expandedTrades.has(trade);
            
            return (
              <Collapsible key={trade} open={isExpanded} onOpenChange={() => toggleTrade(trade)}>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium">{trade}</span>
                    {isCustom && (
                      <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded">Custom</span>
                    )}
                  </CollapsibleTrigger>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        step="0.50"
                        value={rates[trade] || DEFAULT_RATES[trade] || 90}
                        onChange={(e) => handleRateChange(trade, e.target.value)}
                        className="pl-7 h-9"
                        placeholder="0.00"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground min-w-[40px]">/hr</span>
                    
                    {isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCustomTrade(trade)}
                        className="h-9 w-9 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <CollapsibleContent>
                  <div className="mt-2 ml-10 p-3 bg-background rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">
                      State-based rate variations will be available soon. This will show different rates for NSW, VIC, QLD, SA, WA, TAS, NT, and ACT.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Trade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Trade Name</Label>
              <Input
                placeholder="e.g., Scaffolder, Crane Operator"
                value={newTradeName}
                onChange={(e) => setNewTradeName(e.target.value)}
              />
            </div>
            <div>
              <Label>Default Hourly Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.50"
                  placeholder="90.00"
                  value={newTradeRate}
                  onChange={(e) => setNewTradeRate(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addCustomTrade}>
              Add Trade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
