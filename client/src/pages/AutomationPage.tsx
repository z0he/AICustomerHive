import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, Plus, Play, Pause, Trash2, BarChart3, Clock, 
  CheckCircle2, XCircle, Mail, UserPlus, Edit, Settings,
  ArrowRight, Activity, TrendingUp
} from "lucide-react";

interface WorkflowCondition {
  field: string;
  operator: string;
  value: string | number;
}

interface WorkflowTrigger {
  id: string;
  type: string;
  name: string;
  conditions: WorkflowCondition[];
}

interface WorkflowAction {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, any>;
  delay: number;
}

interface Workflow {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  lastRun?: string;
  totalExecutions: number;
  successRate: number;
  createdAt: string;
}

interface WorkflowLog {
  id: number;
  workflowId: number;
  workflowName: string;
  leadId: number;
  leadName: string;
  action: string;
  status: "success" | "error";
  timestamp: string;
  details: string;
}

const TRIGGER_TYPES = [
  { value: "lead_score_change", label: "Lead Score Change" },
  { value: "status_change", label: "Lifecycle Stage Change" },
  { value: "form_submitted", label: "Form Submitted" },
  { value: "tag_added", label: "Tag Added" },
  { value: "campaign_joined", label: "Campaign Joined" },
  { value: "email_opened", label: "Email Opened" },
  { value: "link_clicked", label: "Link Clicked" }
];

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email", icon: Mail },
  { value: "assign_owner", label: "Assign Owner", icon: UserPlus },
  { value: "update_stage", label: "Update Lifecycle Stage", icon: TrendingUp },
  { value: "add_tag", label: "Add Tag", icon: Settings },
  { value: "create_touchpoint", label: "Create Touchpoint", icon: Activity },
  { value: "wait", label: "Wait/Delay", icon: Clock }
];

const OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater than or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less than or equal" },
  { value: "contains", label: "contains" }
];

export default function AutomationPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState("workflows");
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  // Form state for workflow builder
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [triggerConditions, setTriggerConditions] = useState<WorkflowCondition[]>([
    { field: "", operator: "eq", value: "" }
  ]);
  const [actions, setActions] = useState<WorkflowAction[]>([]);

  // Fetch workflows
  const { data: workflows = [], isLoading: workflowsLoading } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
  });

  // Fetch workflow logs
  const { data: logs = [], isLoading: logsLoading } = useQuery<WorkflowLog[]>({
    queryKey: ["/api/workflows/logs"],
  });

  // Toggle workflow mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest(`/api/workflows/${id}/toggle`, "PATCH", { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Success",
        description: "Workflow status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update workflow status",
        variant: "destructive",
      });
    },
  });

  // Create workflow mutation
  const createMutation = useMutation({
    mutationFn: async (workflowData: any) => {
      const res = await apiRequest("/api/workflows", "POST", workflowData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "Workflow created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create workflow",
        variant: "destructive",
      });
    },
  });

  // Test workflow mutation
  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/workflows/${id}/test`, "POST");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Test Complete",
        description: `This workflow would affect ${data.matchedLeads} out of ${data.totalLeads} contacts`,
      });
    },
  });

  const resetForm = () => {
    setWorkflowName("");
    setWorkflowDescription("");
    setTriggerType("");
    setTriggerConditions([{ field: "", operator: "eq", value: "" }]);
    setActions([]);
    setEditingWorkflow(null);
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        id: `action_${Date.now()}`,
        type: "",
        name: "",
        parameters: {},
        delay: 0,
      },
    ]);
  };

  const updateAction = (index: number, updates: Partial<WorkflowAction>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleCreateWorkflow = () => {
    if (!workflowName || !triggerType || actions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const workflowData = {
      name: workflowName,
      description: workflowDescription,
      isActive: true,
      trigger: {
        id: `trigger_${Date.now()}`,
        type: triggerType,
        name: TRIGGER_TYPES.find(t => t.value === triggerType)?.label || triggerType,
        conditions: triggerConditions.filter(c => c.field && c.value),
      },
      actions: actions.filter(a => a.type),
    };

    createMutation.mutate(workflowData);
  };

  const getActionIcon = (type: string) => {
    const actionType = ACTION_TYPES.find(a => a.value === type);
    return actionType?.icon || Settings;
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-emerald-600" />
            Automation Workflows
          </h1>
          <p className="text-slate-600 mt-1">
            Automate your marketing and sales processes with intelligent workflows
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)} 
          className="bg-emerald-600 hover:bg-emerald-700"
          data-testid="button-create-workflow"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="workflows" data-testid="tab-workflows">
            <Settings className="mr-2 h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            <BarChart3 className="mr-2 h-4 w-4" />
            Execution Logs
          </TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          {workflowsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : workflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg mb-2">No workflows yet</p>
                <p className="text-slate-400 text-sm mb-4">Create your first automation workflow to get started</p>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  variant="outline"
                  data-testid="button-create-first-workflow"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-xl" data-testid={`workflow-name-${workflow.id}`}>
                            {workflow.name}
                          </CardTitle>
                          <Badge 
                            variant={workflow.isActive ? "default" : "secondary"}
                            className={workflow.isActive ? "bg-emerald-500" : ""}
                            data-testid={`workflow-status-${workflow.id}`}
                          >
                            {workflow.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2" data-testid={`workflow-description-${workflow.id}`}>
                          {workflow.description}
                        </CardDescription>
                      </div>
                      <Switch
                        checked={workflow.isActive}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: workflow.id, isActive: checked })
                        }
                        data-testid={`switch-workflow-${workflow.id}`}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Trigger */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Play className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-900">Trigger</span>
                      </div>
                      <p className="text-sm text-blue-700" data-testid={`workflow-trigger-${workflow.id}`}>
                        {workflow.trigger.name}
                      </p>
                      {workflow.trigger.conditions.length > 0 && (
                        <div className="mt-2 text-xs text-blue-600">
                          {workflow.trigger.conditions.map((cond, idx) => (
                            <div key={idx}>
                              {cond.field} {cond.operator} {cond.value}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowRight className="h-4 w-4 text-slate-600" />
                        <span className="font-semibold text-slate-700">Actions</span>
                      </div>
                      {workflow.actions.map((action, idx) => {
                        const Icon = getActionIcon(action.type);
                        return (
                          <div
                            key={action.id}
                            className="flex items-center gap-3 bg-slate-50 rounded-lg p-3"
                            data-testid={`workflow-action-${workflow.id}-${idx}`}
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100">
                              <Icon className="h-4 w-4 text-emerald-700" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm text-slate-700">{action.name}</p>
                              {action.delay > 0 && (
                                <p className="text-xs text-slate-500">
                                  Delay: {action.delay} minutes
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex gap-6 text-sm">
                        <div>
                          <span className="text-slate-500">Executions: </span>
                          <span className="font-semibold text-slate-700" data-testid={`workflow-executions-${workflow.id}`}>
                            {workflow.totalExecutions}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Success Rate: </span>
                          <span className="font-semibold text-emerald-600" data-testid={`workflow-success-rate-${workflow.id}`}>
                            {Math.round(workflow.successRate * 100)}%
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testMutation.mutate(workflow.id)}
                        disabled={testMutation.isPending}
                        data-testid={`button-test-workflow-${workflow.id}`}
                      >
                        <Play className="mr-2 h-3 w-3" />
                        Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {logsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500">No execution logs yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
                <CardDescription>Activity log of workflow executions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50"
                      data-testid={`log-entry-${log.id}`}
                    >
                      {log.status === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-slate-700" data-testid={`log-workflow-${log.id}`}>
                          {log.workflowName}
                        </p>
                        <p className="text-sm text-slate-600" data-testid={`log-action-${log.id}`}>
                          {log.action} for {log.leadName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1" data-testid={`log-details-${log.id}`}>
                          {log.details}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400" data-testid={`log-timestamp-${log.id}`}>
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Workflow Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Automation Workflow</DialogTitle>
            <DialogDescription>
              Set up triggers and actions to automate your marketing and sales processes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="workflow-name">Workflow Name *</Label>
                <Input
                  id="workflow-name"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="e.g., Welcome Email Sequence"
                  data-testid="input-workflow-name"
                />
              </div>
              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Describe what this workflow does..."
                  data-testid="input-workflow-description"
                />
              </div>
            </div>

            {/* Trigger */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                Trigger
              </h3>
              <div>
                <Label>When this happens *</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger data-testid="select-trigger-type">
                    <SelectValue placeholder="Select a trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {triggerType && (
                <div className="space-y-2">
                  <Label>Conditions</Label>
                  {triggerConditions.map((condition, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="Field"
                        value={condition.field}
                        onChange={(e) => {
                          const newConditions = [...triggerConditions];
                          newConditions[idx].field = e.target.value;
                          setTriggerConditions(newConditions);
                        }}
                        data-testid={`input-condition-field-${idx}`}
                      />
                      <Select
                        value={condition.operator}
                        onValueChange={(value) => {
                          const newConditions = [...triggerConditions];
                          newConditions[idx].operator = value;
                          setTriggerConditions(newConditions);
                        }}
                      >
                        <SelectTrigger className="w-[180px]" data-testid={`select-condition-operator-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value"
                        value={condition.value}
                        onChange={(e) => {
                          const newConditions = [...triggerConditions];
                          newConditions[idx].value = e.target.value;
                          setTriggerConditions(newConditions);
                        }}
                        data-testid={`input-condition-value-${idx}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-emerald-600" />
                Actions
              </h3>
              
              {actions.map((action, idx) => {
                const Icon = getActionIcon(action.type);
                return (
                  <div key={action.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-emerald-600" />
                        <span className="font-medium">Action {idx + 1}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAction(idx)}
                        data-testid={`button-remove-action-${idx}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Action Type *</Label>
                        <Select
                          value={action.type}
                          onValueChange={(value) => {
                            const actionType = ACTION_TYPES.find(a => a.value === value);
                            updateAction(idx, { 
                              type: value,
                              name: actionType?.label || value
                            });
                          }}
                        >
                          <SelectTrigger data-testid={`select-action-type-${idx}`}>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPES.map((actionType) => (
                              <SelectItem key={actionType.value} value={actionType.value}>
                                {actionType.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Delay (minutes)</Label>
                        <Input
                          type="number"
                          value={action.delay}
                          onChange={(e) =>
                            updateAction(idx, { delay: parseInt(e.target.value) || 0 })
                          }
                          placeholder="0"
                          data-testid={`input-action-delay-${idx}`}
                        />
                      </div>
                    </div>

                    {action.type === "send_email" && (
                      <div>
                        <Label>Email Subject</Label>
                        <Input
                          value={action.parameters.subject || ""}
                          onChange={(e) =>
                            updateAction(idx, {
                              parameters: { ...action.parameters, subject: e.target.value },
                            })
                          }
                          placeholder="Email subject..."
                          data-testid={`input-email-subject-${idx}`}
                        />
                      </div>
                    )}

                    {action.type === "assign_owner" && (
                      <div>
                        <Label>Owner Name</Label>
                        <Input
                          value={action.parameters.owner || ""}
                          onChange={(e) =>
                            updateAction(idx, {
                              parameters: { ...action.parameters, owner: e.target.value },
                            })
                          }
                          placeholder="Owner name..."
                          data-testid={`input-owner-name-${idx}`}
                        />
                      </div>
                    )}

                    {action.type === "update_stage" && (
                      <div>
                        <Label>New Stage</Label>
                        <Select
                          value={action.parameters.stage || ""}
                          onValueChange={(value) =>
                            updateAction(idx, {
                              parameters: { ...action.parameters, stage: value },
                            })
                          }
                        >
                          <SelectTrigger data-testid={`select-stage-${idx}`}>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="opportunity">Opportunity</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="evangelist">Evangelist</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}

              <Button
                variant="outline"
                onClick={addAction}
                className="w-full"
                data-testid="button-add-action"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Action
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkflow}
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-save-workflow"
            >
              {createMutation.isPending ? "Creating..." : "Create Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
