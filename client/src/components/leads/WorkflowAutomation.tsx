import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Workflow, 
  Play, 
  Pause, 
  Settings, 
  Plus,
  Clock,
  Mail,
  Phone,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  TestTube
} from "lucide-react";
import { Lead } from "@shared/schema";

interface WorkflowTrigger {
  id: string;
  type: 'lead_score_change' | 'status_change' | 'time_based' | 'engagement_level' | 'form_submission';
  name: string;
  conditions: {
    field: string;
    operator: string;
    value: any;
  }[];
}

interface WorkflowAction {
  id: string;
  type: 'send_email' | 'create_task' | 'assign_owner' | 'update_status' | 'add_tag' | 'schedule_call';
  name: string;
  parameters: {
    [key: string]: any;
  };
  delay: number; // in minutes
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

interface WorkflowAutomationProps {
  leads?: Lead[];
}

const TRIGGER_TYPES = [
  { id: 'lead_score_change', name: 'Lead Score Change', icon: '📊' },
  { id: 'status_change', name: 'Status Change', icon: '🔄' },
  { id: 'time_based', name: 'Time-Based', icon: '⏰' },
  { id: 'engagement_level', name: 'Engagement Level', icon: '💬' },
  { id: 'form_submission', name: 'Form Submission', icon: '📝' }
];

const ACTION_TYPES = [
  { id: 'send_email', name: 'Send Email', icon: Mail },
  { id: 'create_task', name: 'Create Task', icon: FileText },
  { id: 'assign_owner', name: 'Assign Owner', icon: Users },
  { id: 'update_status', name: 'Update Status', icon: CheckCircle },
  { id: 'add_tag', name: 'Add Tag', icon: AlertTriangle },
  { id: 'schedule_call', name: 'Schedule Call', icon: Phone }
];

export default function WorkflowAutomation({ leads = [] }: WorkflowAutomationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("workflows");
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states for creating new workflow
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [selectedTrigger, setSelectedTrigger] = useState<WorkflowTrigger | null>(null);
  const [workflowActions, setWorkflowActions] = useState<WorkflowAction[]>([]);

  // Fetch existing workflows
  const { data: workflows = [], isLoading: isLoadingWorkflows } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
    retry: 1
  });

  // Fetch workflow execution logs
  const { data: executionLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["/api/workflows/logs"],
    retry: 1
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: (workflowData: Partial<Workflow>) => {
      return apiRequest('POST', '/api/workflows', workflowData);
    },
    onSuccess: () => {
      toast({
        title: "Workflow created",
        description: "Automation workflow has been successfully created"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      resetForm();
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create workflow. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Toggle workflow active status
  const toggleWorkflowMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest('PATCH', `/api/workflows/${id}/toggle`, { isActive });
    },
    onSuccess: () => {
      toast({
        title: "Workflow updated",
        description: "Workflow status has been changed"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
    }
  });

  // Test workflow execution
  const testWorkflowMutation = useMutation({
    mutationFn: (workflowId: number) => {
      return apiRequest('POST', `/api/workflows/${workflowId}/test`);
    },
    onSuccess: (response) => {
      toast({
        title: "Test completed",
        description: `Workflow test executed successfully. ${response.matchedLeads || 0} leads would be affected.`
      });
    }
  });

  const resetForm = () => {
    setWorkflowName("");
    setWorkflowDescription("");
    setSelectedTrigger(null);
    setWorkflowActions([]);
  };

  const addAction = () => {
    const newAction: WorkflowAction = {
      id: `action_${Date.now()}`,
      type: 'send_email',
      name: 'New Action',
      parameters: {},
      delay: 0
    };
    setWorkflowActions([...workflowActions, newAction]);
  };

  const removeAction = (actionId: string) => {
    setWorkflowActions(workflowActions.filter(action => action.id !== actionId));
  };

  const updateAction = (actionId: string, updates: Partial<WorkflowAction>) => {
    setWorkflowActions(workflowActions.map(action => 
      action.id === actionId ? { ...action, ...updates } : action
    ));
  };

  const handleCreateWorkflow = () => {
    if (!workflowName.trim() || !selectedTrigger || workflowActions.length === 0) {
      toast({
        title: "Error",
        description: "Please provide workflow name, trigger, and at least one action",
        variant: "destructive"
      });
      return;
    }

    createWorkflowMutation.mutate({
      name: workflowName,
      description: workflowDescription,
      isActive: true,
      trigger: selectedTrigger,
      actions: workflowActions,
      totalExecutions: 0,
      successRate: 0,
      createdAt: new Date().toISOString()
    });
  };

  // Pre-defined workflow templates
  const workflowTemplates = [
    {
      name: "High Score Lead Follow-up",
      description: "Automatically follow up with leads when their score exceeds 80",
      trigger: {
        id: 'high_score_trigger',
        type: 'lead_score_change' as const,
        name: 'High Score Trigger',
        conditions: [
          { field: 'score', operator: 'gte', value: 80 }
        ]
      },
      actions: [
        {
          id: 'email_high_score',
          type: 'send_email' as const,
          name: 'Send High Priority Email',
          parameters: {
            template: 'high_priority_lead',
            subject: 'Priority Lead Alert - High Score Achieved'
          },
          delay: 0
        },
        {
          id: 'assign_senior_rep',
          type: 'assign_owner' as const,
          name: 'Assign to Senior Rep',
          parameters: {
            owner: 'Senior Sales Rep'
          },
          delay: 5
        }
      ]
    },
    {
      name: "New Lead Nurture Sequence",
      description: "Automated nurture sequence for new leads",
      trigger: {
        id: 'new_lead_trigger',
        type: 'status_change' as const,
        name: 'New Lead Status',
        conditions: [
          { field: 'leadStatus', operator: 'eq', value: 'new' }
        ]
      },
      actions: [
        {
          id: 'welcome_email',
          type: 'send_email' as const,
          name: 'Send Welcome Email',
          parameters: {
            template: 'welcome_sequence',
            subject: 'Welcome - Let\'s get started!'
          },
          delay: 0
        },
        {
          id: 'followup_task',
          type: 'create_task' as const,
          name: 'Create Follow-up Task',
          parameters: {
            title: 'Initial follow-up call',
            dueDate: '3 days',
            priority: 'medium'
          },
          delay: 1440 // 24 hours
        }
      ]
    },
    {
      name: "Inactive Lead Re-engagement",
      description: "Re-engage leads that haven't been contacted in 30 days",
      trigger: {
        id: 'inactive_lead_trigger',
        type: 'time_based' as const,
        name: 'Inactive Lead Trigger',
        conditions: [
          { field: 'lastContactDate', operator: 'lt', value: '30 days ago' }
        ]
      },
      actions: [
        {
          id: 'reengagement_email',
          type: 'send_email' as const,
          name: 'Send Re-engagement Email',
          parameters: {
            template: 'reengagement_sequence',
            subject: 'Don\'t miss out - Special offer inside'
          },
          delay: 0
        },
        {
          id: 'add_reengagement_tag',
          type: 'add_tag' as const,
          name: 'Add Re-engagement Tag',
          parameters: {
            tag: 'reengagement-campaign'
          },
          delay: 0
        }
      ]
    }
  ];

  if (isLoadingWorkflows) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="animate-pulse h-4 bg-slate-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center">
            <Workflow className="h-6 w-6 mr-2" />
            Workflow Automation
          </h2>
          <p className="text-slate-500 mt-1">Automate lead management with intelligent workflows</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflows">Active Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Active Workflows */}
        <TabsContent value="workflows" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Workflow className="h-5 w-5 mr-2" />
                      {workflow.name}
                      {workflow.name.includes('(Demo)') && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 ml-2">
                          <TestTube className="h-3 w-3 mr-1" />
                          Demo
                        </Badge>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={workflow.isActive ? "default" : "secondary"}>
                        {workflow.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Switch
                        checked={workflow.isActive}
                        onCheckedChange={(checked) => 
                          toggleWorkflowMutation.mutate({ id: workflow.id, isActive: checked })
                        }
                      />
                    </div>
                  </CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-slate-500">Executions</div>
                        <div className="font-semibold">{workflow.totalExecutions}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Success Rate</div>
                        <div className="font-semibold">{(workflow.successRate * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <div className="text-slate-500">Trigger</div>
                      <div className="font-medium capitalize">
                        {workflow.trigger.type.replace('_', ' ')}
                      </div>
                    </div>

                    <div className="text-sm">
                      <div className="text-slate-500">Actions ({workflow.actions.length})</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {workflow.actions.slice(0, 3).map((action) => {
                          const ActionIcon = ACTION_TYPES.find(t => t.id === action.type)?.icon || Settings;
                          return (
                            <Badge key={action.id} variant="outline" className="text-xs">
                              <ActionIcon className="h-3 w-3 mr-1" />
                              {action.type.replace('_', ' ')}
                            </Badge>
                          );
                        })}
                        {workflow.actions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{workflow.actions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testWorkflowMutation.mutate(workflow.id)}
                        disabled={testWorkflowMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedWorkflow(workflow)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Workflow Templates */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {workflowTemplates.map((template, index) => (
              <Card key={index} className="border-dashed border-2 hover:border-solid transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    {template.name}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-slate-500">Trigger</div>
                      <Badge variant="outline" className="capitalize">
                        {template.trigger.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="text-sm text-slate-500">Actions ({template.actions.length})</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.actions.map((action) => {
                          const ActionIcon = ACTION_TYPES.find(t => t.id === action.type)?.icon || Settings;
                          return (
                            <Badge key={action.id} variant="outline" className="text-xs">
                              <ActionIcon className="h-3 w-3 mr-1" />
                              {action.type.replace('_', ' ')}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => {
                        setWorkflowName(template.name);
                        setWorkflowDescription(template.description);
                        setSelectedTrigger(template.trigger);
                        setWorkflowActions(template.actions);
                        setIsCreating(true);
                      }}
                    >
                      Use This Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Execution Logs */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Recent Executions
              </CardTitle>
              <CardDescription>
                Track workflow execution history and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {executionLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No execution logs yet</p>
                    <p className="text-sm">Workflow executions will appear here</p>
                  </div>
                ) : (
                  executionLogs.map((log: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          log.status === 'success' ? 'bg-green-500' :
                          log.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {log.workflowName}
                            {log.workflowName.includes('(Demo)') && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                                <TestTube className="h-2 w-2 mr-1" />
                                Demo
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">
                            {log.leadName} • {log.action}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {log.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{log.timestamp}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {workflows.filter(w => w.isActive).length}
                  </div>
                  <div className="text-sm text-slate-500">Active Workflows</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {workflows.reduce((sum, w) => sum + w.totalExecutions, 0)}
                  </div>
                  <div className="text-sm text-slate-500">Total Executions</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {workflows.length > 0 
                      ? ((workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <div className="text-sm text-slate-500">Avg Success Rate</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Workflow Dialog */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Create New Workflow</h3>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="workflow-name">Workflow Name</Label>
                    <Input
                      id="workflow-name"
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      placeholder="e.g., High Score Follow-up"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workflow-description">Description</Label>
                    <Input
                      id="workflow-description"
                      value={workflowDescription}
                      onChange={(e) => setWorkflowDescription(e.target.value)}
                      placeholder="Describe this workflow..."
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Trigger</Label>
                  <Select 
                    value={selectedTrigger?.type || ""} 
                    onValueChange={(value) => {
                      const triggerType = TRIGGER_TYPES.find(t => t.id === value);
                      if (triggerType) {
                        setSelectedTrigger({
                          id: `trigger_${Date.now()}`,
                          type: value as any,
                          name: triggerType.name,
                          conditions: []
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map(trigger => (
                        <SelectItem key={trigger.id} value={trigger.id}>
                          {trigger.icon} {trigger.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label>Actions</Label>
                    <Button variant="outline" size="sm" onClick={addAction}>
                      Add Action
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {workflowActions.map((action, index) => (
                      <div key={action.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Action {index + 1}</span>
                            <Badge variant="outline" className="text-xs">
                              {action.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeAction(action.id)}
                          >
                            Remove
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label>Action Type</Label>
                            <Select 
                              value={action.type} 
                              onValueChange={(value) => updateAction(action.id, { type: value as any })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_TYPES.map(actionType => (
                                  <SelectItem key={actionType.id} value={actionType.id}>
                                    <actionType.icon className="h-4 w-4 mr-2 inline" />
                                    {actionType.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Name</Label>
                            <Input
                              value={action.name}
                              onChange={(e) => updateAction(action.id, { name: e.target.value })}
                              placeholder="Action name"
                            />
                          </div>

                          <div>
                            <Label>Delay (minutes)</Label>
                            <Input
                              type="number"
                              value={action.delay}
                              onChange={(e) => updateAction(action.id, { delay: parseInt(e.target.value) || 0 })}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={resetForm}>
                    Reset
                  </Button>
                  <Button 
                    onClick={handleCreateWorkflow}
                    disabled={createWorkflowMutation.isPending}
                  >
                    {createWorkflowMutation.isPending ? "Creating..." : "Create Workflow"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}