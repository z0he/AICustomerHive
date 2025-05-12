import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import {
  CalendarClock,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  Tag,
  User,
  Edit,
  Save,
  PlusCircle,
  Calendar,
  ClipboardList
} from "lucide-react";

import LeadForm from "./LeadForm";
import LeadScoringCard from "./LeadScoringCard";

interface LeadDetailsProps {
  lead: any;
  onUpdateScore: (scoringData: any) => void;
  onUpdateLead: (leadData: any) => void;
  onAddNote: (note: string) => void;
  onAssignOwner: (ownerName: string) => void;
  isUpdating?: boolean;
  leadOwners?: { id: number, name: string }[];
}

export default function LeadDetails({ 
  lead, 
  onUpdateScore,
  onUpdateLead,
  onAddNote,
  onAssignOwner,
  isUpdating = false,
  leadOwners = []
}: LeadDetailsProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const [noteText, setNoteText] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(lead.leadOwner || "");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isAssigningOwner, setIsAssigningOwner] = useState(false);
  
  // Handle note submission
  const handleAddNote = () => {
    if (!noteText.trim()) return;
    
    setIsSubmittingNote(true);
    onAddNote(noteText);
    // Optimistically clear the text area
    setNoteText("");
    setTimeout(() => setIsSubmittingNote(false), 500);
  };
  
  // Handle owner assignment
  const handleAssignOwner = () => {
    if (!selectedOwner) return;
    
    setIsAssigningOwner(true);
    onAssignOwner(selectedOwner);
    setTimeout(() => setIsAssigningOwner(false), 500);
  };
  
  // Format date helper
  const formatDate = (timestamp: string | Date) => {
    if (!timestamp) return "Not set";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  
  // Format time helper
  const formatTime = (timestamp: string | Date) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  // Parse notes
  const parseNotes = (notesText: string) => {
    if (!notesText) return [];
    
    // Split notes by double new lines
    return notesText.split('\n\n').map(note => {
      // Extract timestamp and content
      const match = note.match(/^\[(.*?)\]\n([\s\S]*)/);
      if (match) {
        return {
          timestamp: match[1],
          content: match[2]
        };
      }
      return { timestamp: "", content: note };
    });
  };
  
  // Get status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "qualified":
        return "success";
      case "proposal":
      case "negotiation":
        return "outline";
      case "won":
        return "success";
      case "lost":
        return "destructive";
      default:
        return "secondary";
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">{lead.name}</CardTitle>
              <CardDescription>
                {lead.company ? `${lead.company} • ` : ""}
                {lead.industry}
                {lead.location ? ` • ${lead.location}` : ""}
              </CardDescription>
            </div>
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Edit Lead</DialogTitle>
                </DialogHeader>
                <LeadForm
                  onSubmit={onUpdateLead}
                  isSubmitting={isUpdating}
                  defaultValues={lead}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {lead.leadStatus && (
              <Badge variant={getStatusBadge(lead.leadStatus)}>
                {lead.leadStatus.charAt(0).toUpperCase() + lead.leadStatus.slice(1)}
              </Badge>
            )}
            {lead.leadSource && (
              <Badge variant="outline">
                Source: {lead.leadSource}
              </Badge>
            )}
            {lead.score !== undefined && (
              <Badge variant={lead.score >= 70 ? "success" : lead.score >= 40 ? "outline" : "default"}>
                Score: {lead.score}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardContent className="pb-1">
            <TabsList className="w-full">
              <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
              <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
              <TabsTrigger value="scoring" className="flex-1">Scoring</TabsTrigger>
              <TabsTrigger value="marketing" className="flex-1">Marketing</TabsTrigger>
            </TabsList>
          </CardContent>
          
          <CardContent>
            <TabsContent value="profile" className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-slate-500">{lead.email}</p>
                    </div>
                  </div>
                )}
                
                {lead.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-slate-500">{lead.phone}</p>
                    </div>
                  </div>
                )}
                
                {lead.company && (
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Company</p>
                      <p className="text-sm text-slate-500">{lead.company}</p>
                    </div>
                  </div>
                )}
                
                {lead.jobTitle && (
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Job Title</p>
                      <p className="text-sm text-slate-500">{lead.jobTitle}</p>
                    </div>
                  </div>
                )}
                
                {lead.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-slate-500">{lead.location}</p>
                    </div>
                  </div>
                )}
                
                {lead.tags && lead.tags.length > 0 && (
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Tags</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lead.tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-slate-400" />
                  <div className="w-full">
                    <p className="text-sm font-medium">Lead Owner</p>
                    <div className="flex mt-1">
                      <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Assign owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {leadOwners.map(owner => (
                            <SelectItem key={owner.id} value={owner.name}>
                              {owner.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="ml-2"
                        onClick={handleAssignOwner}
                        disabled={isAssigningOwner || !selectedOwner || selectedOwner === lead.leadOwner}
                      >
                        {isAssigningOwner ? "Assigning..." : "Assign"}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <CalendarClock className="h-4 w-4 mr-2 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">Added On</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(lead.createdAt)} at {formatTime(lead.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              
              {lead.nextFollowUpDate && (
                <div className="mt-6 bg-slate-50 p-3 rounded-md flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Next Follow-up</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(lead.nextFollowUpDate)} at {formatTime(lead.nextFollowUpDate)}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="notes" className="space-y-4 mt-2">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note about this lead..."
                  className="min-h-[100px]"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <Button 
                  onClick={handleAddNote} 
                  disabled={isSubmittingNote || !noteText.trim()}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {isSubmittingNote ? "Adding Note..." : "Add Note"}
                </Button>
              </div>
              
              <div className="space-y-4 mt-6">
                <h4 className="text-sm font-medium flex items-center">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Notes History
                </h4>
                
                {(!lead.notes || parseNotes(lead.notes).length === 0) ? (
                  <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-md">
                    <p>No notes available for this lead</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {parseNotes(lead.notes).map((note: any, i: number) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-md">
                        {note.timestamp && (
                          <p className="text-xs text-slate-500 mb-1">{note.timestamp}</p>
                        )}
                        <p className="text-sm whitespace-pre-line">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="activity" className="mt-2">
              <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-md">
                <p>Activity tracking is coming soon</p>
                <p className="text-xs mt-1">This feature will show emails, calls, and other interactions</p>
              </div>
            </TabsContent>
            
            <TabsContent value="scoring" className="mt-2">
              <LeadScoringCard 
                lead={lead}
                onUpdateScore={onUpdateScore}
                isUpdating={isUpdating}
              />
            </TabsContent>
            
            <TabsContent value="marketing" className="mt-2">
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-md border">
                  <h3 className="text-lg font-medium mb-4">Marketing Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Marketing</p>
                        <p className="text-sm text-slate-500">Receive promotional emails and newsletters</p>
                      </div>
                      <Switch defaultChecked={lead.marketingEmail ?? false} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">SMS Marketing</p>
                        <p className="text-sm text-slate-500">Receive promotional text messages</p>
                      </div>
                      <Switch defaultChecked={lead.marketingSms ?? false} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Phone Calls</p>
                        <p className="text-sm text-slate-500">Receive promotional phone calls</p>
                      </div>
                      <Switch defaultChecked={lead.marketingCall ?? false} />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-md border">
                  <h3 className="text-lg font-medium mb-4">Communication Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="preferredTime">Preferred Contact Time</Label>
                        <Select defaultValue={lead.preferredContactTime || "business_hours"}>
                          <SelectTrigger id="preferredTime">
                            <SelectValue placeholder="Select preferred time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business_hours">Business Hours (9am-5pm)</SelectItem>
                            <SelectItem value="morning">Morning (9am-12pm)</SelectItem>
                            <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                            <SelectItem value="evening">Evening (5pm-8pm)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="preferredChannel">Preferred Contact Method</Label>
                        <Select defaultValue={lead.preferredContactMethod || "email"}>
                          <SelectTrigger id="preferredChannel">
                            <SelectValue placeholder="Select preferred channel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="social">Social Media</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-md border">
                  <h3 className="text-lg font-medium mb-4">Consent Management</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Checkbox id="consent-gdpr" defaultChecked={lead.gdprConsent} />
                      <label
                        htmlFor="consent-gdpr"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-2"
                      >
                        GDPR Consent
                      </label>
                    </div>
                    <div className="flex items-center">
                      <Checkbox id="consent-casl" defaultChecked={lead.caslConsent} />
                      <label
                        htmlFor="consent-casl"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-2"
                      >
                        CASL Consent (Canada)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <Checkbox id="consent-ccpa" defaultChecked={lead.ccpaConsent} />
                      <label
                        htmlFor="consent-ccpa"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-2"
                      >
                        CCPA Consent (California)
                      </label>
                    </div>
                    
                    <div className="mt-6">
                      <Button variant="outline" className="w-full">
                        Save Marketing Preferences
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}