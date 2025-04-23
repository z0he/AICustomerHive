import { FC } from "react";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mic } from "lucide-react";

interface VoiceCommandHelpProps {
  trigger?: React.ReactNode;
}

const VoiceCommandHelp: FC<VoiceCommandHelpProps> = ({ trigger }) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Voice Command Help</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <Mic className="mr-2 h-5 w-5 text-accent-500" />
            Voice Command Help
          </SheetTitle>
          <SheetDescription>
            Learn how to use voice commands effectively in the CRM
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium">How to Use Voice Commands</h3>
            <p className="text-muted-foreground mt-2">
              Click the microphone button and speak clearly to issue commands. Wait for the system to process your request.
            </p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Available Commands</h3>
            
            <div className="space-y-4 mt-3">
              <div className="bg-accent-50 p-3 rounded-md">
                <h4 className="font-medium text-accent-700">Campaign Management</h4>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>"Create a new campaign"</li>
                  <li>"Show me the performance of my latest campaign"</li>
                  <li>"What's the status of my nurture campaign?"</li>
                </ul>
              </div>
              
              <div className="bg-accent-50 p-3 rounded-md">
                <h4 className="font-medium text-accent-700">Lead Management</h4>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>"Show me my top leads"</li>
                  <li>"Create a new lead for Acme Inc"</li>
                  <li>"Find leads that need follow-up"</li>
                </ul>
              </div>
              
              <div className="bg-accent-50 p-3 rounded-md">
                <h4 className="font-medium text-accent-700">Customer Actions</h4>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>"Send an email to my VIP customers"</li>
                  <li>"Show me customers with pending orders"</li>
                  <li>"Create a task to follow up with new customers"</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Tips for Best Results</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>• Speak clearly and at a normal pace</li>
              <li>• Start with an action verb (create, show, find, send)</li>
              <li>• Be specific about what you want</li>
              <li>• Use short, direct commands</li>
              <li>• If recognition fails, try rephrasing your command</li>
            </ul>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Voice recognition may not work in all browsers. For best results, use Chrome, Edge, or Safari.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VoiceCommandHelp;