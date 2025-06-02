import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  Send, 
  Pause, 
  Play, 
  Trash2, 
  Eye,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

const ScheduledEmails: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { toast } = useToast();

  // Fetch scheduled emails
  const { data: scheduledEmails = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/email/scheduled', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all' 
        ? '/api/email/scheduled' 
        : `/api/email/scheduled?status=${statusFilter}`;
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled emails');
      }
      
      return response.json();
    },
  });

  // Cancel scheduled email mutation
  const cancelEmailMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await fetch(`/api/email/scheduled/${emailId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel scheduled email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email cancelled",
        description: "The scheduled email has been cancelled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email/scheduled'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel scheduled email",
        variant: "destructive",
      });
    },
  });

  // Send now mutation
  const sendNowMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const response = await fetch(`/api/email/scheduled/${emailId}/send-now`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email immediately');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email queued for immediate sending",
        description: "The email will be processed and sent shortly",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email/scheduled'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to send email immediately",
        variant: "destructive",
      });
    },
  });

  // Filter emails based on search and status
  const filteredEmails = scheduledEmails.filter((email: any) => {
    const matchesSearch = email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (email.fromAddress && email.fromAddress.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-blue-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-orange-600"><RefreshCw className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'sent':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'partially_sent':
        return <Badge variant="outline" className="text-yellow-600"><AlertCircle className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Get target audience display
  const getAudienceDisplay = (targetAudience: any) => {
    if (typeof targetAudience === 'string') {
      return targetAudience;
    }
    
    if (typeof targetAudience === 'object' && targetAudience.type) {
      let display = targetAudience.type;
      if (targetAudience.filters) {
        const filters = [];
        if (targetAudience.filters.source && targetAudience.filters.source !== "all_sources") {
          filters.push(`Source: ${targetAudience.filters.source}`);
        }
        if (targetAudience.filters.status && targetAudience.filters.status !== "all_statuses") {
          filters.push(`Status: ${targetAudience.filters.status}`);
        }
        if (filters.length > 0) {
          display += ` (${filters.join(', ')})`;
        }
      }
      return display;
    }
    
    return 'Unknown';
  };

  // Show email details
  const showDetails = (email: any) => {
    setSelectedEmail(email);
    setShowDetailsModal(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Emails</h1>
          <p className="text-muted-foreground">
            Manage and monitor your scheduled email campaigns
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by subject or sender..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="partially_sent">Partially Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Emails Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Emails ({filteredEmails.length})</CardTitle>
          <CardDescription>
            All your scheduled email campaigns and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading scheduled emails...</span>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No scheduled emails found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms' 
                  : 'Create a campaign and schedule an email to see it here'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Target Audience</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.map((email: any) => {
                  const scheduledDate = formatDate(email.scheduledFor);
                  return (
                    <TableRow key={email.id}>
                      <TableCell>
                        <div className="font-medium">{email.subject}</div>
                        {email.campaignId && (
                          <div className="text-sm text-muted-foreground">
                            Campaign ID: {email.campaignId}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(email.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {getAudienceDisplay(email.targetAudience)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          {scheduledDate.date}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {scheduledDate.time}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{email.fromAddress}</TableCell>
                      <TableCell className="text-sm">
                        {email.recipientCount || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showDetails(email)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {email.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendNowMutation.mutate(email.id)}
                                disabled={sendNowMutation.isPending}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelEmailMutation.mutate(email.id)}
                                disabled={cancelEmailMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Email Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>
              Detailed information about the scheduled email
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <p className="text-sm text-muted-foreground">{selectedEmail.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedEmail.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">From</label>
                  <p className="text-sm text-muted-foreground">{selectedEmail.fromAddress}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Scheduled For</label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedEmail.scheduledFor).date} at {formatDate(selectedEmail.scheduledFor).time}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Target Audience</label>
                <p className="text-sm text-muted-foreground">
                  {getAudienceDisplay(selectedEmail.targetAudience)}
                </p>
              </div>
              
              {selectedEmail.errorMessage && (
                <div>
                  <label className="text-sm font-medium text-red-600">Error Message</label>
                  <p className="text-sm text-red-600">{selectedEmail.errorMessage}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">Email Content Preview</label>
                <div className="mt-2 p-3 border rounded-md bg-gray-50 max-h-40 overflow-y-auto">
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedEmail.htmlContent?.substring(0, 500) + '...' || 'No content preview available'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduledEmails;