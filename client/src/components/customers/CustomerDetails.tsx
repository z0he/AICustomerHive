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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Customer } from "@shared/schema";
import CustomerForm from "./CustomerForm";

import {
  CalendarClock,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  User,
  Edit,
  Save,
  PlusCircle,
  Calendar,
  ClipboardList,
  Globe,
  Linkedin,
  Tag
} from "lucide-react";

interface CustomerDetailsProps {
  customer: Customer;
  onUpdateCustomer: (customerData: any) => void;
  onAddNote: (note: string) => void;
  isUpdating?: boolean;
}

export default function CustomerDetails({ 
  customer, 
  onUpdateCustomer,
  onAddNote,
  isUpdating = false
}: CustomerDetailsProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const [noteText, setNoteText] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  
  // Handle note submission
  const handleAddNote = () => {
    if (!noteText.trim()) return;
    
    setIsSubmittingNote(true);
    onAddNote(noteText);
    // Optimistically clear the text area
    setNoteText("");
    setTimeout(() => setIsSubmittingNote(false), 500);
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
      case "active":
        return "success";
      case "inactive":
        return "secondary";
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
              <CardTitle className="text-xl">{customer.name}</CardTitle>
              <CardDescription>
                {customer.company ? `${customer.company} • ` : ""}
                {customer.contactIndustry}
                {customer.country ? ` • ${customer.country}` : ""}
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
                  <DialogTitle>Edit Customer</DialogTitle>
                </DialogHeader>
                <CustomerForm
                  onSubmit={onUpdateCustomer}
                  isSubmitting={isUpdating}
                  defaultValues={{
                    firstName: customer.firstName || "",
                    lastName: customer.lastName || "",
                    email: customer.email || "",
                    phone: customer.phone || "",
                    company: customer.company || "",
                    jobTitle: customer.jobTitle || "",
                    industry: customer.contactIndustry || "",
                    country: customer.country || "",
                    contactSource: customer.contactSource || "website",
                    lifecycleStage: customer.status || "lead",
                    location: customer.location || "",
                    linkedin: customer.linkedinUrl || "",
                    twitter: ""  // This field might not exist yet
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {customer.status && (
              <Badge variant={getStatusBadge(customer.status)}>
                {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
              </Badge>
            )}
            {customer.lifecycleStage && (
              <Badge variant="outline">
                {customer.lifecycleStage.charAt(0).toUpperCase() + customer.lifecycleStage.slice(1)}
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
              <TabsTrigger value="marketing" className="flex-1">Marketing</TabsTrigger>
            </TabsList>
          </CardContent>
          
          <CardContent>
            <TabsContent value="profile" className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-slate-500">{customer.email}</p>
                    </div>
                  </div>
                )}
                
                {customer.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-slate-500">{customer.phone}</p>
                    </div>
                  </div>
                )}
                
                {customer.company && (
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Company</p>
                      <p className="text-sm text-slate-500">{customer.company}</p>
                    </div>
                  </div>
                )}
                
                {customer.jobTitle && (
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Job Title</p>
                      <p className="text-sm text-slate-500">{customer.jobTitle}</p>
                    </div>
                  </div>
                )}
                
                {customer.country && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Country</p>
                      <p className="text-sm text-slate-500">{customer.country}</p>
                    </div>
                  </div>
                )}
                
                {customer.contactType && (
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Contact Type</p>
                      <p className="text-sm text-slate-500">{customer.contactType}</p>
                    </div>
                  </div>
                )}
                
                {customer.linkedinUrl && (
                  <div className="flex items-center">
                    <Linkedin className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">LinkedIn</p>
                      <p className="text-sm text-slate-500">
                        <a 
                          href={customer.linkedinUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {customer.linkedinUrl}
                        </a>
                      </p>
                    </div>
                  </div>
                )}
                
                {customer.legalBasis && (
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">Legal Basis</p>
                      <p className="text-sm text-slate-500">{customer.legalBasis}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">Contact Owner</p>
                    <p className="text-sm text-slate-500">{customer.contactOwner || "Unassigned"}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <CalendarClock className="h-4 w-4 mr-2 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">Added On</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(customer.createdAt)} at {formatTime(customer.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="notes" className="space-y-4 mt-2">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note about this customer..."
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
                
                {/* Display notes if they exist */}
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-md">
                  <p>No notes available for this customer</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="activity" className="mt-2">
              <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-md">
                <p>Activity tracking is coming soon</p>
                <p className="text-xs mt-1">This feature will show emails, calls, and other interactions</p>
              </div>
            </TabsContent>
            
            <TabsContent value="marketing" className="mt-2">
              <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-md">
                <p>Marketing preferences and consent management</p>
                <p className="text-xs mt-1">This feature will allow managing marketing preferences and consent</p>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}