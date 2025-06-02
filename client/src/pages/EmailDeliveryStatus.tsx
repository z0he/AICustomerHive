import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Clock, XCircle, Mail, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EmailLog {
  id: number;
  from: string;
  to: string;
  subject: string;
  status: string;
  sentAt: string;
  metadata?: {
    testEmail?: boolean;
    mailgunId?: string;
    originalSubject?: string;
    personalizationApplied?: boolean;
    error?: string;
  };
}

interface MailgunConfig {
  configured: boolean;
  domain?: string;
  isSandbox?: boolean;
}

export default function EmailDeliveryStatus() {
  const { data: emails, isLoading } = useQuery<EmailLog[]>({
    queryKey: ['/api/email/logs'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: mailgunConfig } = useQuery<MailgunConfig>({
    queryKey: ['/api/config/mailgun/status']
  });

  const recentEmails = emails?.slice(0, 10) || [];
  const totalSent = emails?.filter(e => e.status === 'sent').length || 0;
  const totalFailed = emails?.filter(e => e.status === 'failed').length || 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Sent to Mailgun</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Email Delivery Status</h1>
        <Badge variant="outline" className="text-sm">
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Mailgun Configuration Alert */}
      {mailgunConfig?.configured && mailgunConfig.domain?.includes('sandbox') && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Sandbox Domain Detected:</strong> You're using a Mailgun sandbox domain ({mailgunConfig.domain}). 
            Emails are sent to Mailgun but only delivered to authorized recipients. To send to any email address, 
            you need to either add recipients to your authorized list in Mailgun or upgrade to a paid account.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent}</div>
            <p className="text-xs text-muted-foreground">Successfully sent to Mailgun</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Emails</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFailed}</div>
            <p className="text-xs text-muted-foreground">Failed to send</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emails?.length ? Math.round((totalSent / emails.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Of all attempted emails</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Emails Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Email Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEmails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No emails sent yet
            </div>
          ) : (
            <div className="space-y-4">
              {recentEmails.map((email) => (
                <div key={email.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(email.status)}
                    <div className="space-y-1">
                      <div className="font-medium">{email.subject}</div>
                      <div className="text-sm text-muted-foreground">
                        To: {email.to} • From: {email.from}
                      </div>
                      {email.metadata?.error && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          Error: {email.metadata.error}
                        </div>
                      )}
                      {email.metadata?.mailgunId && (
                        <div className="text-xs text-muted-foreground">
                          Mailgun ID: {email.metadata.mailgunId}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(email.status)}
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(email.sentAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Domain Configuration Help */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help with Email Delivery?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">If emails aren't reaching your inbox:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Check your spam/junk folder</li>
              <li>Verify the recipient email is added to your Mailgun authorized recipients</li>
              <li>Consider upgrading from a sandbox to a verified Mailgun domain</li>
              <li>Check Mailgun logs in your Mailgun dashboard for delivery details</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Mailgun Domain Status:</h4>
            <div className="text-sm">
              {mailgunConfig?.domain ? (
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {mailgunConfig.domain}
                  {mailgunConfig.domain.includes('sandbox') && (
                    <Badge variant="outline" className="ml-2 text-xs">Sandbox</Badge>
                  )}
                </span>
              ) : (
                <span className="text-red-600">Not configured</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}