import { FC, useEffect, useState } from "react";
import { X, Mic, CheckIcon, AlertCircle, Loader } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VoiceCommandModalProps {
  isOpen: boolean;
  isListening: boolean;
  transcript: string;
  interpretedCommand?: {
    intent: string;
    action: string;
  };
  onClose: () => void;
  onCancel: () => void;
  onExecute: () => void;
  isBrowserSupported?: boolean;
  hasOpenAIKey?: boolean;
}

const VoiceCommandModal: FC<VoiceCommandModalProps> = ({
  isOpen,
  isListening,
  transcript,
  interpretedCommand,
  onClose,
  onCancel,
  onExecute,
  isBrowserSupported = true,
  hasOpenAIKey = false
}) => {
  const [statusText, setStatusText] = useState("Listening...");
  const [showResults, setShowResults] = useState(false);
  const [processingStage, setProcessingStage] = useState<"listening" | "processing" | "ready" | "error">("listening");
  
  useEffect(() => {
    if (isListening) {
      setStatusText("Listening to your command...");
      setShowResults(false);
      setProcessingStage("listening");
    } else if (transcript && !interpretedCommand) {
      setStatusText("Processing your request...");
      setShowResults(false);
      setProcessingStage("processing");
    } else if (interpretedCommand) {
      setStatusText(interpretedCommand.intent === "unknown" 
        ? "I couldn't understand that command" 
        : "I understood your command");
      setShowResults(true);
      setProcessingStage(interpretedCommand.intent === "unknown" ? "error" : "ready");
      console.log("Ready to execute command:", interpretedCommand);
    }
  }, [isListening, transcript, interpretedCommand]);
  
  // Debug when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log("Modal opened with:", { 
        isListening, 
        transcript, 
        interpretedCommand 
      });
    }
  }, [isOpen]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mic className="text-accent-500 mr-2" size={18} />
            <span>Voice Command</span>
          </DialogTitle>
          <DialogDescription>
            Use your voice to control the CRM. Speak commands clearly for best results.
          </DialogDescription>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4" 
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-6">
          {!isBrowserSupported && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md w-full">
              <p className="text-red-600 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.
              </p>
            </div>
          )}
          
          {!hasOpenAIKey && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md w-full">
              <p className="text-amber-700 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                Using simplified voice recognition. For better results, configure the OpenAI API key.
              </p>
              <div className="mt-2 flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs bg-white"
                  onClick={() => {
                    window.open('https://platform.openai.com/account/api-keys', '_blank');
                  }}
                >
                  Get API Key
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                  onClick={async () => {
                    const apiKey = prompt('Please enter your OpenAI API key:');
                    if (apiKey && apiKey.trim()) {
                      try {
                        const response = await fetch('/api/config/openai', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ apiKey: apiKey.trim() }),
                          credentials: 'include'
                        });
                        
                        if (response.ok) {
                          alert('API key has been configured successfully. Please refresh to activate enhanced voice commands.');
                        } else {
                          alert('Failed to configure API key. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error configuring API key:', error);
                        alert('Error configuring API key. Please try again.');
                      }
                    }
                  }}
                >
                  Configure Key
                </Button>
              </div>
            </div>
          )}
          
          <div className={`h-20 w-20 rounded-full 
            ${processingStage === "listening" ? 'bg-red-500 animate-pulse' : 
              processingStage === "processing" ? 'bg-amber-500 animate-pulse' : 
              processingStage === "error" ? 'bg-slate-400' : 'bg-green-500'} 
            flex items-center justify-center mb-4 transition-colors`}>
            {processingStage === "listening" && <Mic className="text-white" size={36} />}
            {processingStage === "processing" && <Loader className="text-white animate-spin" size={36} />}
            {processingStage === "ready" && <CheckIcon className="text-white" size={36} />}
            {processingStage === "error" && <AlertCircle className="text-white" size={36} />}
          </div>
          <p className="text-lg font-medium text-slate-800">{statusText}</p>
          <p className="text-slate-500 text-center mt-2">
            {transcript || "Say a command like \"Create a new campaign\" or \"Show me my top leads\""}
          </p>
        </div>
        
        {showResults && interpretedCommand && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <h4 className="font-medium text-slate-800">I understood you want to:</h4>
            <div className="bg-slate-50 p-3 rounded-lg mt-2">
              <p className="text-slate-700">{interpretedCommand.action}</p>
            </div>
            
            <div className="mt-4 flex justify-end space-x-3">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={onExecute}>
                Execute Command
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCommandModal;
