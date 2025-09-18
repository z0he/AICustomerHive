import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Lead Scoring Components
import LeadScoringCard from '@/components/leads/LeadScoringCard';
import LeadScoringAlgorithm from '@/components/leads/LeadScoringAlgorithm';

// UI Components
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Star,
  Target,
  TrendingUp,
  MessageSquare,
  Edit3,
  Send,
  Plus,
  Eye,
  MousePointer,
  FileText,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Shield
} from 'lucide-react';

interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  country?: string;
  lifecycleStage?: string;
  source?: string;
  lastActivity?: string;
  owner?: string;
}

interface ContactDrawerProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Note {
  id: number;
  content: string;
  createdAt: string;
  createdBy: string;
}

export default function ContactDrawer({ contact, isOpen, onClose }: ContactDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Fetch contact notes
  const { data: notes = [] } = useQuery({
    queryKey: ['contactNotes', contact?.id],
    queryFn: () => fetch(`/api/contacts/${contact?.id}/notes`).then(res => res.json()),
    enabled: !!contact?.id && isOpen,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/contacts/${contact?.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to add note');
      return response.json();
    },
    onSuccess: () => {
      // Force refetch of notes with await
      queryClient.invalidateQueries({ queryKey: ['contactNotes', contact?.id] });
      queryClient.refetchQueries({ queryKey: ['contactNotes', contact?.id] });
      setNewNote('');
      toast({
        title: 'Note added',
        description: 'Contact note has been saved successfully.',
      });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote);
  };

  // Handle lead scoring update
  const handleScoreUpdate = (scoringData: any) => {
    toast({
      title: 'Score updated',
      description: 'Lead score has been updated successfully.',
    });
    // TODO: Implement actual score update API call
  };

  // Mock activity data - in real app, fetch from API
  const mockActivity = [
    {
      id: 1,
      type: 'email_open',
      title: 'Opened email: "Welcome to our platform"',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      icon: Mail,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 2,
      type: 'website_visit',
      title: 'Visited pricing page',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      icon: Eye,
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 3,
      type: 'email_click',
      title: 'Clicked CTA button in email campaign',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      icon: MousePointer,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 4,
      type: 'form_submit',
      title: 'Submitted contact form',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      icon: FileText,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: 5,
      type: 'meeting_scheduled',
      title: 'Scheduled demo meeting',
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      icon: Video,
      color: 'bg-indigo-100 text-indigo-600'
    }
  ];

  // Mock marketing data
  const marketingData = {
    emailSubscribed: true,
    marketingConsent: true,
    gdprConsent: true,
    lastEmailSent: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    emailOpenRate: 75,
    emailClickRate: 12,
    totalEmailsSent: 15,
    totalEmailsOpened: 11,
    campaignEngagement: [
      {
        campaign: 'Welcome Series',
        status: 'completed',
        opened: true,
        clicked: true,
        converted: false
      },
      {
        campaign: 'Product Updates',
        status: 'active',
        opened: true,
        clicked: false,
        converted: false
      },
      {
        campaign: 'Holiday Promotion',
        status: 'scheduled',
        opened: false,
        clicked: false,
        converted: false
      }
    ]
  };

  const getStageColor = (stage?: string) => {
    switch (stage) {
      case 'lead': return 'bg-blue-100 text-blue-800';
      case 'opportunity': return 'bg-yellow-100 text-yellow-800';
      case 'customer': return 'bg-green-100 text-green-800';
      case 'evangelist': return 'bg-purple-100 text-purple-800';
      case 'churned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  if (!contact) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader className="space-y-4 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-semibold bg-emerald-100 text-emerald-800">
                  {contact.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <SheetTitle className="text-2xl font-bold">{contact.name}</SheetTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getStageColor(contact.lifecycleStage)}>
                    {contact.lifecycleStage || 'Unknown'}
                  </Badge>
                  <Badge variant="outline">{contact.source || 'Unknown source'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {contact.jobTitle} {contact.jobTitle && contact.company && 'at'} {contact.company}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Phone
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      Company
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.company || 'Not provided'}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Location
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.country || 'Not provided'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Last Activity
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(contact.lastActivity)}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Notes & Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new note */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a note about this contact..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Notes list */}
                <div className="space-y-4">
                  {notes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No notes yet. Add the first note about this contact.
                    </p>
                  ) : (
                    notes.map((note: Note) => (
                      <div key={note.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{note.createdBy}</span>
                          <span className="text-muted-foreground">{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No activity recorded yet</p>
                    <p className="text-sm">Activity will appear here as the contact engages</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mockActivity.map((activity, index) => {
                      const IconComponent = activity.icon;
                      const timeAgo = new Date(activity.timestamp).toLocaleString();
                      return (
                        <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${activity.color}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{timeAgo}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Engagement Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email Engagement</Label>
                    <Progress value={marketingData.emailOpenRate} className="h-2" />
                    <p className="text-xs text-muted-foreground">{marketingData.emailOpenRate}% open rate</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Website Activity</Label>
                    <Progress value={65} className="h-2" />
                    <p className="text-xs text-muted-foreground">5 pages visited</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scoring Tab */}
          <TabsContent value="scoring" className="space-y-4">
            <div className="space-y-6">
              <LeadScoringCard
                lead={contact}
                onUpdateScore={handleScoreUpdate}
                isUpdating={false}
              />
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Advanced Scoring Configuration
                </h3>
                <LeadScoringAlgorithm
                  lead={contact as any}
                  onScoreUpdate={(newScore, breakdown) => {
                    console.log('Advanced score update:', newScore, breakdown);
                    // Update the lead score with the new calculation
                    if (handleScoreUpdate) {
                      handleScoreUpdate({ score: newScore, scoreBreakdown: breakdown });
                    }
                  }}
                  mode="individual"
                />
              </div>
            </div>
          </TabsContent>

          {/* Marketing Tab */}
          <TabsContent value="marketing" className="space-y-4">
            {/* Marketing Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Marketing Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-marketing">Email Marketing</Label>
                    <p className="text-xs text-muted-foreground">Receive promotional emails and updates</p>
                  </div>
                  <Switch
                    id="email-marketing"
                    checked={marketingData.emailSubscribed}
                    onCheckedChange={(checked) => {
                      toast({
                        title: checked ? 'Subscribed' : 'Unsubscribed',
                        description: `Contact has been ${checked ? 'subscribed to' : 'unsubscribed from'} email marketing.`,
                      });
                    }}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketing-consent">Marketing Consent</Label>
                    <p className="text-xs text-muted-foreground">Consent to receive marketing communications</p>
                  </div>
                  <Switch
                    id="marketing-consent"
                    checked={marketingData.marketingConsent}
                    onCheckedChange={(checked) => {
                      toast({
                        title: 'Consent updated',
                        description: 'Marketing consent preferences have been updated.',
                      });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="gdpr-consent">GDPR Consent</Label>
                    <p className="text-xs text-muted-foreground">EU privacy regulation compliance</p>
                  </div>
                  <Switch
                    id="gdpr-consent"
                    checked={marketingData.gdprConsent}
                    onCheckedChange={(checked) => {
                      toast({
                        title: 'GDPR consent updated',
                        description: 'GDPR consent status has been updated.',
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Campaign Engagement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Campaign Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {marketingData.campaignEngagement.map((campaign, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{campaign.campaign}</h4>
                      <Badge 
                        variant={campaign.status === 'completed' ? 'default' : 
                               campaign.status === 'active' ? 'secondary' : 'outline'}
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        {campaign.opened ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={campaign.opened ? 'text-green-600' : 'text-gray-500'}>
                          Opened
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {campaign.clicked ? (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={campaign.clicked ? 'text-blue-600' : 'text-gray-500'}>
                          Clicked
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {campaign.converted ? (
                          <CheckCircle className="h-4 w-4 text-purple-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={campaign.converted ? 'text-purple-600' : 'text-gray-500'}>
                          Converted
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Email Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Total Sent</Label>
                    <p className="text-2xl font-bold">{marketingData.totalEmailsSent}</p>
                    <p className="text-xs text-muted-foreground">emails sent</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Total Opened</Label>
                    <p className="text-2xl font-bold">{marketingData.totalEmailsOpened}</p>
                    <p className="text-xs text-muted-foreground">emails opened</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Open Rate</Label>
                    <div className="flex items-center gap-2">
                      <Progress value={marketingData.emailOpenRate} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{marketingData.emailOpenRate}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Click Rate</Label>
                    <div className="flex items-center gap-2">
                      <Progress value={marketingData.emailClickRate} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{marketingData.emailClickRate}%</span>
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="text-sm text-muted-foreground">
                  <p>Last email sent: {formatDate(marketingData.lastEmailSent)}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}