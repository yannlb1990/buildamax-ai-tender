import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, Zap, Loader2 } from "lucide-react";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1, "Project name required").max(200),
  client_name: z.string().max(200).optional(),
  site_address: z.string().max(500).optional(),
  plan_description: z.string().min(10, "Please provide a detailed description (min 10 characters)").max(5000),
});

const NewProject = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    client_name: "",
    site_address: "",
    plan_description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validData = projectSchema.parse(formData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to create a project");
        navigate("/auth");
        return;
      }

      // Create project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: validData.name,
          client_name: validData.client_name || null,
          site_address: validData.site_address || null,
          status: "in_progress",
        })
        .select()
        .single();

      if (projectError) throw projectError;

      toast.success("Project created! Running AI analysis...");

      // Run AI takeoff analysis
      const { data: takeoffData, error: takeoffError } = await supabase.functions.invoke('analyze-plan', {
        body: {
          projectId: project.id,
          planDescription: validData.plan_description,
          analysisType: 'takeoff'
        }
      });

      if (takeoffError) {
        console.error("Takeoff analysis error:", takeoffError);
        toast.error("Project created, but AI analysis failed");
      } else {
        toast.success("AI takeoff analysis complete!");
      }

      // Run AI pricing analysis
      const { data: pricingData, error: pricingError } = await supabase.functions.invoke('analyze-plan', {
        body: {
          projectId: project.id,
          planDescription: validData.plan_description,
          analysisType: 'pricing'
        }
      });

      if (!pricingError && pricingData?.success) {
        toast.success("AI pricing analysis complete!");
      }

      navigate(`/project/${project.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Project creation error:", error);
        toast.error("Failed to create project");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <nav className="border-b border-border bg-background">
        <div className="container mx-auto px-6 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-2">New Project</h1>
          <p className="text-muted-foreground">
            Create a new estimation project with AI-powered analysis
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Duplex Build - Gold Coast"
                required
                maxLength={200}
              />
            </div>

            <div>
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="e.g., John Smith"
                maxLength={200}
              />
            </div>

            <div>
              <Label htmlFor="site_address">Site Address</Label>
              <Input
                id="site_address"
                value={formData.site_address}
                onChange={(e) => setFormData({ ...formData, site_address: e.target.value })}
                placeholder="e.g., 123 Main St, Surfers Paradise QLD 4217"
                maxLength={500}
              />
            </div>

            <div>
              <Label htmlFor="plan_description">Project Description *</Label>
              <Textarea
                id="plan_description"
                value={formData.plan_description}
                onChange={(e) => setFormData({ ...formData, plan_description: e.target.value })}
                placeholder="Describe the construction project in detail: building type, size, number of rooms, materials, finishes, special requirements, etc. Be as specific as possible for accurate AI analysis.

Example: Two-storey duplex, each side 180m². Ground floor: open plan kitchen/living/dining, 1 bedroom, 1 bathroom, laundry. First floor: 3 bedrooms (master with ensuite), main bathroom. Timber frame construction, brick veneer exterior, Colorbond roof, standard finishes throughout."
                className="min-h-[200px]"
                required
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Min 10 characters. Detailed descriptions produce better AI analysis results.
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-accent mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">AI-Powered Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Upon creation, our AI will automatically analyze your project to generate:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Detailed quantity takeoffs by trade</li>
                    <li>• Material and labour pricing estimates</li>
                    <li>• NCC compliance recommendations</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating & Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default NewProject;
