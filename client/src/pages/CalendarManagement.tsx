import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  Loader2, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  Plus, 
  Edit, 
  Trash, 
  RefreshCw,
  User,
  Clock,
  MapPin,
  CheckCircle,
  ArrowUpDown
} from "lucide-react";
import AuthHeader from '@/components/auth/AuthHeader';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

// Form schema for calendar events
const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
  status: z.string().default("confirmed"),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  ownerId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  url: z.string().optional(),
  
  // Convert multiple reminders from UI to JSON format
  reminders: z.array(z.object({
    time: z.number(),
    unit: z.enum(["minutes", "hours", "days", "weeks"])
  })).optional().default([]),
  
  // Recurring event fields
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceInterval: z.number().min(1).optional().default(1),
  recurrenceDaysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  recurrenceEndDate: z.date().optional(),
  recurrenceEndAfterOccurrences: z.number().optional(),
  recurrenceExceptions: z.array(z.date()).optional().default([]),
});

type EventFormData = z.infer<typeof eventSchema>;

const CalendarManagement: React.FC = () => {
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showAllDay, setShowAllDay] = useState(true);
  const [showConfirmed, setShowConfirmed] = useState(true);
  const [showTentative, setShowTentative] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Events query
  const {
    data: events,
    isLoading: isEventsLoading,
    error: eventsError,
    refetch: refetchEvents
  } = useQuery({
    queryKey: ['/api/calendar/events'],
    refetchOnWindowFocus: false,
  });

  // Get the filtered events for the current view
  const getFilteredEvents = () => {
    if (!events || !Array.isArray(events) || events.length === 0) return [];
    
    let filtered = [...events];
    
    // Filter by date if selected
    if (date) {
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      
      filtered = filtered.filter((event: any) => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        // Show events that overlap with selected date
        return (eventStart <= endOfDay && eventEnd >= startOfDay);
      });
    }
    
    // Filter by all-day flag
    if (!showAllDay) {
      filtered = filtered.filter((event: any) => !event.allDay);
    }
    
    // Filter by status
    const statusFilters: string[] = [];
    if (showConfirmed) statusFilters.push('confirmed');
    if (showTentative) statusFilters.push('tentative');
    if (showCancelled) statusFilters.push('cancelled');
    
    filtered = filtered.filter((event: any) => 
      statusFilters.includes(event.status)
    );
    
    // Sort by start date
    filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    return filtered;
  };

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      // Convert date objects to ISO strings for API compatibility
      const formattedData = {
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString()
      };
      
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create event');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Event Created',
        description: 'Calendar event has been created successfully.',
        variant: 'default',
      });
      setIsCreateModalOpen(false);
      refetchEvents();
      createEventForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EventFormData }) => {
      // Convert date objects to ISO strings for API compatibility
      const formattedData = {
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString()
      };
      
      const response = await fetch(`/api/calendar/events/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update event');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Event Updated',
        description: 'Calendar event has been updated successfully.',
        variant: 'default',
      });
      setIsEditModalOpen(false);
      refetchEvents();
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/calendar/events/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete event');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Event Deleted',
        description: 'Calendar event has been deleted successfully.',
        variant: 'default',
      });
      setIsDeleteModalOpen(false);
      refetchEvents();
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Deletion Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Forms
  const createEventForm = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(new Date().setHours(new Date().getHours() + 1)),
      allDay: false,
      location: '',
      status: 'confirmed',
      reminders: [],
      isRecurring: false,
      recurrenceInterval: 1,
      recurrenceDaysOfWeek: []
    },
  });

  const editEventForm = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(),
      allDay: false,
      location: '',
      status: 'confirmed',
      reminders: [],
      isRecurring: false,
      recurrenceInterval: 1,
      recurrenceDaysOfWeek: []
    },
  });

  // Form submissions
  const onCreateEvent: SubmitHandler<EventFormData> = (data) => {
    createEventMutation.mutate(data);
  };

  const onUpdateEvent: SubmitHandler<EventFormData> = (data) => {
    if (selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, data });
    }
  };

  // Handle edit button click
  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    
    // Parse reminders from DB format to UI format
    let parsedReminders = [];
    if (event.reminders && typeof event.reminders === 'object') {
      // Use the new format where reminders is an array of objects
      parsedReminders = event.reminders;
    } else if (event.reminderMinutes) {
      // Support legacy format where reminderMinutes is a number
      parsedReminders = [{ time: event.reminderMinutes, unit: 'minutes' }];
    }
    
    // Parse recurrence exceptions
    let recurrenceExceptions = [];
    if (event.recurrenceExceptions && Array.isArray(event.recurrenceExceptions)) {
      recurrenceExceptions = event.recurrenceExceptions.map((date: string) => new Date(date));
    }
    
    // Parse recurrence days of week
    let recurrenceDaysOfWeek = [];
    if (event.recurrenceDaysOfWeek && Array.isArray(event.recurrenceDaysOfWeek)) {
      recurrenceDaysOfWeek = event.recurrenceDaysOfWeek;
    }
    
    editEventForm.reset({
      title: event.title,
      description: event.description || '',
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      allDay: event.allDay || false,
      location: event.location || '',
      status: event.status || 'confirmed',
      relatedEntityType: event.relatedEntityType || '',
      relatedEntityId: event.relatedEntityId?.toString() || '',
      ownerId: event.ownerId?.toString() || '',
      url: event.url || '',
      
      // Set the recurring event fields
      reminders: parsedReminders,
      isRecurring: event.isRecurring || false,
      recurrencePattern: event.recurrencePattern || undefined,
      recurrenceInterval: event.recurrenceInterval || 1,
      recurrenceDaysOfWeek: recurrenceDaysOfWeek,
      recurrenceEndDate: event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : undefined,
      recurrenceEndAfterOccurrences: event.recurrenceEndAfterOccurrences || undefined,
      recurrenceExceptions: recurrenceExceptions,
    });
    
    setIsEditModalOpen(true);
  };

  // Handle delete button click
  const handleDeleteEvent = (event: any) => {
    setSelectedEvent(event);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete action
  const confirmDelete = () => {
    if (selectedEvent) {
      deleteEventMutation.mutate(selectedEvent.id);
    }
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Format date and time for display
  const formatDateTime = (dateString: string, allDay = false) => {
    const date = new Date(dateString);
    return allDay ? 
      format(date, 'MMM d, yyyy') : 
      format(date, 'MMM d, yyyy h:mm a');
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500 hover:bg-green-600">Confirmed</Badge>;
      case 'tentative':
        return <Badge variant="outline">Tentative</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredEvents = getFilteredEvents();

  // Get user data for the header
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Get notifications for the header
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      // Default empty array if API not available
      return [];
    }
  });

  // Get recent campaigns for sidebar
  const { data: recentCampaigns = [] } = useQuery({
    queryKey: ['/api/campaigns/recent'],
    queryFn: async () => {
      // Default empty array if API not available
      return [];
    }
  });

  // Handle logout
  const handleLogout = () => {
    // Clear token and redirect to login
    localStorage.removeItem('auth_token');
    window.location.href = '/auth';
  };

  return (
    <div className="bg-slate-50 text-slate-800 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <AuthHeader 
        user={userData?.user || { id: 1, name: "User", initials: "U" }} 
        notifications={notifications} 
        onLogout={handleLogout} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar recentCampaigns={recentCampaigns} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4">
          <div className="container mx-auto py-4">
            <h1 className="text-3xl font-bold mb-6">Calendar Management</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calendar Sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="mr-2" size={20} />
                Calendar
              </CardTitle>
              <CardDescription>
                Select a date to view events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border mb-4"
              />
              
              <div className="space-y-4">
                <h3 className="font-medium">Filters</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-all-day"
                      checked={showAllDay}
                      onCheckedChange={(checked) => setShowAllDay(!!checked)}
                    />
                    <label
                      htmlFor="show-all-day"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Show all-day events
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-confirmed"
                      checked={showConfirmed}
                      onCheckedChange={(checked) => setShowConfirmed(!!checked)}
                    />
                    <label
                      htmlFor="show-confirmed"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Show confirmed events
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-tentative"
                      checked={showTentative}
                      onCheckedChange={(checked) => setShowTentative(!!checked)}
                    />
                    <label
                      htmlFor="show-tentative"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Show tentative events
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-cancelled"
                      checked={showCancelled}
                      onCheckedChange={(checked) => setShowCancelled(!!checked)}
                    />
                    <label
                      htmlFor="show-cancelled"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Show cancelled events
                    </label>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <Button
                className="w-full"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Event
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Events List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {date ? format(date, 'MMMM d, yyyy') : 'All Events'}
                  </CardTitle>
                  <CardDescription>
                    {filteredEvents.length} events {date ? 'on selected date' : 'in total'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleSortDirection}
                  >
                    <ArrowUpDown className="h-4 w-4 mr-1" />
                    {sortDirection === 'asc' ? 'Earliest First' : 'Latest First'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => refetchEvents()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isEventsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading events...</span>
                </div>
              ) : eventsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load calendar events. Please try again.
                  </AlertDescription>
                </Alert>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Events Found</h3>
                  <p className="text-muted-foreground">
                    {date ? `No events scheduled for ${format(date, 'MMMM d, yyyy')}` : 'No events match your filter criteria'}
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Event
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event: any) => (
                    <Card key={event.id} className="overflow-hidden">
                      <div className={`h-2 ${
                        event.status === 'confirmed' ? 'bg-green-500' : 
                        event.status === 'tentative' ? 'bg-amber-500' : 
                        'bg-red-500'
                      }`} />
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium">{event.title}</h3>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>
                                {formatDateTime(event.startDate, event.allDay)}
                                {event.allDay ? ' (All day)' : ` - ${formatDateTime(event.endDate)}`}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center text-sm text-muted-foreground mt-1">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{event.location}</span>
                              </div>
                            )}
                            {event.ownerId && (
                              <div className="flex items-center text-sm text-muted-foreground mt-1">
                                <User className="h-4 w-4 mr-1" />
                                <span>Owner ID: {event.ownerId}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(event.status)}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEvent(event)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEvent(event)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {event.description && (
                          <div className="mt-2 text-sm">
                            {event.description}
                          </div>
                        )}
                        
                        {/* Show recurring event indicator */}
                        {event.isRecurring && (
                          <div className="mt-2">
                            <Badge className="bg-primary">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {event.recurrencePattern === "daily" && `Every ${event.recurrenceInterval > 1 ? event.recurrenceInterval : ''} day${event.recurrenceInterval > 1 ? 's' : ''}`}
                              {event.recurrencePattern === "weekly" && `Every ${event.recurrenceInterval > 1 ? event.recurrenceInterval : ''} week${event.recurrenceInterval > 1 ? 's' : ''}`}
                              {event.recurrencePattern === "monthly" && `Every ${event.recurrenceInterval > 1 ? event.recurrenceInterval : ''} month${event.recurrenceInterval > 1 ? 's' : ''}`}
                              {event.recurrencePattern === "yearly" && `Every ${event.recurrenceInterval > 1 ? event.recurrenceInterval : ''} year${event.recurrenceInterval > 1 ? 's' : ''}`}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Show reminders */}
                        {event.reminders && event.reminders.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {event.reminders.map((reminder: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {reminder.time} {reminder.unit} before
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {event.relatedEntityType && (
                          <div className="mt-2">
                            <Badge variant="outline">
                              Related to: {event.relatedEntityType} #{event.relatedEntityId}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Event Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Add a new event to your calendar
            </DialogDescription>
          </DialogHeader>
          <Form {...createEventForm}>
            <form onSubmit={createEventForm.handleSubmit(onCreateEvent)} className="space-y-4">
              <FormField
                control={createEventForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Meeting with client" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createEventForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Discuss project requirements" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createEventForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full flex justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP p")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={format(field.value, "HH:mm")}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                const newDate = new Date(field.value);
                                newDate.setHours(parseInt(hours, 10));
                                newDate.setMinutes(parseInt(minutes, 10));
                                field.onChange(newDate);
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createEventForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full flex justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP p")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={format(field.value, "HH:mm")}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                const newDate = new Date(field.value);
                                newDate.setHours(parseInt(hours, 10));
                                newDate.setMinutes(parseInt(minutes, 10));
                                field.onChange(newDate);
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createEventForm.control}
                  name="allDay"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>All day event</FormLabel>
                        <FormDescription>
                          This event will take the entire day
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={createEventForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        defaultValue={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="tentative">Tentative</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={createEventForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Office or virtual meeting link" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Recurring Event Options */}
              <div className="space-y-4 mt-6">
                <div className="flex items-center space-x-2">
                  <FormField
                    control={createEventForm.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Recurring event</FormLabel>
                          <FormDescription>
                            Make this a repeating event
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                {createEventForm.watch("isRecurring") && (
                  <div className="space-y-4 border p-4 rounded-md">
                    <FormField
                      control={createEventForm.control}
                      name="recurrencePattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurrence pattern</FormLabel>
                          <Select 
                            defaultValue={field.value} 
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recurrence pattern" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createEventForm.control}
                      name="recurrenceInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repeat every</FormLabel>
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                max={99} 
                                {...field} 
                                value={field.value || 1}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                className="w-16"
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">
                              {createEventForm.watch("recurrencePattern") === "daily" && "days"}
                              {createEventForm.watch("recurrencePattern") === "weekly" && "weeks"}
                              {createEventForm.watch("recurrencePattern") === "monthly" && "months"}
                              {createEventForm.watch("recurrencePattern") === "yearly" && "years"}
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Weekday selection for weekly recurrence */}
                    {createEventForm.watch("recurrencePattern") === "weekly" && (
                      <FormField
                        control={createEventForm.control}
                        name="recurrenceDaysOfWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Repeat on</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, index) => (
                                <Badge 
                                  key={index} 
                                  variant={field.value?.includes(index) ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    const current = field.value || [];
                                    const newValue = current.includes(index)
                                      ? current.filter(d => d !== index)
                                      : [...current, index];
                                    field.onChange(newValue);
                                  }}
                                >
                                  {day}
                                </Badge>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* End recurrence options */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">End recurrence</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="never-end" 
                            name="recurrence-end" 
                            checked={!createEventForm.watch("recurrenceEndDate") && !createEventForm.watch("recurrenceEndAfterOccurrences")}
                            onChange={() => {
                              createEventForm.setValue("recurrenceEndDate", undefined);
                              createEventForm.setValue("recurrenceEndAfterOccurrences", undefined);
                            }}
                            className="h-4 w-4"
                          />
                          <label htmlFor="never-end" className="text-sm">Never end</label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="end-after" 
                            name="recurrence-end" 
                            checked={!!createEventForm.watch("recurrenceEndAfterOccurrences")}
                            onChange={() => {
                              createEventForm.setValue("recurrenceEndAfterOccurrences", 10);
                              createEventForm.setValue("recurrenceEndDate", undefined);
                            }}
                            className="h-4 w-4"
                          />
                          <label htmlFor="end-after" className="text-sm">End after</label>
                          <Input 
                            type="number" 
                            min={1} 
                            max={999} 
                            value={createEventForm.watch("recurrenceEndAfterOccurrences") || 10}
                            onChange={(e) => createEventForm.setValue("recurrenceEndAfterOccurrences", parseInt(e.target.value))}
                            disabled={!createEventForm.watch("recurrenceEndAfterOccurrences")}
                            className="w-16"
                          />
                          <span className="text-sm text-muted-foreground">occurrences</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="end-on-date" 
                            name="recurrence-end" 
                            checked={!!createEventForm.watch("recurrenceEndDate")}
                            onChange={() => {
                              const nextMonth = new Date();
                              nextMonth.setMonth(nextMonth.getMonth() + 1);
                              createEventForm.setValue("recurrenceEndDate", nextMonth);
                              createEventForm.setValue("recurrenceEndAfterOccurrences", undefined);
                            }}
                            className="h-4 w-4"
                          />
                          <label htmlFor="end-on-date" className="text-sm">End by</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-[200px] pl-3 text-left font-normal ${!createEventForm.watch("recurrenceEndDate") && "text-muted-foreground"}`}
                                disabled={!createEventForm.watch("recurrenceEndDate")}
                              >
                                {createEventForm.watch("recurrenceEndDate") ? (
                                  format(createEventForm.watch("recurrenceEndDate") as Date, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={createEventForm.watch("recurrenceEndDate") as Date | undefined}
                                onSelect={(date) => date && createEventForm.setValue("recurrenceEndDate", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Reminders Section */}
              <div className="space-y-4 mt-6">
                <h3 className="text-sm font-medium">Reminders</h3>
                <div className="space-y-2">
                  {createEventForm.watch("reminders")?.map((reminder, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input 
                        type="number" 
                        min={1} 
                        value={reminder.time}
                        onChange={(e) => {
                          const reminders = [...createEventForm.watch("reminders")];
                          reminders[index] = { ...reminders[index], time: parseInt(e.target.value) || 1 };
                          createEventForm.setValue("reminders", reminders);
                        }}
                        className="w-16"
                      />
                      <Select 
                        value={reminder.unit}
                        onValueChange={(value) => {
                          const reminders = [...createEventForm.watch("reminders")];
                          reminders[index] = { ...reminders[index], unit: value as "minutes" | "hours" | "days" | "weeks" };
                          createEventForm.setValue("reminders", reminders);
                        }}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>before</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          const reminders = createEventForm.watch("reminders").filter((_, i) => i !== index);
                          createEventForm.setValue("reminders", reminders);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentReminders = createEventForm.watch("reminders") || [];
                      createEventForm.setValue("reminders", [
                        ...currentReminders, 
                        { time: 15, unit: "minutes" }
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add reminder
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createEventForm.control}
                  name="relatedEntityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Entity Type</FormLabel>
                      <Select 
                        defaultValue={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select related type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="campaign">Campaign</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createEventForm.control}
                  name="relatedEntityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Entity ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ID number" 
                          disabled={!createEventForm.watch('relatedEntityType')}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={createEventForm.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner ID</FormLabel>
                    <FormControl>
                      <Input placeholder="ID of the event owner" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createEventMutation.isPending}
                >
                  {createEventMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : "Create Event"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Modify the details of this calendar event
            </DialogDescription>
          </DialogHeader>
          <Form {...editEventForm}>
            <form onSubmit={editEventForm.handleSubmit(onUpdateEvent)} className="space-y-4">
              {/* Same form fields as create form */}
              <FormField
                control={editEventForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Meeting with client" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editEventForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Discuss project requirements" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editEventForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full flex justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP p")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={format(field.value, "HH:mm")}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                const newDate = new Date(field.value);
                                newDate.setHours(parseInt(hours, 10));
                                newDate.setMinutes(parseInt(minutes, 10));
                                field.onChange(newDate);
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editEventForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full flex justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP p")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={format(field.value, "HH:mm")}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                const newDate = new Date(field.value);
                                newDate.setHours(parseInt(hours, 10));
                                newDate.setMinutes(parseInt(minutes, 10));
                                field.onChange(newDate);
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editEventForm.control}
                  name="allDay"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>All day event</FormLabel>
                        <FormDescription>
                          This event will take the entire day
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editEventForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        defaultValue={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="tentative">Tentative</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editEventForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Office or virtual meeting link" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editEventForm.control}
                  name="relatedEntityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Entity Type</FormLabel>
                      <Select 
                        defaultValue={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select related type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="campaign">Campaign</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editEventForm.control}
                  name="relatedEntityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Entity ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ID number" 
                          disabled={!editEventForm.watch('relatedEntityType')}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Recurring Event Options */}
              <div className="space-y-4 mt-6">
                <div className="flex items-center space-x-2">
                  <FormField
                    control={editEventForm.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Recurring event</FormLabel>
                          <FormDescription>
                            Make this a repeating event
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                {editEventForm.watch("isRecurring") && (
                  <div className="space-y-4 border p-4 rounded-md">
                    <FormField
                      control={editEventForm.control}
                      name="recurrencePattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurrence pattern</FormLabel>
                          <Select 
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recurrence pattern" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editEventForm.control}
                      name="recurrenceInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repeat every</FormLabel>
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                max={99} 
                                {...field} 
                                value={field.value || 1}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                className="w-16"
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">
                              {editEventForm.watch("recurrencePattern") === "daily" && "days"}
                              {editEventForm.watch("recurrencePattern") === "weekly" && "weeks"}
                              {editEventForm.watch("recurrencePattern") === "monthly" && "months"}
                              {editEventForm.watch("recurrencePattern") === "yearly" && "years"}
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Weekday selection for weekly recurrence */}
                    {editEventForm.watch("recurrencePattern") === "weekly" && (
                      <FormField
                        control={editEventForm.control}
                        name="recurrenceDaysOfWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Repeat on</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, index) => (
                                <Badge 
                                  key={index} 
                                  variant={field.value?.includes(index) ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    const current = field.value || [];
                                    const newValue = current.includes(index)
                                      ? current.filter(d => d !== index)
                                      : [...current, index];
                                    field.onChange(newValue);
                                  }}
                                >
                                  {day}
                                </Badge>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {/* End recurrence options */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">End recurrence</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="edit-never-end" 
                            name="edit-recurrence-end" 
                            checked={!editEventForm.watch("recurrenceEndDate") && !editEventForm.watch("recurrenceEndAfterOccurrences")}
                            onChange={() => {
                              editEventForm.setValue("recurrenceEndDate", undefined);
                              editEventForm.setValue("recurrenceEndAfterOccurrences", undefined);
                            }}
                            className="h-4 w-4"
                          />
                          <label htmlFor="edit-never-end" className="text-sm">Never end</label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="edit-end-after" 
                            name="edit-recurrence-end" 
                            checked={!!editEventForm.watch("recurrenceEndAfterOccurrences")}
                            onChange={() => {
                              editEventForm.setValue("recurrenceEndAfterOccurrences", 10);
                              editEventForm.setValue("recurrenceEndDate", undefined);
                            }}
                            className="h-4 w-4"
                          />
                          <label htmlFor="edit-end-after" className="text-sm">End after</label>
                          <Input 
                            type="number" 
                            min={1} 
                            max={999} 
                            value={editEventForm.watch("recurrenceEndAfterOccurrences") || 10}
                            onChange={(e) => editEventForm.setValue("recurrenceEndAfterOccurrences", parseInt(e.target.value))}
                            disabled={!editEventForm.watch("recurrenceEndAfterOccurrences")}
                            className="w-16"
                          />
                          <span className="text-sm text-muted-foreground">occurrences</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="edit-end-on-date" 
                            name="edit-recurrence-end" 
                            checked={!!editEventForm.watch("recurrenceEndDate")}
                            onChange={() => {
                              const nextMonth = new Date();
                              nextMonth.setMonth(nextMonth.getMonth() + 1);
                              editEventForm.setValue("recurrenceEndDate", nextMonth);
                              editEventForm.setValue("recurrenceEndAfterOccurrences", undefined);
                            }}
                            className="h-4 w-4"
                          />
                          <label htmlFor="edit-end-on-date" className="text-sm">End by</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-[200px] pl-3 text-left font-normal ${!editEventForm.watch("recurrenceEndDate") && "text-muted-foreground"}`}
                                disabled={!editEventForm.watch("recurrenceEndDate")}
                              >
                                {editEventForm.watch("recurrenceEndDate") ? (
                                  format(editEventForm.watch("recurrenceEndDate") as Date, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editEventForm.watch("recurrenceEndDate") as Date | undefined}
                                onSelect={(date) => date && editEventForm.setValue("recurrenceEndDate", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Reminders Section */}
              <div className="space-y-4 mt-6">
                <h3 className="text-sm font-medium">Reminders</h3>
                <div className="space-y-2">
                  {editEventForm.watch("reminders")?.map((reminder, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input 
                        type="number" 
                        min={1} 
                        value={reminder.time}
                        onChange={(e) => {
                          const reminders = [...editEventForm.watch("reminders")];
                          reminders[index] = { ...reminders[index], time: parseInt(e.target.value) || 1 };
                          editEventForm.setValue("reminders", reminders);
                        }}
                        className="w-16"
                      />
                      <Select 
                        value={reminder.unit}
                        onValueChange={(value) => {
                          const reminders = [...editEventForm.watch("reminders")];
                          reminders[index] = { ...reminders[index], unit: value as "minutes" | "hours" | "days" | "weeks" };
                          editEventForm.setValue("reminders", reminders);
                        }}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>before</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          const reminders = editEventForm.watch("reminders").filter((_, i) => i !== index);
                          editEventForm.setValue("reminders", reminders);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentReminders = editEventForm.watch("reminders") || [];
                      editEventForm.setValue("reminders", [
                        ...currentReminders, 
                        { time: 15, unit: "minutes" }
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add reminder
                  </Button>
                </div>
              </div>
              
              <FormField
                control={editEventForm.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner ID</FormLabel>
                    <FormControl>
                      <Input placeholder="ID of the event owner" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateEventMutation.isPending}
                >
                  {updateEventMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : "Update Event"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedEvent && (
              <div className="space-y-2">
                <p><strong>Title:</strong> {selectedEvent.title}</p>
                <p><strong>Date:</strong> {formatDateTime(selectedEvent.startDate, selectedEvent.allDay)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteEventMutation.isPending}
            >
              {deleteEventMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CalendarManagement;