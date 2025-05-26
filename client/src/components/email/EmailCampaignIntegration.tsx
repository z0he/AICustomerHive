import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import CreateCampaignEmailModal from './CreateCampaignEmailModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, Calendar, Users, Mail, FileText, Settings, BarChart, TrendingUp, Eye, AlertCircle } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

const EmailCampaignIntegration = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [isNewEmailDialogOpen, setIsNewEmailDialogOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  // Fetch campaigns
  const {
    data: campaigns = [],
    isLoading: isCampaignsLoading,
    error: campaignsError,
  } = useQuery({
    queryKey: ['/api/campaigns'],
    enabled: activeTab === 'campaigns',
  });

  // Fetch campaign emails
  const {
    data: campaignEmails = [],
    isLoading: isCampaignEmailsLoading,
    error: campaignEmailsError,
  } = useQuery({
    queryKey: ['/api/campaigns/emails'],
    enabled: activeTab === 'scheduled',
  });

  // Get badge variant based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge>Scheduled</Badge>;
      case 'sent':
        return <Badge variant="outline">Sent</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Email Campaign Integration</h2>
        <Button onClick={() => setIsNewEmailDialogOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          Create Campaign Email
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Emails</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Campaigns</CardTitle>
              <CardDescription>
                Select a campaign to create targeted emails for your audience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCampaignsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading campaigns...</span>
                </div>
              ) : campaignsError ? (
                <div className="text-center py-8 text-red-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>Error loading campaigns. Please try again.</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Campaigns Found</h3>
                  <p className="text-muted-foreground">
                    Create a campaign first to start sending targeted emails.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {campaigns.map((campaign: any) => (
                    <Card key={campaign.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <Badge variant="outline">{campaign.type}</Badge>
                        </div>
                        <CardDescription>
                          Target: {campaign.targetAudience}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Start Date:</span>
                            <span>{new Date(campaign.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>End Date:</span>
                            <span>{new Date(campaign.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full" 
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setIsEmailModalOpen(true);
                          }}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Create Email
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Campaign Emails</CardTitle>
              <CardDescription>
                View and manage your scheduled campaign emails.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCampaignEmailsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading scheduled emails...</span>
                </div>
              ) : campaignEmailsError ? (
                <div className="text-center py-8 text-red-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>Error loading scheduled emails. Please try again.</p>
                </div>
              ) : campaignEmails.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Scheduled Emails</h3>
                  <p className="text-muted-foreground">
                    Schedule campaign emails to reach your audience.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsNewEmailDialogOpen(true)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Create Your First Campaign Email
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {campaignEmails.map((email: any) => (
                    <Card key={email.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{email.subject}</CardTitle>
                          {getStatusBadge(email.status)}
                        </div>
                        <CardDescription>
                          Campaign: {email.campaignName}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Scheduled:</span>
                            <span>{new Date(email.scheduledFor).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recipients:</span>
                            <span>{email.recipientCount || 'N/A'}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Simple Campaign Selection Dialog */}
      <Dialog open={isNewEmailDialogOpen} onOpenChange={setIsNewEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Campaign</DialogTitle>
            <DialogDescription>
              Choose which campaign you want to create an email for.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Campaign</label>
              <Select 
                onValueChange={val => {
                  const campaign = campaigns?.find((c: any) => c.id === parseInt(val, 10));
                  setSelectedCampaign(campaign);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns?.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsNewEmailDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={() => {
                  if (selectedCampaign) {
                    setIsNewEmailDialogOpen(false);
                    setIsEmailModalOpen(true);
                  }
                }}
                disabled={!selectedCampaign}
              >
                Create Email
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Email Creation Modal */}
      {selectedCampaign && (
        <CreateCampaignEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          campaign={selectedCampaign}
        />
      )}
    </div>
  );
};

export default EmailCampaignIntegration;