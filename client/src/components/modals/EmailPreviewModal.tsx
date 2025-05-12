import { FC, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceCommand?: string;
  targetAudience?: string;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  bodyHtml: string;
  category: string | null;
}

interface TopLead {
  id: number;
  name: string;
  email: string;
  initials: string;
  score: number;
}

const EmailPreviewModal: FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  voiceCommand = "",
  targetAudience = "top customers"
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");
  const [recipients, setRecipients] = useState<TopLead[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  
  const { toast } = useToast();
  
  // Fetch email templates
  const { data: templates } = useQuery({
    queryKey: ['/api/email/templates'],
    enabled: isOpen,
  });
  
  // Fetch top leads/customers data
  const { data: topLeads } = useQuery({
    queryKey: ['/api/leads/top'],
    enabled: isOpen,
  });
  
  // Parse audience type from voice command
  useEffect(() => {
    if (voiceCommand && isOpen) {
      // Set default template based on voice command
      if (templates && templates.length > 0) {
        // Pick the first promotional template or just the first template
        const promotionalTemplate = templates.find((template: EmailTemplate) => 
          template.category?.toLowerCase().includes('promotion')
        ) || templates[0];
        
        setSelectedTemplateId(promotionalTemplate.id.toString());
        setEmailSubject(promotionalTemplate.subject);
        setEmailBody(promotionalTemplate.bodyHtml);
      }
      
      // Set recipients based on the target audience
      if (topLeads && topLeads.length > 0) {
        // Limit to 5 recipients for preview
        setRecipients(topLeads.slice(0, 5));
      }
    }
  }, [voiceCommand, isOpen, templates, topLeads]);
  
  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (templates) {
      const template = templates.find((t: EmailTemplate) => t.id.toString() === templateId);
      if (template) {
        setEmailSubject(template.subject);
        setEmailBody(template.bodyHtml);
      }
    }
  };
  
  // Handle send email
  const handleSendEmail = async () => {
    if (!selectedTemplateId || recipients.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a template and ensure you have recipients.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      const recipientEmails = recipients.map(recipient => recipient.email).join(',');
      
      // Use the template-based sending endpoint
      const response = await apiRequest('/api/email/send-template', {
        method: 'POST',
        data: {
          templateId: parseInt(selectedTemplateId),
          to: recipientEmails,
          data: {
            firstName: "Valued Customer",
            company: "Your Company",
            senderName: "Marketing Team"
          }
        }
      });
      
      if (response) {
        toast({
          title: "Email Scheduled",
          description: `Your email has been scheduled to ${recipients.length} recipients.`,
        });
        onClose();
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Send Error",
        description: "There was an error scheduling your email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview Email Campaign</DialogTitle>
          <DialogDescription>
            Review and edit your email before sending it to {targetAudience}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-24 font-medium text-right">Template:</div>
            <div className="flex-1">
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an email template" />
                </SelectTrigger>
                <SelectContent>
                  {templates && templates.map((template: EmailTemplate) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-24 font-medium text-right">Subject:</div>
            <div className="flex-1 p-2 border rounded-md bg-slate-50">
              {emailSubject}
            </div>
          </div>
          
          <Separator />
          
          <div>
            <div className="font-medium mb-2">Recipients ({recipients.length}):</div>
            <div className="flex flex-wrap gap-2">
              {recipients.map((recipient) => (
                <div key={recipient.id} className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{recipient.initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{recipient.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div>
            <div className="font-medium mb-2">Email Content:</div>
            <div 
              className="p-4 border rounded-md min-h-[200px] max-h-[300px] overflow-y-auto bg-white"
              dangerouslySetInnerHTML={{ __html: emailBody }}
            />
          </div>
        </div>
        
        <DialogFooter className="mt-4 flex justify-between items-center">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSendEmail} disabled={isSending}>
            {isSending ? "Scheduling..." : "Schedule Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailPreviewModal;