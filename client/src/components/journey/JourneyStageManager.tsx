import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Eye,
  ArrowUp,
  ArrowDown,
  Clock,
  Target,
  Save,
  X
} from "lucide-react";

// Types
import { JourneyStage, InsertJourneyStage } from "@shared/schema";

interface JourneyStageManagerProps {
  journeyStages: JourneyStage[];
}

const defaultStages: Partial<InsertJourneyStage>[] = [
  {
    name: "Awareness",
    description: "Customer becomes aware of your brand or product",
    order: 1,
    color: "#3b82f6",
    icon: "Eye",
    expectedDuration: 7,
    goals: ["Brand recognition", "Problem identification", "Initial interest"],
    kpis: { impressions: 1000, reach: 500, engagement_rate: 0.05 }
  },
  {
    name: "Consideration",
    description: "Customer evaluates your solution against alternatives",
    order: 2,
    color: "#f59e0b",
    icon: "Search",
    expectedDuration: 14,
    goals: ["Solution evaluation", "Feature comparison", "Proof of concept"],
    kpis: { website_visits: 3, content_downloads: 1, demo_requests: 0.1 }
  },
  {
    name: "Decision",
    description: "Customer makes the purchase decision",
    order: 3,
    color: "#10b981",
    icon: "Check",
    expectedDuration: 7,
    goals: ["Purchase completion", "Contract signing", "Implementation planning"],
    kpis: { conversion_rate: 0.15, deal_closure: 1, onboarding_start: 1 }
  },
  {
    name: "Retention",
    description: "Customer uses and derives value from your product",
    order: 4,
    color: "#8b5cf6",
    icon: "Heart",
    expectedDuration: 365,
    goals: ["Product adoption", "Value realization", "Satisfaction"],
    kpis: { usage_frequency: 20, support_tickets: 2, satisfaction_score: 8 }
  },
  {
    name: "Advocacy",
    description: "Customer becomes a promoter and refers others",
    order: 5,
    color: "#ec4899",
    icon: "Share",
    expectedDuration: 90,
    goals: ["Referrals", "Reviews", "Case studies", "Community participation"],
    kpis: { referral_rate: 0.1, review_score: 4.5, case_study_participation: 0.05 }
  }
];

const iconOptions = [
  "Eye", "Search", "Check", "Heart", "Share", "Target", "Clock", "Settings",
  "Users", "Mail", "Phone", "Globe", "Star", "Zap", "Trophy", "Gift"
];

const colorOptions = [
  "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#ef4444",
  "#6366f1", "#14b8a6", "#f97316", "#84cc16", "#a855f7", "#06b6d4"
];

export default function JourneyStageManager({ journeyStages }: JourneyStageManagerProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<JourneyStage | null>(null);
  const [formData, setFormData] = useState<Partial<InsertJourneyStage>>({
    name: "",
    description: "",
    order: journeyStages.length + 1,
    color: "#6366f1",
    icon: "Target",
    expectedDuration: 30,
    isActive: true,
    goals: [],
    kpis: {}
  });

  // Create stage mutation
  const createStageMutation = useMutation({
    mutationFn: async (stageData: InsertJourneyStage) => {
      const response = await fetch("/api/journey-stages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stageData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journey-stages"] });
      toast({
        title: "Stage created",
        description: "Journey stage has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create journey stage.",
        variant: "destructive",
      });
    },
  });

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ id, ...stageData }: Partial<JourneyStage>) => {
      const response = await fetch(`/api/journey-stages/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stageData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journey-stages"] });
      toast({
        title: "Stage updated",
        description: "Journey stage has been updated successfully.",
      });
      setEditingStage(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update journey stage.",
        variant: "destructive",
      });
    },
  });

  // Delete stage mutation
  const deleteStageMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/journey-stages/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journey-stages"] });
      toast({
        title: "Stage deleted",
        description: "Journey stage has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete journey stage.",
        variant: "destructive",
      });
    },
  });

  // Initialize default stages mutation
  const initializeStagesMutation = useMutation({
    mutationFn: async () => {
      const promises = defaultStages.map(stage => 
        fetch("/api/journey-stages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(stage),
        }).then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journey-stages"] });
      toast({
        title: "Stages initialized",
        description: "Default journey stages have been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize journey stages.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      order: journeyStages.length + 1,
      color: "#6366f1",
      icon: "Target",
      expectedDuration: 30,
      isActive: true,
      goals: [],
      kpis: {}
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Name and description are required.",
        variant: "destructive",
      });
      return;
    }

    if (editingStage) {
      updateStageMutation.mutate({ ...editingStage, ...formData });
    } else {
      createStageMutation.mutate(formData as InsertJourneyStage);
    }
  };

  const startEditing = (stage: JourneyStage) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      description: stage.description || "",
      order: stage.order,
      color: stage.color || "#6366f1",
      icon: stage.icon || "Target",
      expectedDuration: stage.expectedDuration || 30,
      isActive: stage.isActive,
      goals: stage.goals || [],
      kpis: stage.kpis || {}
    });
    setIsCreateDialogOpen(true);
  };

  const handleGoalsChange = (goalText: string) => {
    const goals = goalText.split('\n').filter(goal => goal.trim());
    setFormData(prev => ({ ...prev, goals }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Journey Stage Management</h2>
          <p className="text-gray-500 mt-1">Configure and customize your customer journey stages</p>
        </div>
        <div className="flex items-center space-x-3">
          {journeyStages.length === 0 && (
            <Button
              variant="outline"
              onClick={() => initializeStagesMutation.mutate()}
              disabled={initializeStagesMutation.isPending}
            >
              <Settings className="mr-2 h-4 w-4" />
              Initialize Defaults
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingStage(null); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Stage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingStage ? "Edit Journey Stage" : "Create Journey Stage"}
                  </DialogTitle>
                  <DialogDescription>
                    Define a stage in the customer journey with goals and KPIs.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Stage Name</Label>
                      <Input
                        id="name"
                        value={formData.name || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Awareness"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="order">Order</Label>
                      <Input
                        id="order"
                        type="number"
                        value={formData.order || 1}
                        onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what happens in this stage..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="icon">Icon</Label>
                      <Select value={formData.icon || "Target"} onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map(icon => (
                            <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="color">Color</Label>
                      <Select value={formData.color || "#6366f1"} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map(color => (
                            <SelectItem key={color} value={color}>
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                                <span>{color}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="duration">Expected Duration (days)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.expectedDuration || 30}
                        onChange={(e) => setFormData(prev => ({ ...prev, expectedDuration: parseInt(e.target.value) }))}
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="goals">Goals (one per line)</Label>
                    <Textarea
                      id="goals"
                      value={(formData.goals || []).join('\n')}
                      onChange={(e) => handleGoalsChange(e.target.value)}
                      placeholder="Brand recognition&#10;Problem identification&#10;Initial interest"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive || false}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Active Stage</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createStageMutation.isPending || updateStageMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {editingStage ? "Update" : "Create"} Stage
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stages List */}
      {journeyStages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No journey stages configured</h3>
            <p className="text-gray-500 text-center mb-4">
              Set up journey stages to track and analyze customer progression through your sales funnel.
            </p>
            <Button
              onClick={() => initializeStagesMutation.mutate()}
              disabled={initializeStagesMutation.isPending}
            >
              <Settings className="mr-2 h-4 w-4" />
              Initialize Default Stages
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {journeyStages
            .sort((a, b) => a.order - b.order)
            .map((stage, index) => (
              <Card key={stage.id} className={!stage.isActive ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: stage.color || "#6366f1" }}
                      >
                        {stage.order}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-xl">{stage.name}</CardTitle>
                          <Badge variant={stage.isActive ? "default" : "secondary"}>
                            {stage.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">
                          {stage.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(stage)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteStageMutation.mutate(stage.id)}
                        disabled={deleteStageMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <Target className="mr-2 h-4 w-4" />
                        Goals
                      </h4>
                      <div className="space-y-1">
                        {(stage.goals && stage.goals.length > 0) ? (
                          stage.goals.map((goal, idx) => (
                            <div key={idx} className="text-sm text-gray-600 flex items-start">
                              <span className="mr-2">•</span>
                              <span>{goal}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400">No goals defined</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        Timeline
                      </h4>
                      <p className="text-sm text-gray-600">
                        Expected duration: {stage.expectedDuration || 0} days
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Configuration
                      </h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Icon: {stage.icon}</p>
                        <p>Color: <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: stage.color || "#6366f1" }}></span> {stage.color || "#6366f1"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}