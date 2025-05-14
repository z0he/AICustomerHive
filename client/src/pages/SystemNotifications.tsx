import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CircleCheck, CircleOff, RefreshCw, AlertTriangle, Info, AlertCircle, Clock, Trash2, MailCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

// Type definition for a system notification
interface SystemNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  isEmailSent: boolean;
  emailRecipient: string | null;
  createdAt: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  metadata: any;
}

const SystemNotifications = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch notifications and calculate counts
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/notifications'],
    queryFn: async () => {
      try {
        // For now, let's mock the notifications since the API route isn't fully implemented
        return [
          {
            id: 1,
            type: 'new_user',
            title: 'New User Registration',
            message: 'A new user has registered: John Doe (johndoe)',
            severity: 'info',
            isRead: false,
            isEmailSent: true,
            emailRecipient: 'admin@example.com',
            createdAt: new Date().toISOString(),
            relatedEntityType: 'user',
            relatedEntityId: 1,
            metadata: {
              username: 'johndoe',
              name: 'John Doe',
              registeredAt: new Date().toISOString()
            }
          },
          {
            id: 2,
            type: 'system_error',
            title: 'System Error: API Integration',
            message: 'Failed to connect to external API',
            severity: 'error',
            isRead: false,
            isEmailSent: true,
            emailRecipient: 'admin@example.com',
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            relatedEntityType: null,
            relatedEntityId: null,
            metadata: {
              errorName: 'ConnectionError',
              errorStack: 'Error: Failed to connect to API endpoint...',
              context: 'API Integration',
              timestamp: new Date(Date.now() - 86400000).toISOString()
            }
          }
        ] as SystemNotification[];
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    }
  });

  // Calculate counts based on notifications
  const counts = useMemo(() => {
    if (!notifications) return { total: 0, unread: 0 };
    
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return {
      total: notifications.length,
      unread: unreadCount
    };
  }, [notifications]);

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      // Mock the API call for now
      console.log(`Marking notification ${id} as read`);
      return { success: true };
    },
    onSuccess: () => {
      // Update the notifications state manually since we're using mock data
      refetch();
      
      toast({
        title: 'Notification marked as read',
        description: 'The notification has been marked as read',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark notification as read',
        variant: 'destructive',
      });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      // Mock the API call for now
      console.log(`Deleting notification ${id}`);
      return { success: true };
    },
    onSuccess: () => {
      // Update the notifications state manually since we're using mock data
      refetch();
      
      toast({
        title: 'Notification deleted',
        description: 'The notification has been removed',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete notification',
        variant: 'destructive',
      });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      // Mock the API call for now
      console.log('Marking all notifications as read');
      return { success: true, count: 2 };
    },
    onSuccess: () => {
      // Update the notifications state manually since we're using mock data
      refetch();
      
      toast({
        title: 'All notifications marked as read',
        description: 'All notifications have been marked as read',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    },
  });

  // Helper function to filter notifications based on active tab
  const getFilteredNotifications = () => {
    if (!notifications) return [];
    
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'errors':
        return notifications.filter(n => n.severity === 'error' || n.severity === 'critical');
      case 'users':
        return notifications.filter(n => n.type === 'new_user');
      case 'system':
        return notifications.filter(n => n.type === 'system_error');
      default:
        return notifications;
    }
  };

  // Helper function to get an icon based on notification type and severity
  const getNotificationIcon = (notification: SystemNotification) => {
    if (notification.type === 'new_user') {
      return <CircleCheck className="h-5 w-5 text-green-500" />;
    }
    
    switch (notification.severity) {
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-700" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Unknown time';
    }
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Notifications</h1>
          <p className="text-muted-foreground">
            View and manage system notifications and alerts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={() => refetch()} size="sm" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {counts && counts.unread && counts.unread > 0 && (
            <Button onClick={() => markAllReadMutation.mutate()} size="sm">
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="all">
            All
            {counts && (
              <Badge variant="outline" className="ml-2">
                {counts.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {counts && counts.unread && counts.unread > 0 && (
              <Badge variant="outline" className="ml-2">
                {counts.unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="mb-4">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))
        ) : filteredNotifications.length === 0 ? (
          // Empty state
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CircleOff className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">No notifications found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                {activeTab === 'all'
                  ? 'You don\'t have any notifications yet.'
                  : `You don't have any ${activeTab} notifications.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          // Notification list
          filteredNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={
                notification.isRead 
                  ? "mb-4 opacity-75" 
                  : "mb-4 border-l-4 border-l-primary"
              }
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    {getNotificationIcon(notification)}
                    <CardTitle className="ml-2">{notification.title}</CardTitle>
                    
                    {/* Badges for notification status */}
                    <div className="flex ml-4 space-x-2">
                      {notification.isEmailSent && (
                        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                          <MailCheck className="mr-1 h-3 w-3" />
                          Email Sent
                        </Badge>
                      )}
                      
                      {notification.severity === 'error' && (
                        <Badge variant="outline" className="bg-red-50 border-red-200 text-red-600">
                          Error
                        </Badge>
                      )}
                      
                      {notification.severity === 'critical' && (
                        <Badge variant="outline" className="bg-red-100 border-red-300 text-red-700">
                          Critical
                        </Badge>
                      )}
                      
                      {notification.type === 'new_user' && (
                        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                          New User
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(notification.createdAt)}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!notification.isRead && (
                          <DropdownMenuItem onClick={() => markAsReadMutation.mutate(notification.id)}>
                            Mark as read
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {notification.emailRecipient && (
                  <CardDescription>
                    Email sent to: {notification.emailRecipient}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p>{notification.message}</p>
                
                {/* Show metadata if available */}
                {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-48">
                      <pre>{JSON.stringify(notification.metadata, null, 2)}</pre>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="pt-1">
                {notification.relatedEntityType && notification.relatedEntityId && (
                  <div className="text-sm text-muted-foreground">
                    Related to {notification.relatedEntityType}: #{notification.relatedEntityId}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SystemNotifications;