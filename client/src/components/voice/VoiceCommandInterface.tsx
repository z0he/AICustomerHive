import { FC } from "react";
import { Mic, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceCommandSuggestion {
  id: number;
  text: string;
  command: string;
}

interface VoiceCommandInterfaceProps {
  isListening: boolean;
  transcription: string;
  suggestions: VoiceCommandSuggestion[];
  onToggleListening: () => void;
  onSelectSuggestion: (command: string) => void;
  onShowHelp: () => void;
  userName: string;
}

const VoiceCommandInterface: FC<VoiceCommandInterfaceProps> = ({
  isListening,
  transcription,
  suggestions,
  onToggleListening,
  onSelectSuggestion,
  onShowHelp,
  userName
}) => {
  return (
    <section className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Welcome back, {userName}!</h2>
          <p className="text-slate-500 mt-1">Try using voice commands to manage your CRM</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center">
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl flex items-center w-full md:w-auto">
            <Button 
              variant="outline" 
              className={`p-3 rounded-l-xl border-2 ${isListening ? 'bg-red-50 border-red-400' : 'bg-blue-50 border-blue-400 hover:bg-blue-100'}`} 
              onClick={onToggleListening}
            >
              <div className={`h-10 w-10 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'} flex items-center justify-center shadow-md`}>
                <Mic className="text-white" size={20} />
                <span className="sr-only">Activate voice command</span>
              </div>
              <span className="ml-2 font-medium text-sm">{isListening ? "Listening..." : "Voice Commands"}</span>
            </Button>
            <div className="flex-grow px-4 py-2">
              <p className={`${transcription ? 'text-slate-700' : 'text-slate-400'} font-medium`}>
                {transcription || "Click the mic to use voice commands..."}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="mr-1" 
                    onClick={onShowHelp}
                  >
                    <HelpCircle className="text-slate-400 hover:text-primary-600" size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Get help with voice commands</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* Voice Command Suggestions */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {suggestions.map((suggestion) => (
          <Card 
            key={suggestion.id}
            className="cursor-pointer hover:bg-slate-50 hover:-translate-y-1 transition-all duration-200"
            onClick={() => onSelectSuggestion(suggestion.command)}
          >
            <CardContent className="p-3">
              <div className="flex items-start">
                <div className="text-accent-500 mr-2">
                  <Mic size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">"{suggestion.text}"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default VoiceCommandInterface;
