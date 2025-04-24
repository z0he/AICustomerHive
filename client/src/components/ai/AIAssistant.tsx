import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Mic, MicOff, Bot, Loader2, Check, X } from 'lucide-react';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCommandFeedback, setShowCommandFeedback] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Initialize voice recognition hook
  const {
    isListening,
    transcript,
    interpretedCommand,
    isProcessing,
    isBrowserSupported,
    toggleListening,
    resetRecognition
  } = useVoiceRecognition();

  // Effect to handle interpreting commands
  useEffect(() => {
    if (interpretedCommand) {
      // Provide visual feedback that we understood
      setShowCommandFeedback(true);
      
      // Process command based on intent after a slight delay
      const timer = setTimeout(() => {
        handleCommandExecution(interpretedCommand.intent, interpretedCommand.action);
        setShowCommandFeedback(false);
        setIsOpen(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [interpretedCommand]);

  // Handle executing commands based on the intent
  const handleCommandExecution = (intent: string, action: string) => {
    switch (intent) {
      case 'create_campaign':
        toast({
          title: "Creating New Campaign",
          description: "Opening campaign creation form",
        });
        setLocation('/campaigns/new');
        break;
        
      case 'show_campaign_performance':
        toast({
          title: "Campaign Performance",
          description: "Navigating to campaign analytics",
        });
        navigate('/analytics');
        break;
        
      case 'show_campaign_status':
        toast({
          title: "Campaign Status",
          description: "Showing active campaigns",
        });
        navigate('/campaigns');
        break;
        
      case 'send_email':
        toast({
          title: "Email Campaign",
          description: "Opening email composer",
        });
        navigate('/campaigns/new?type=email');
        break;
        
      case 'show_leads':
        toast({
          title: "Lead Management",
          description: "Showing your leads",
        });
        navigate('/leads');
        break;
        
      default:
        toast({
          title: "Command Recognized",
          description: "Processing: " + action,
        });
        // For unknown intents, we'll just acknowledge receipt
        break;
    }
  };

  const startListening = () => {
    if (!isBrowserSupported) {
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition. Try using Chrome, Edge or Safari.",
        variant: "destructive"
      });
      return;
    }
    
    resetRecognition();
    toggleListening();
  };

  const handleClose = () => {
    if (isListening) {
      toggleListening(); // Stop listening if active
    }
    resetRecognition();
    setShowCommandFeedback(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button in the corner */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Bot className="h-6 w-6" />
      </Button>

      {/* Dialog for voice assistant */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>AI Assistant</DialogTitle>
            <DialogDescription>
              {isListening 
                ? "Listening... Speak a command" 
                : "Click the microphone to speak a command"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            {/* Voice recognition button */}
            <Button
              onClick={startListening}
              disabled={isListening || isProcessing}
              variant="outline"
              size="lg"
              className={`rounded-full w-16 h-16 p-0 transition-all duration-300 ${isListening ? 'bg-red-50 text-red-500 border-red-200' : ''}`}
            >
              {isListening ? (
                <MicOff className="h-8 w-8 text-red-500" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>

            {/* Transcript display */}
            {(transcript || isProcessing) && (
              <div className="text-center mx-4 p-3 bg-muted rounded-md min-h-[60px] w-full">
                {transcript ? (
                  transcript
                ) : (
                  <span className="text-muted-foreground italic">Waiting for speech...</span>
                )}
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing your command...</span>
              </div>
            )}

            {/* Command feedback */}
            {showCommandFeedback && interpretedCommand && (
              <div className="bg-green-50 text-green-700 rounded-md p-3 flex items-center gap-2 w-full">
                <Check className="h-5 w-5" />
                <div>
                  <div className="font-medium">Command recognized</div>
                  <div className="text-sm">{interpretedCommand.action}</div>
                </div>
              </div>
            )}

            {/* Example commands */}
            <div className="w-full mt-4">
              <h4 className="text-sm font-medium mb-2">Example commands:</h4>
              <ul className="text-sm text-muted-foreground grid gap-1">
                <li>"Create a new email campaign"</li>
                <li>"Show me my top leads"</li>
                <li>"Check the status of my campaigns"</li>
                <li>"Show campaign performance stats"</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            
            <Button
              type="button"
              onClick={() => navigate('/campaigns/ai-suggestions')}
            >
              <Bot className="h-4 w-4 mr-2" />
              Get Campaign Suggestions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AIAssistant;