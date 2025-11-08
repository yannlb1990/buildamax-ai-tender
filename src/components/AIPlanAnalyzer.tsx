import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Sparkles, FileText, ExternalLink, GripVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AnalysisItem {
  id: string;
  trade: string;
  sow: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  nccReference: string;
}

interface AIPlanAnalyzerProps {
  projectId: string;
  estimateId?: string;
  onAddItems?: (items: any[]) => void;
}

export const AIPlanAnalyzer = ({ projectId, estimateId, onAddItems }: AIPlanAnalyzerProps) => {
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [scopeDescription, setScopeDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<AnalysisItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handlePlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPlanFiles(Array.from(e.target.files));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotoFiles(Array.from(e.target.files));
    }
  };

  const analyzeWithAI = async () => {
    if (planFiles.length === 0 && photoFiles.length === 0 && !scopeDescription) {
      toast.error("Please upload files or describe the scope of work");
      return;
    }

    setAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload files to storage
      const uploadedUrls: string[] = [];
      
      for (const file of [...planFiles, ...photoFiles]) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from("project-files")
          .upload(fileName, file);

        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from("project-files")
          .getPublicUrl(fileName);
        
        uploadedUrls.push(publicUrl);
      }

      // Call AI analysis function
      const { data, error } = await supabase.functions.invoke("analyze-plan-takeoff", {
        body: {
          planUrl: uploadedUrls[0] || "",
          projectName: scopeDescription || "Construction Project",
          additionalContext: scopeDescription
        }
      });

      if (error) throw error;

      // Transform AI response into suggestions with NCC references
      const aiSuggestions: AnalysisItem[] = (data.takeoffItems || []).map((item: any, index: number) => ({
        id: `ai-${index}`,
        trade: item.trade || "General",
        sow: item.scope_package || "General Work",
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || "item",
        unitPrice: parseFloat(item.unit_rate) || 0,
        nccReference: getNccReference(item.trade, item.scope_package)
      }));

      setSuggestions(aiSuggestions);
      toast.success(`AI analyzed ${aiSuggestions.length} items`);
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze: " + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getNccReference = (trade: string, sow: string): string => {
    const nccMap: Record<string, string> = {
      "Framing": "NCC-B1.2-Structural-Provisions",
      "Plumbing": "NCC-F2-Sanitary-Plumbing",
      "Electrical": "NCC-E1-Electrical-Services",
      "Fire": "NCC-C3-Fire-Detection",
      "Insulation": "NCC-J1-Energy-Efficiency",
      "Concrete": "NCC-B1-Structural",
      "Roofing": "NCC-B2-Weatherproofing",
    };

    for (const [key, value] of Object.entries(nccMap)) {
      if (sow?.includes(key) || trade?.includes(key)) {
        return value;
      }
    }
    return "NCC-General";
  };

  const openNccRules = (reference: string) => {
    const nccUrl = `https://ncc.abcb.gov.au/search?query=${encodeURIComponent(reference)}`;
    window.open(nccUrl, "_blank");
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const addToEstimate = (item: AnalysisItem) => {
    if (onAddItems) {
      onAddItems([{
        area: "AI Analyzed",
        trade: item.trade,
        scope_of_work: item.sow,
        material_type: item.description,
        quantity: item.quantity.toString(),
        unit: item.unit,
        unit_price: item.unitPrice.toString(),
        labour_hours: "0"
      }]);
      toast.success("Item added to estimate");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-secondary/5 to-accent/5">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-6 w-6 text-secondary" />
          <h3 className="text-xl font-semibold">AI Plan Analyser</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Plans */}
          <div>
            <Label>Upload Construction Plans</Label>
            <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-secondary transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <Input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handlePlanUpload}
                className="hidden"
                id="plan-upload"
              />
              <label htmlFor="plan-upload" className="cursor-pointer">
                <div className="text-sm text-muted-foreground">
                  {planFiles.length > 0 ? `${planFiles.length} file(s) selected` : "Click to upload plans"}
                </div>
              </label>
            </div>
          </div>

          {/* Upload Photos */}
          <div>
            <Label>Upload Site Photos</Label>
            <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-secondary transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <Input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <div className="text-sm text-muted-foreground">
                  {photoFiles.length > 0 ? `${photoFiles.length} photo(s) selected` : "Click to upload photos"}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Scope Description */}
        <div className="mt-4">
          <Label>Describe Scope of Work</Label>
          <Textarea
            placeholder="E.g., Single storey extension, new bathroom, kitchen renovation, etc."
            value={scopeDescription}
            onChange={(e) => setScopeDescription(e.target.value)}
            className="mt-2 min-h-[100px]"
          />
        </div>

        <Button
          onClick={analyzeWithAI}
          disabled={analyzing}
          className="mt-4 w-full"
        >
          {analyzing ? (
            <>
              <Sparkles className="mr-2 h-4 w-4 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze & Generate Suggestions
            </>
          )}
        </Button>
      </Card>

      {/* AI Suggestions Table */}
      {suggestions.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-secondary" />
              <h3 className="text-lg font-semibold">AI Suggested Items</h3>
              <span className="text-sm text-muted-foreground">
                (Drag items to estimation tool or click to add)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>SOW</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>NCC</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((item) => (
                  <TableRow
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                    className={`cursor-move hover:bg-muted/50 ${
                      draggedItem === item.id ? "opacity-50" : ""
                    }`}
                  >
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {item.trade}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{item.sow}</TableCell>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                    <TableCell className="text-right font-mono">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openNccRules(item.nccReference)}
                        className="text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {item.nccReference.split("-")[1]}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addToEstimate(item)}
                      >
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};
