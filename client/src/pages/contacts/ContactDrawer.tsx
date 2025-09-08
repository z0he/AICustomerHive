import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  Plus
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
      queryClient.invalidateQueries({ queryKey: ['contactNotes', contact?.id] });
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
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Activity tracking coming soon</p>
                  <p className="text-sm">Email opens, clicks, website visits, and more</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scoring Tab */}
          <TabsContent value="scoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Lead Scoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Lead scoring analysis coming soon</p>
                  <p className="text-sm">Engagement score, conversion probability, and recommendations</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketing Tab */}
          <TabsContent value="marketing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Marketing History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Marketing history coming soon</p>
                  <p className="text-sm">Email campaigns, sequences, and engagement metrics</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}