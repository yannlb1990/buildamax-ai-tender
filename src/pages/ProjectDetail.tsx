import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, FileText, DollarSign, CheckCircle, Loader2, Sparkles, Settings, Calculator, TrendingUp, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";
import { OverheadManager } from "@/components/OverheadManager";
import { EstimateTemplate } from "@/components/EstimateTemplate";
import { PlanViewer } from "@/components/PlanViewer";
import { TenderDocuments } from "@/components/TenderDocuments";
import { ProjectInsightsTab } from "@/components/ProjectInsightsTab";
import { NCCComplianceCard } from "@/components/NCCComplianceCard";

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [estimate, setEstimate] = useState<any>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const { data: analysesData, error: analysesError } = await supabase
        .from("ai_analyses")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (!analysesError) {
        setAnalyses(analysesData || []);
      }

      // Load or create estimate
      const { data: estimateData } = await supabase
        .from("estimates")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (estimateData) {
        setEstimate(estimateData);
      } else {
        // Create new estimate
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: newEstimate } = await supabase
            .from("estimates")
            .insert({
              project_id: projectId,
              user_id: user.id,
            })
            .select()
            .single();
          setEstimate(newEstimate);
        }
      }
    } catch (error) {
      console.error("Error loading project:", error);
      toast.error("Failed to load project");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const takeoffAnalysis = analyses.find(a => a.analysis_type === 'takeoff');
  const pricingAnalysis = analyses.find(a => a.analysis_type === 'pricing');

  return (
    <div className="min-h-screen bg-muted/30">
      <nav className="border-b border-border bg-background">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex gap-2">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Generate Tender
              </Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                Export to Excel
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-4xl font-bold">{project.name}</h1>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              project.status === "complete"
                ? "bg-accent/20 text-accent-foreground"
                : "bg-secondary/10 text-secondary"
            }`}>
              {project.status}
            </div>
          </div>
          <div className="text-muted-foreground space-y-1">
            {project.client_name && <p>Client: {project.client_name}</p>}
            {project.site_address && <p>Site: {project.site_address}</p>}
            <p>Created: {new Date(project.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <Tabs defaultValue="estimate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8">
            <TabsTrigger value="estimate">
              <Calculator className="h-4 w-4 mr-2" />
              Estimate
            </TabsTrigger>
            {project.plan_file_url && (
              <TabsTrigger value="plans">
                <FileText className="h-4 w-4 mr-2" />
                Plans
              </TabsTrigger>
            )}
            <TabsTrigger value="takeoff">
              <CheckCircle className="h-4 w-4 mr-2" />
              AI Takeoff
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              AI Pricing
            </TabsTrigger>
            <TabsTrigger value="insights">
              <TrendingUp className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="compliance">
              <ShieldCheck className="h-4 w-4 mr-2" />
              NCC
            </TabsTrigger>
            <TabsTrigger value="overheads">
              <Settings className="h-4 w-4 mr-2" />
              Overheads
            </TabsTrigger>
            <TabsTrigger value="tender">
              <FileText className="h-4 w-4 mr-2" />
              Tender
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estimate">
            {estimate ? (
              <EstimateTemplate projectId={projectId!} estimateId={estimate.id} />
            ) : (
              <Card className="p-6">
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-secondary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading estimate...</p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="takeoff">
            <Alert className="mb-6 bg-primary/5 border-primary/20">
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>What is AI Takeoff?</AlertTitle>
              <AlertDescription>
                Upload your architectural plans (PDF, PNG, JPG) and our AI will automatically detect and quantify:
                walls, doors, windows, rooms, fixtures, and finishes. This creates a Bill of Quantities for pricing.
                <br/><br/>
                <strong>Next step:</strong> After takeoff, go to "AI Pricing" to get cost estimates.
              </AlertDescription>
            </Alert>
            
            <Card className="p-6">
              <h2 className="font-display text-2xl font-bold mb-4">Quantity Takeoff</h2>
              {takeoffAnalysis ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      <h3 className="font-semibold">AI Analysis Result</h3>
                    </div>
                    <div className="whitespace-pre-wrap text-sm font-mono bg-background p-4 rounded border border-border max-h-96 overflow-y-auto">
                      {JSON.stringify(takeoffAnalysis.results, null, 2)}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Confidence: {takeoffAnalysis.confidence_score}% • Generated: {new Date(takeoffAnalysis.created_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-secondary mx-auto mb-4" />
                  <p className="text-muted-foreground">AI takeoff analysis in progress...</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Alert className="mb-6 bg-accent/5 border-accent/20">
              <DollarSign className="h-4 w-4" />
              <AlertTitle>What is AI Pricing?</AlertTitle>
              <AlertDescription>
                Our AI matches your takeoff quantities to current Australian market rates (materials + labour). 
                Pricing is based on your region and includes overheads, margins, and GST.
                <br/><br/>
                <strong>Requirement:</strong> Complete "AI Takeoff" first, or manually add items to the estimate tab.
              </AlertDescription>
            </Alert>
            
            <Card className="p-6">
              <h2 className="font-display text-2xl font-bold mb-4">Cost Estimate</h2>
              {pricingAnalysis ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      <h3 className="font-semibold">AI Pricing Analysis</h3>
                    </div>
                    <div className="whitespace-pre-wrap text-sm font-mono bg-background p-4 rounded border border-border max-h-96 overflow-y-auto">
                      {JSON.stringify(pricingAnalysis.results, null, 2)}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generated: {new Date(pricingAnalysis.created_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-secondary mx-auto mb-4" />
                  <p className="text-muted-foreground">AI pricing analysis in progress...</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {project.plan_file_url && (
            <TabsContent value="plans">
              <PlanViewer planUrl={project.plan_file_url} />
            </TabsContent>
          )}

          <TabsContent value="overheads">
            <OverheadManager projectId={projectId!} />
          </TabsContent>

          <TabsContent value="tender" className="space-y-6">
            <TenderDocuments projectId={projectId!} />
            
            <Card className="p-6">
              <h3 className="font-display text-xl font-bold mb-4">Generate Tender Document</h3>
              <p className="text-muted-foreground mb-4">
                Create a professional tender document based on your estimate and project details.
              </p>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <FileText className="mr-2 h-4 w-4" />
                Generate Tender PDF
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="insights">
            <ProjectInsightsTab 
              estimateItems={estimate?.estimate_items || []} 
            />
          </TabsContent>

          <TabsContent value="compliance">
            <NCCComplianceCard 
              estimateItems={estimate?.estimate_items || []} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetail;
