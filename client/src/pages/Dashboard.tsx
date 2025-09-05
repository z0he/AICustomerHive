import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { apiRequest } from "@/lib/queryClient";

// Components
import AuthHeader from "@/components/auth/AuthHeader";
import VoiceCommandInterface from "@/components/voice/VoiceCommandInterface";
import UsageWarning from "@/components/usage/UsageWarning";
import VoiceCommandModal from "@/components/modals/VoiceCommandModal";
import CreateCampaignModal from "@/components/modals/CreateCampaignModal";
import EmailPreviewModal from "@/components/modals/EmailPreviewModal";
import CampaignPerformance from "@/components/dashboard/CampaignPerformance";
import CustomerActivity from "@/components/dashboard/CustomerActivity";
import SummaryMetrics from "@/components/dashboard/SummaryMetrics";
import LeadScoring from "@/components/dashboard/LeadScoring";
import NextActions from "@/components/dashboard/NextActions";
import CampaignPerformanceChart from "@/components/dashboard/CampaignPerformanceChart";
import PerformanceMetricsChart from "@/components/dashboard/PerformanceMetricsChart";
import ConversionFunnelChart from "@/components/dashboard/ConversionFunnelChart";

// Types
import { Campaign, Customer, Lead, Task } from "@shared/schema";

const Dashboard = () => {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [campaignVoiceData, setCampaignVoiceData] = useState<{ command: string } | undefined>(undefined);
  const [emailVoiceData, setEmailVoiceData] = useState<{ command: string, targetAudience?: string } | undefined>(undefined);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Voice recognition hook
  // We need a local state for interpretedCommand to make our suggestion system work
  const [localInterpretedCommand, setLocalInterpretedCommand] = useState<{intent: string, action: string} | null>(null);
  const [hasOpenAIKey, setHasOpenAIKey] = useState<boolean>(false);
  
  const {
    isListening,
    transcript,
    interpretedCommand: hookInterpretedCommand,
    isBrowserSupported,
    toggleListening,
    resetRecognition
  } = useVoiceRecognition();
  
  // Use either the hook's interpretedCommand or our local one
  const interpretedCommand = localInterpretedCommand || hookInterpretedCommand;
  
  // Data fetching
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        return null;
      }
      
      const data = await res.json();
      return data.user; // Extract the user object from the response
    }
  });


  
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      // Return mock notifications for now
      return [
        { id: 1, message: "New lead from website", date: "Today, 10:45 AM", read: false },
        { id: 2, message: "Campaign 'Summer Sale' is performing well", date: "Today, 9:30 AM", read: false },
        { id: 3, message: "5 tasks due today", date: "Today, 8:15 AM", read: false }
      ];
    }
  });
  
  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns', selectedPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns?period=${selectedPeriod}`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      
      return await res.json();
    }
  });
  
  const { data: recentActivity } = useQuery<Customer[]>({
    queryKey: ['/api/customers/activity'],
    queryFn: async () => {
      const res = await fetch('/api/customers/activity', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch customer activity');
      }
      
      return await res.json();
    }
  });
  
  const { data: metrics } = useQuery({
    queryKey: ['/api/metrics'],
    queryFn: async () => {
      const res = await fetch('/api/metrics', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      return await res.json();
    }
  });
  
  const { data: topLeads } = useQuery<Lead[]>({
    queryKey: ['/api/leads/top'],
    queryFn: async () => {
      const res = await fetch('/api/leads/top', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch top leads');
      }
      
      return await res.json();
    }
  });
  
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    queryFn: async () => {
      const res = await fetch('/api/tasks', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      return await res.json();
    }
  });
  
  const { data: recentCampaigns } = useQuery({
    queryKey: ['/api/campaigns/recent'],
    queryFn: async () => {
      // Return mock recent campaigns for now
      return [
        { id: 1, name: "Summer Sale 2023", path: "/campaigns/1" },
        { id: 2, name: "New Customer Nurture", path: "/campaigns/2" },
        { id: 3, name: "Product Launch", path: "/campaigns/3" }
      ];
    }
  });

  // Usage data query for usage warnings
  const { data: usageData } = useQuery<{
    aiPrompts: { used: number; limit: number; hasPersonalKey: boolean };
    emails: { used: number; limit: number; hasPersonalKey: boolean };
    tier: string;
  }>({
    queryKey: ['/api/usage'],
    refetchOnWindowFocus: false,
  });
  
  // Performance metrics for charts
  const { data: performanceData, isLoading: isPerformanceLoading } = useQuery({
    queryKey: ['/api/metrics/performance', selectedPeriod],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/metrics/performance?period=${selectedPeriod}`, {
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch performance metrics');
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error fetching performance metrics:", error);
        return [];
      }
    }
  });
  
  // Funnel data for conversion visualization
  const { data: funnelData, isLoading: isFunnelLoading } = useQuery({
    queryKey: ['/api/customers/funnel'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/customers/funnel', {
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch funnel data');
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error fetching funnel data:", error);
        return [];
      }
    }
  });
  
  // Task mutations
  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await apiRequest('PATCH', `/api/tasks/${taskId}/toggle`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['/api/tasks']});
      toast({
        title: "Task updated",
        description: "Task status has been updated successfully",
      });
    },
  });
  
  // Campaign mutations
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      return await apiRequest('POST', '/api/campaigns', campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['/api/campaigns']});
      queryClient.invalidateQueries({queryKey: ['/api/campaigns/recent']});
      toast({
        title: "Campaign created",
        description: "Your campaign has been created successfully",
      });
    },
  });
  
  // Voice command suggestions
  const commandSuggestions = [
    { id: 1, text: "Show me the performance of my latest campaign", command: "Show me the performance of my latest campaign" },
    { id: 2, text: "Create a campaign for qualified leads", command: "Create a campaign for qualified leads" },
    { id: 3, text: "Send a promotional email to my top customers", command: "Send a promotional email to my top 100 customers" },
    { id: 4, text: "What's the status of my nurture campaign?", command: "What's the status of my nurture campaign?" }
  ];
  
  // Handle executing voice commands
  const executeVoiceCommand = async () => {
    console.log("Executing voice command:", interpretedCommand);
    
    if (!interpretedCommand) {
      toast({
        title: "No command to execute",
        description: "Please try speaking a command again.",
        variant: "destructive"
      });
      closeVoiceModal();
      return;
    }
    
    try {
      switch (interpretedCommand.intent) {
        case "create_campaign":
          // Set campaign data from voice command and open modal
          setCampaignVoiceData({ command: interpretedCommand.action });
          closeVoiceModal(); // Close voice modal first
          setTimeout(() => {
            setIsCampaignModalOpen(true); // Then open campaign modal
          }, 100);
          break;
          
        case "show_campaign_performance":
        case "show_campaign_status":
          toast({
            title: "Showing campaign data",
            description: "Displaying the requested campaign information.",
          });
          // Scroll to campaign section
          document.querySelector('.campaign-performance')?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
          closeVoiceModal();
          break;
          
        case "send_email":
          // Set email data from voice command and open the email preview modal
          const targetAudience = interpretedCommand.action.toLowerCase().includes("top") ? 
            "top customers" : interpretedCommand.action.toLowerCase().includes("inactive") ? 
            "inactive customers" : "all customers";
            
          setEmailVoiceData({
            command: interpretedCommand.action,
            targetAudience: targetAudience
          });
          
          closeVoiceModal(); // Close voice modal first
          setTimeout(() => {
            setIsEmailModalOpen(true); // Then open email preview modal
          }, 100);
          break;
          
        case "show_leads":
          toast({
            title: "Showing top leads",
            description: "Here are your highest-scoring leads.",
          });
          // Scroll to leads section
          document.querySelector('.lead-scoring')?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
          closeVoiceModal();
          break;
          
        case "show_lead_count":
          // Display lead count in a toast notification
          const leadCount = metrics?.find((m: any) => m.title === 'Total Leads')?.value || '0';
          toast({
            title: "Lead Information",
            description: `You currently have ${leadCount} leads in your system.`,
          });
          // Scroll to leads section
          document.querySelector('.lead-scoring')?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
          closeVoiceModal();
          break;
          
        case "show_customers":
          toast({
            title: "Showing customer information",
            description: "Displaying your customer data.",
          });
          // Redirect to customer management page for better information display
          window.location.href = '/customer-management';
          closeVoiceModal();
          break;
        case "show_customer_count":
          // Display customer count in a toast notification
          const customerCount = metrics?.find((m: any) => m.title === 'Total Customers')?.value || '0';
          toast({
            title: "Customer Information",
            description: `You currently have ${customerCount} customers in your system.`,
          });
          // Scroll to customer section if available
          document.querySelector('.customer-metrics')?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
          closeVoiceModal();
          break;
          
        default:
          toast({
            title: "Command recognized",
            description: "Working on implementing this feature.",
          });
          closeVoiceModal();
      }
    } catch (error) {
      console.error("Error executing command:", error);
      toast({
        title: "Command execution failed",
        description: "There was an error executing your command. Please try again.",
        variant: "destructive"
      });
      closeVoiceModal();
    }
  };
  
  // Handle voice command selection
  const handleSelectSuggestion = async (command: string) => {
    try {
      console.log("Processing suggestion:", command);
      
      // Manually interpret the command since we're not using the microphone
      const response = await fetch('/api/voice/interpret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: command }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to interpret command');
      }
      
      const data = await response.json();
      console.log("Interpreted command:", data);
      
      // Set the transcript
      setTranscript(command);
      
      // We need to update the interpreted command state
      const { intent, action } = data;
      
      // Set the local interpreted command state
      setLocalInterpretedCommand({ intent, action });
      
      // Reset the hook state to avoid conflicts
      resetRecognition();
      
      // Open the voice modal to display the interpreted command
      setTimeout(() => {
        setIsVoiceModalOpen(true);
      }, 300);
    } catch (error) {
      console.error('Error processing suggested command:', error);
      toast({
        title: "Command Processing Error",
        description: "There was an error processing the command. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Check if OpenAI API key is configured
  useEffect(() => {
    // Make a simple test request to check if OpenAI integration is working
    const checkOpenAIConfig = async () => {
      try {
        const response = await fetch('/api/voice/interpret', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transcript: "test configuration" }),
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          // If the response contains "intent" and not "unknown", it's likely using OpenAI
          // or at least the interpretation is working properly
          setHasOpenAIKey(data.intent && data.intent !== "unknown");
        }
      } catch (error) {
        console.error("Error checking OpenAI configuration:", error);
        setHasOpenAIKey(false);
      }
    };
    
    checkOpenAIConfig();
  }, []);
  
  // Effect to open voice modal when command is recognized
  useEffect(() => {
    if (transcript && !isListening) {
      setIsVoiceModalOpen(true);
    }
  }, [transcript, isListening]);
  
  // Handle logout
  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    // Redirect to login page
    window.location.href = '/';
  };
  
  // Modal handlers
  const closeVoiceModal = () => {
    setIsVoiceModalOpen(false);
    resetRecognition();
    setLocalInterpretedCommand(null); // Reset local state
  };
  
  const closeCampaignModal = () => {
    setIsCampaignModalOpen(false);
    setCampaignVoiceData(undefined);
  };
  
  const createCampaign = (data: any) => {
    createCampaignMutation.mutate(data);
    closeCampaignModal();
  };
  
  const toggleTask = (taskId: number) => {
    toggleTaskMutation.mutate(taskId);
  };
  
  const showHelpModal = () => {
    toast({
      title: "Voice Command Help",
      description: "Try commands like 'Create a new campaign', 'Show me my top leads', or 'What's the status of my summer campaign?'",
    });
  };
  
  // Manually set transcript for demo purposes
  const setLocalTranscript = useState<string>('')[1];
  
  const setTranscript = (text: string) => {
    if (resetRecognition) {
      resetRecognition(); // Reset any previous recognition
    }
    
    // For the clicked suggestions, we update the transcript
    if (text) {
      setLocalTranscript(text);
    }
  };
  
  return (
    <div className="bg-slate-50 text-slate-800 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <AuthHeader 
        user={userData?.user || userData || { id: 1, name: "John Doe", initials: "JD" }} 
        notifications={notifications || []} 
        onLogout={handleLogout} 
      />
      
      <div className="flex-1 overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {/* Voice Command Interface */}
          <VoiceCommandInterface 
            isListening={isListening}
            transcription={transcript}
            suggestions={commandSuggestions}
            onToggleListening={toggleListening}
            onSelectSuggestion={handleSelectSuggestion}
            onShowHelp={showHelpModal}
            userName={userData?.user?.name ? userData.user.name.split(' ')[0] : 'User'}
            isBrowserSupported={isBrowserSupported}
          />
          
          {/* Usage Warnings */}
          {usageData && (
            <UsageWarning 
              usage={{
                aiPrompts: {
                  used: usageData.aiPrompts?.used || 0,
                  limit: usageData.aiPrompts?.limit || 20,
                  hasPersonalKey: usageData.aiPrompts?.hasPersonalKey || false
                },
                emails: {
                  used: usageData.emails?.used || 0,
                  limit: usageData.emails?.limit || 50,
                  hasPersonalKey: usageData.emails?.hasPersonalKey || false
                },
                tier: usageData.tier || 'free'
              }}
              className="mb-6"
            />
          )}
          
          {/* Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2/3) */}
            <div className="col-span-2 space-y-6">
              {/* Campaign Performance */}
              <div className="campaign-performance">
                <CampaignPerformance 
                  campaigns={(campaigns || []).map(c => ({
                    ...c,
                    conversions: c.conversions || 0,
                    percentage: c.percentage || 0,
                    isABTestActive: c.isABTestActive || false
                  }))}
                  selectedPeriod={selectedPeriod}
                  onPeriodChange={setSelectedPeriod}
                />
              </div>
              
              {/* Interactive Performance Charts */}
              <div className="space-y-6">
                <PerformanceMetricsChart 
                  data={performanceData || []}
                  title="Sales & Conversion Performance"
                  description="Interactive view of sales and conversion metrics over time"
                  chartType="area"
                />
                
                {campaigns && campaigns.length > 0 && (
                  <CampaignPerformanceChart 
                    campaigns={campaigns}
                    onCampaignSelect={(campaign) => {
                      toast({
                        title: `Campaign: ${campaign.name}`,
                        description: `${campaign.conversions || 0} conversions (${campaign.percentage || 0}% of target)`
                      });
                    }}
                  />
                )}
              </div>
              
              {/* Customer Activity */}
              <div className="customer-activity">
                <CustomerActivity 
                  recentActivity={(recentActivity || []).map((activity, index) => ({
                    id: activity.id || index,
                    customer: {
                      id: activity.id || index,
                      name: activity.name || 'Unknown',
                      email: activity.email || '',
                      initials: activity.initials || 'U'
                    },
                    action: 'Updated profile',
                    campaign: 'N/A',
                    date: activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : 'Unknown',
                    status: 'active' as const
                  }))}
                />
              </div>
            </div>
            
            {/* Right Column (1/3) */}
            <div className="space-y-6">
              {/* Summary Metrics */}
              <SummaryMetrics 
                metrics={metrics || []}
              />
              
              {/* Conversion Funnel */}
              <div className="conversion-funnel">
                <ConversionFunnelChart 
                  data={funnelData || []}
                  title="Customer Journey"
                  description="Conversion funnel from leads to customers"
                />
              </div>
              
              {/* Lead Scoring */}
              <div className="lead-scoring">
                <LeadScoring 
                  topLeads={(topLeads || []).map(lead => ({
                    ...lead,
                    location: lead.location || 'Unknown',
                    score: lead.score || 0
                  }))}
                />
              </div>
              
              {/* Next Actions */}
              <NextActions 
                tasks={(tasks || []).map(task => ({
                  ...task,
                  completed: task.completed || false
                }))}
                onToggleTask={toggleTask}
                onAddTask={() => toast({ title: "Coming soon", description: "This feature is under development" })}
              />
            </div>
          </div>
        </main>
      </div>
      
      {/* Voice Command Modal */}
      <VoiceCommandModal
        isOpen={isVoiceModalOpen}
        isListening={isListening}
        transcript={transcript}
        interpretedCommand={interpretedCommand || undefined}
        onClose={closeVoiceModal}
        onCancel={closeVoiceModal}
        onExecute={executeVoiceCommand}
        isBrowserSupported={isBrowserSupported}
        hasOpenAIKey={hasOpenAIKey}
      />
      
      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCampaignModalOpen}
        voiceData={campaignVoiceData}
        onCreateCampaign={createCampaign}
        onClose={closeCampaignModal}
      />
      
      {/* Email Preview Modal */}
      <EmailPreviewModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        voiceCommand={emailVoiceData?.command}
        targetAudience={emailVoiceData?.targetAudience}
      />
    </div>
  );
};

export default Dashboard;
