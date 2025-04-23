import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { apiRequest } from "@/lib/queryClient";

// Components
import AuthHeader from "@/components/auth/AuthHeader";
import Sidebar from "@/components/layout/Sidebar";
import VoiceCommandInterface from "@/components/voice/VoiceCommandInterface";
import VoiceCommandModal from "@/components/modals/VoiceCommandModal";
import CreateCampaignModal from "@/components/modals/CreateCampaignModal";
import CampaignPerformance from "@/components/dashboard/CampaignPerformance";
import CustomerActivity from "@/components/dashboard/CustomerActivity";
import SummaryMetrics from "@/components/dashboard/SummaryMetrics";
import LeadScoring from "@/components/dashboard/LeadScoring";
import NextActions from "@/components/dashboard/NextActions";
import CampaignPerformanceChart from "@/components/dashboard/CampaignPerformanceChart";
import PerformanceMetricsChart from "@/components/dashboard/PerformanceMetricsChart";

// Types
import { Campaign, Customer, Lead, Task } from "@shared/schema";

const Dashboard = () => {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [campaignVoiceData, setCampaignVoiceData] = useState<{ command: string } | undefined>(undefined);
  
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
    queryKey: ['/api/user/current'],
    queryFn: async () => {
      // Return mock user data for now
      return {
        id: 1,
        name: "John Doe",
        initials: "JD",
        email: "john@example.com"
      };
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
    { id: 2, text: "Create a new campaign for inactive customers", command: "Create a new campaign targeting customers who haven't purchased in 3 months" },
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
          toast({
            title: "Email scheduled",
            description: "Your email campaign has been scheduled for delivery.",
          });
          closeVoiceModal();
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
        user={userData || { id: 1, name: "John Doe", initials: "JD" }} 
        notifications={notifications || []} 
        onLogout={handleLogout} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar recentCampaigns={recentCampaigns || []} />
        
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
            userName={userData?.name.split(' ')[0] || 'User'}
            isBrowserSupported={isBrowserSupported}
          />
          
          {/* Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2/3) */}
            <div className="col-span-2 space-y-6">
              {/* Campaign Performance */}
              <div className="campaign-performance">
                <CampaignPerformance 
                  campaigns={campaigns || []}
                  selectedPeriod={selectedPeriod}
                  onPeriodChange={setSelectedPeriod}
                />
              </div>
              
              {/* Customer Activity */}
              <div className="customer-activity">
                <CustomerActivity 
                  recentActivity={recentActivity || []}
                />
              </div>
            </div>
            
            {/* Right Column (1/3) */}
            <div className="space-y-6">
              {/* Summary Metrics */}
              <SummaryMetrics 
                metrics={metrics || []}
              />
              
              {/* Lead Scoring */}
              <div className="lead-scoring">
                <LeadScoring 
                  topLeads={topLeads || []}
                />
              </div>
              
              {/* Next Actions */}
              <NextActions 
                tasks={tasks || []}
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
    </div>
  );
};

export default Dashboard;
