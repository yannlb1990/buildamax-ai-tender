import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, Info } from "lucide-react";
import { PlanLibrary } from "./PlanLibrary";
import { PlanViewer } from "./PlanViewer";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AIPlanAnalyzerEnhancedProps {
  projectId: string;
  estimateId?: string;
  onAddItems?: (items: any[]) => void;
}

export const AIPlanAnalyzerEnhanced = ({ projectId, estimateId, onAddItems }: AIPlanAnalyzerEnhancedProps) => {
  const [selectedPlanUrl, setSelectedPlanUrl] = useState<string | null>(null);
  const [selectedPlanPageId, setSelectedPlanPageId] = useState<string | null>(null);

  const handleOpenPlan = (planUrl: string, planPageId: string) => {
    setSelectedPlanUrl(planUrl);
    setSelectedPlanPageId(planPageId);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-secondary/5 to-accent/5">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-6 w-6 text-secondary" />
          <h3 className="text-xl font-semibold">AI Takeoff - PDF Plan Analysis</h3>
        </div>
        
        <Alert className="border-secondary/30 bg-secondary/5">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>What is AI Takeoff?</strong><br />
            Upload your architectural plans (PDF, PNG, JPG), set the scale, and use measurement tools to
            extract quantities for estimation. Measurements are labeled, categorized, and can be exported for
            use in your estimates.
          </AlertDescription>
        </Alert>
      </Card>

      {/* Plan Library */}
      <PlanLibrary projectId={projectId} onOpenPlan={handleOpenPlan} />

      {/* Plan Viewer - Only show when a plan is selected */}
      {selectedPlanUrl && selectedPlanPageId && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-lg font-semibold">Plan Viewer</h4>
          </div>
          <PlanViewer 
            planUrl={selectedPlanUrl} 
            projectId={projectId}
            wizardMode={false}
          />
        </Card>
      )}
    </div>
  );
};
