import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Edit,
  Trash,
  Copy,
  AlertCircle,
  Clock,
  Mail,
  MoreHorizontal,
  Play,
  Pause,
  Users,
  Calendar,
  ChevronRight,
  Save,
  FileText,
  Send,
  ScrollText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// Define the schema for creating/editing sequences
const sequenceSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  triggerType: z.enum(["manual", "event", "scheduled"]),
  targetType: z.enum(["leads", "customers", "segment"]),
  targetId: z.string().optional(),
  active: z.boolean().default(false),
});

// Schema for creating/editing steps
const sequenceStepSchema = z.object({
  sequenceId: z.union([
    z.number(),
    z.string().transform(val => parseInt(val, 10))
  ]),
  name: z.string().min(3, "Step name must be at least 3 characters"),
  templateId: z.union([
    z.number(),
    z.string().transform(val => parseInt(val, 10)),
    z.literal('').transform(() => undefined)
  ]).optional(),
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "Email content is required"),
  bodyText: z.string().optional(),
  delayDays: z.union([
    z.number().min(0, "Delay must be 0 or greater"),
    z.string().transform(val => parseInt(val, 10) || 0)
  ]),
  delayHours: z.union([
    z.number().min(0, "Delay must be 0 or greater"),
    z.string().transform(val => parseInt(val, 10) || 0)
  ]),
  condition: z.string().optional(),
});

type SequenceFormData = z.infer<typeof sequenceSchema>;
type SequenceStepFormData = z.infer<typeof sequenceStepSchema>;

const EmailSequenceManager = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('sequences');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<any>(null);
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [editingSequenceId, setEditingSequenceId] = useState<number | null>(null);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [expandedSequence, setExpandedSequence] = useState<number | null>(null);

  // Fetch sequences, templates, and segments
  const {
    data: sequences = [],
    isLoading: isSequencesLoading,
    error: sequencesError,
    refetch: refetchSequences,
  } = useQuery({
    queryKey: ['/api/email/sequences'],
  });

  const {
    data: templates = [],
    isLoading: isTemplatesLoading,
  } = useQuery({
    queryKey: ['/api/email/templates'],
    enabled: isCreateModalOpen || isStepModalOpen,
  });

  const {
    data: segments = [],
    isLoading: isSegmentsLoading,
  } = useQuery({
    queryKey: ['/api/customers/segments'],
    enabled: isCreateModalOpen || isEditModalOpen,
  });

  // Fetch steps for a specific sequence when expanded
  const {
    data: steps = [],
    isLoading: isStepsLoading,
    refetch: refetchSteps,
  } = useQuery({
    queryKey: ['/api/email/sequences/steps', expandedSequence],
    enabled: expandedSequence !== null,
  });

  // Create sequence form
  const sequenceForm = useForm<SequenceFormData>({
    resolver: zodResolver(sequenceSchema),
    defaultValues: {
      name: '',
      description: '',
      triggerType: 'manual',
      targetType: 'leads',
      targetId: '',
      active: false,
    },
  });

  // Sequence step form
  const sequenceStepForm = useForm<SequenceStepFormData>({
    resolver: zodResolver(sequenceStepSchema),
    defaultValues: {
      sequenceId: '',
      name: '',
      templateId: '',
      subject: '',
      bodyHtml: '',
      bodyText: '',
      delayDays: 0,
      delayHours: 0,
      condition: '',
    },
  });

  // Create sequence mutation
  const createSequenceMutation = useMutation({
    mutationFn: async (data: SequenceFormData) => {
      const response = await fetch('/api/email/sequences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create sequence');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Sequence Created',
        description: 'Email sequence has been created successfully.',
      });
      setIsCreateModalOpen(false);
      resetSequenceForm();
      refetchSequences();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Create Sequence',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update sequence mutation
  const updateSequenceMutation = useMutation({
    mutationFn: async (data: SequenceFormData & { id: number }) => {
      const { id, ...sequenceData } = data;
      const response = await fetch(`/api/email/sequences/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sequenceData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update sequence');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Sequence Updated',
        description: 'Email sequence has been updated successfully.',
      });
      setIsEditModalOpen(false);
      setEditingSequenceId(null);
      resetSequenceForm();
      refetchSequences();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Sequence',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete sequence mutation
  const deleteSequenceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/email/sequences/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete sequence');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Sequence Deleted',
        description: 'Email sequence has been deleted successfully.',
      });
      refetchSequences();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Delete Sequence',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle sequence status mutation
  const toggleSequenceStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const response = await fetch(`/api/email/sequences/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update sequence status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Status Updated',
        description: 'Sequence status has been updated successfully.',
      });
      refetchSequences();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create/update sequence step mutation
  const saveSequenceStepMutation = useMutation({
    mutationFn: async (data: SequenceStepFormData & { id?: number }) => {
      const { id, ...stepData } = data;
      
      if (id) {
        // Update existing step
        const response = await fetch(`/api/email/sequences/steps/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stepData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update step');
        }
        
        return response.json();
      } else {
        // Create new step
        const response = await fetch('/api/email/sequences/steps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stepData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create step');
        }
        
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: editingStepId ? 'Step Updated' : 'Step Created',
        description: `Sequence step has been ${editingStepId ? 'updated' : 'created'} successfully.`,
      });
      setIsStepModalOpen(false);
      setEditingStepId(null);
      resetStepForm();
      refetchSteps();
    },
    onError: (error: Error) => {
      toast({
        title: editingStepId ? 'Failed to Update Step' : 'Failed to Create Step',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete sequence step mutation
  const deleteStepMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/email/sequences/steps/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete step');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Step Deleted',
        description: 'Sequence step has been deleted successfully.',
      });
      refetchSteps();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Delete Step',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Form submission handlers
  const onCreateSequenceSubmit = (data: SequenceFormData) => {
    if (editingSequenceId) {
      updateSequenceMutation.mutate({ ...data, id: editingSequenceId });
    } else {
      createSequenceMutation.mutate(data);
    }
  };

  const onSequenceStepSubmit = (data: SequenceStepFormData) => {
    if (editingStepId) {
      saveSequenceStepMutation.mutate({ ...data, id: editingStepId });
    } else {
      saveSequenceStepMutation.mutate(data);
    }
  };

  // Form reset functions
  const resetSequenceForm = () => {
    sequenceForm.reset({
      name: '',
      description: '',
      triggerType: 'manual',
      targetType: 'leads',
      targetId: '',
      active: false,
    });
  };

  const resetStepForm = () => {
    sequenceStepForm.reset({
      sequenceId: '',
      name: '',
      templateId: '',
      subject: '',
      bodyHtml: '',
      bodyText: '',
      delayDays: 0,
      delayHours: 0,
      condition: '',
    });
  };

  // Handle editing a sequence
  const handleEditSequence = (sequence: any) => {
    setEditingSequenceId(sequence.id);
    sequenceForm.reset({
      name: sequence.name,
      description: sequence.description || '',
      triggerType: sequence.triggerType,
      targetType: sequence.targetType,
      targetId: sequence.targetId ? sequence.targetId.toString() : '',
      active: sequence.active,
    });
    setIsEditModalOpen(true);
  };

  // Handle editing or creating a step
  const handleManageStep = (step?: any, sequenceId?: number) => {
    if (step) {
      setEditingStepId(step.id);
      sequenceStepForm.reset({
        sequenceId: step.sequenceId.toString(),
        name: step.name,
        templateId: step.templateId ? step.templateId.toString() : '',
        subject: step.subject,
        bodyHtml: step.bodyHtml,
        bodyText: step.bodyText || '',
        delayDays: step.delayDays,
        delayHours: step.delayHours,
        condition: step.condition || '',
      });
    } else if (sequenceId) {
      setEditingStepId(null);
      sequenceStepForm.reset({
        sequenceId: sequenceId.toString(),
        name: '',
        templateId: '',
        subject: '',
        bodyHtml: '',
        bodyText: '',
        delayDays: 0,
        delayHours: 0,
        condition: '',
      });
    }
    setIsStepModalOpen(true);
  };

  // Handle template selection in the step form
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t: any) => t.id.toString() === templateId);
    if (template) {
      sequenceStepForm.setValue('subject', template.subject);
      sequenceStepForm.setValue('bodyHtml', template.bodyHtml);
      sequenceStepForm.setValue('bodyText', template.bodyText);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get target name based on targetType and targetId
  const getTargetName = (sequence: any) => {
    if (sequence.targetType === 'segment' && sequence.targetId) {
      const segment = segments.find((s: any) => s.id.toString() === sequence.targetId.toString());
      return segment ? segment.name : 'Unknown Segment';
    } else {
      return sequence.targetType === 'leads' ? 'All Leads' : 'All Customers';
    }
  };

  // Get trigger description
  const getTriggerDescription = (sequence: any) => {
    switch (sequence.triggerType) {
      case 'manual':
        return 'Manually triggered';
      case 'event':
        return 'Event-based trigger';
      case 'scheduled':
        return 'Scheduled trigger';
      default:
        return 'Unknown trigger';
    }
  };

  // Get delay text for step
  const getDelayText = (step: any) => {
    let delayText = '';
    
    if (step.delayDays > 0) {
      delayText += `${step.delayDays} day${step.delayDays > 1 ? 's' : ''}`;
    }
    
    if (step.delayHours > 0) {
      if (delayText) delayText += ' and ';
      delayText += `${step.delayHours} hour${step.delayHours > 1 ? 's' : ''}`;
    }
    
    if (!delayText) {
      delayText = 'Immediately';
    } else {
      delayText = `After ${delayText}`;
    }
    
    return delayText;
  };

  // Toggle sequence active status
  const toggleSequenceStatus = (sequence: any) => {
    toggleSequenceStatusMutation.mutate({
      id: sequence.id,
      active: !sequence.active,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Automated Email Sequences</h2>
        <Button onClick={() => {
          resetSequenceForm();
          setEditingSequenceId(null);
          setIsCreateModalOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Sequence
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sequences">
            <ScrollText className="mr-2 h-4 w-4" />
            Sequences
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart4 className="mr-2 h-4 w-4" />
            Sequence Analytics
          </TabsTrigger>
        </TabsList>

        {/* Sequences Tab */}
        <TabsContent value="sequences" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Sequences</CardTitle>
              <CardDescription>
                Create and manage automated email sequences for leads and customers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSequencesLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading sequences...</span>
                </div>
              ) : sequencesError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load email sequences. Please try again.
                  </AlertDescription>
                </Alert>
              ) : sequences.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Email Sequences</h3>
                  <p className="text-muted-foreground">
                    Create your first automated email sequence to nurture leads and customers.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      resetSequenceForm();
                      setEditingSequenceId(null);
                      setIsCreateModalOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Sequence
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sequences.map((sequence: any) => (
                    <div key={sequence.id} className="border rounded-lg overflow-hidden">
                      <div className="p-4 bg-background flex justify-between items-center">
                        <div className="flex items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mr-2"
                            onClick={() => {
                              if (expandedSequence === sequence.id) {
                                setExpandedSequence(null);
                              } else {
                                setExpandedSequence(sequence.id);
                              }
                            }}
                          >
                            <ChevronRight 
                              className={`h-4 w-4 transition-transform ${
                                expandedSequence === sequence.id ? "rotate-90" : ""
                              }`}
                            />
                          </Button>
                          <div>
                            <div className="flex items-center">
                              <h3 className="font-medium text-lg">{sequence.name}</h3>
                              <Badge 
                                variant={sequence.active ? "default" : "secondary"} 
                                className="ml-2"
                              >
                                {sequence.active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{sequence.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center mr-4">
                            <Switch
                              checked={sequence.active}
                              onCheckedChange={() => toggleSequenceStatus(sequence)}
                            />
                            <span className="ml-2 text-sm">
                              {sequence.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditSequence(sequence)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  handleManageStep(undefined, sequence.id);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Step
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  // Clone functionality would go here
                                  toast({
                                    title: "Sequence Cloned",
                                    description: "A copy of the sequence has been created.",
                                  });
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Clone
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this sequence? This action cannot be undone.")) {
                                    deleteSequenceMutation.mutate(sequence.id);
                                  }
                                }}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="px-4 py-2 bg-muted/30 text-sm flex flex-wrap gap-4">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>Target: {getTargetName(sequence)}</span>
                        </div>
                        <div className="flex items-center">
                          <Play className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>Trigger: {getTriggerDescription(sequence)}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>Created: {formatDate(sequence.createdAt)}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>Steps: {sequence.stepCount || 0}</span>
                        </div>
                      </div>

                      {expandedSequence === sequence.id && (
                        <div className="p-4 border-t">
                          <div className="mb-4 flex justify-between items-center">
                            <h4 className="font-medium">Sequence Steps</h4>
                            <Button 
                              size="sm" 
                              onClick={() => handleManageStep(undefined, sequence.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Step
                            </Button>
                          </div>

                          {isStepsLoading ? (
                            <div className="flex justify-center items-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <span className="ml-2">Loading steps...</span>
                            </div>
                          ) : steps.length === 0 ? (
                            <div className="text-center py-6 bg-muted/30 rounded-md">
                              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                              <p className="text-muted-foreground">
                                No steps added to this sequence yet.
                              </p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mt-2"
                                onClick={() => handleManageStep(undefined, sequence.id)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add First Step
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {steps.map((step: any, index: number) => (
                                <Card key={step.id} className="overflow-hidden">
                                  <div className="flex justify-between items-center p-4">
                                    <div className="flex items-center">
                                      <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center mr-3">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <h5 className="font-medium">{step.name}</h5>
                                        <p className="text-sm text-muted-foreground">
                                          {getDelayText(step)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleManageStep(step)}
                                      >
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => {
                                          if (confirm("Delete this step?")) {
                                            deleteStepMutation.mutate(step.id);
                                          }
                                        }}
                                      >
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="px-4 py-3 bg-muted/30 text-sm border-t">
                                    <div className="font-medium mb-1">Subject: {step.subject}</div>
                                    {step.condition && (
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Condition: {step.condition}
                                      </div>
                                    )}
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <Send className="h-3 w-3 mr-1" />
                                      {step.templateId ? `Uses template #${step.templateId}` : 'Custom email content'}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sequence Performance</CardTitle>
              <CardDescription>
                Track and analyze the performance of your email sequences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Analytics Coming Soon</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Detailed analytics for your email sequences will be available soon. This will include open rates, click rates, 
                  and conversion metrics for each sequence and step.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Sequence Dialog */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setEditingSequenceId(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSequenceId ? 'Edit Sequence' : 'Create New Sequence'}</DialogTitle>
            <DialogDescription>
              {editingSequenceId
                ? 'Update your email sequence settings.'
                : 'Configure your automated email sequence for leads or customers.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...sequenceForm}>
            <form onSubmit={sequenceForm.handleSubmit(onCreateSequenceSubmit)} className="space-y-4">
              <FormField
                control={sequenceForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Welcome Series" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={sequenceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the purpose of this sequence" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={sequenceForm.control}
                  name="triggerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a trigger type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual Trigger</SelectItem>
                          <SelectItem value="event">Event-Based</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How this sequence will be triggered.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sequenceForm.control}
                  name="targetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target audience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="leads">All Leads</SelectItem>
                          <SelectItem value="customers">All Customers</SelectItem>
                          <SelectItem value="segment">Specific Segment</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Who will receive emails in this sequence.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {sequenceForm.watch('targetType') === 'segment' && (
                <FormField
                  control={sequenceForm.control}
                  name="targetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Segment</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={isSegmentsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a segment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {segments.map((segment: any) => (
                            <SelectItem key={segment.id} value={segment.id.toString()}>
                              {segment.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The specific customer segment to target.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={sequenceForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Activate Sequence</FormLabel>
                      <FormDescription>
                        When active, this sequence will send emails according to its configuration.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingSequenceId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSequenceMutation.isPending || updateSequenceMutation.isPending}
                >
                  {(createSequenceMutation.isPending || updateSequenceMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingSequenceId ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>{editingSequenceId ? 'Update Sequence' : 'Create Sequence'}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Step Dialog */}
      <Dialog open={isStepModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsStepModalOpen(false);
          setEditingStepId(null);
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingStepId ? 'Edit Step' : 'Add Sequence Step'}</DialogTitle>
            <DialogDescription>
              {editingStepId
                ? 'Update the email and timing for this sequence step.'
                : 'Configure the email content and timing for this step in the sequence.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...sequenceStepForm}>
            <form onSubmit={sequenceStepForm.handleSubmit(onSequenceStepSubmit)} className="space-y-4">
              <FormField
                control={sequenceStepForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Step Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Welcome Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={sequenceStepForm.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Template (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleTemplateSelect(value);
                        }} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template or create custom" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Custom Email</SelectItem>
                          {templates.map((template: any) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Use an existing template or create custom content below.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sequenceStepForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Welcome to our community!" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={sequenceStepForm.control}
                  name="delayDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delay (Days)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Days to wait before sending this email.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sequenceStepForm.control}
                  name="delayHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delay (Hours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="23"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Additional hours to wait.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={sequenceStepForm.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. user.hasOpenedPreviousEmail" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Condition that must be met for this email to be sent.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={sequenceStepForm.control}
                name="bodyHtml"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Content</FormLabel>
                    <FormControl>
                      <RichTextEditor 
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Write your email content here..."
                        minHeight="250px"
                      />
                    </FormControl>
                    <FormDescription>
                      Use variables like {'{firstName}'} for personalization.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={sequenceStepForm.control}
                name="bodyText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plain Text Version (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Plain text version of your email" 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Plain text version for email clients that don't support HTML.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsStepModalOpen(false);
                    setEditingStepId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveSequenceStepMutation.isPending}
                >
                  {saveSequenceStepMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingStepId ? 'Updating Step...' : 'Adding Step...'}
                    </>
                  ) : (
                    <>{editingStepId ? 'Update Step' : 'Add Step'}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { BarChart4 } from 'lucide-react';
export default EmailSequenceManager;