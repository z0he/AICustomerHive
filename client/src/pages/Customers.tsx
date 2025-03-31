import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Components
import AuthHeader from "@/components/auth/AuthHeader";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Building, 
  FileText, 
  ChevronRight,
  Calendar,
  Clock,
  Filter,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form utilities
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Types
import { Customer, CustomerActivity } from "@shared/schema";

// Form schemas
const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  company: z.string().optional(),
  status: z.string().default("active")
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

// Customer card component
const CustomerCard = ({ customer }: { customer: Customer }) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="bg-slate-50 p-4 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 bg-primary-100 text-primary-700">
            <AvatarFallback>{customer.initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">{customer.name}</CardTitle>
            <p className="text-xs text-slate-500">{customer.email}</p>
          </div>
        </div>
        <Badge variant={customer.status === "active" ? "default" : "secondary"}>
          {customer.status === "active" ? "Active" : "Inactive"}
        </Badge>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center space-x-2 text-slate-600">
              <Phone size={14} />
              <span>{customer.phone}</span>
            </div>
            {customer.company && (
              <div className="flex items-center space-x-2 text-slate-600">
                <Building size={14} />
                <span>{customer.company}</span>
              </div>
            )}
            <div className="flex items-center space-x-2 text-slate-600">
              <Calendar size={14} />
              <span>Customer since {new Date(customer.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" className="flex items-center space-x-1">
              <span>View Details</span>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Customer activity table component
const CustomerActivityTable = ({ activities }: { activities: CustomerActivity[] }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Customer</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {"NA"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">Customer #{activity.customerId}</p>
                    <p className="text-xs text-slate-500">Action ID: {activity.id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{activity.action}</TableCell>
              <TableCell>{activity.campaign}</TableCell>
              <TableCell className="text-right text-sm text-slate-500">
                {activity.date}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// Main component
const Customers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("grid");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Customer form
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      status: "active"
    }
  });
  
  // Fetch data
  const { data: userData } = useQuery({
    queryKey: ['/api/user/current'],
    staleTime: 300000 // 5 minutes
  });
  
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    staleTime: 300000 // 5 minutes
  });
  
  const { data: recentCampaigns } = useQuery({
    queryKey: ['/api/campaigns/recent'],
    staleTime: 300000 // 5 minutes
  });
  
  const { data: customers, isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch customers');
      }
      
      return await res.json();
    }
  });
  
  const { data: activities, isLoading: isLoadingActivities } = useQuery<CustomerActivity[]>({
    queryKey: ['/api/customers/activity'],
    queryFn: async () => {
      const res = await fetch('/api/customers/activity', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch customer activity');
      }
      
      return await res.json();
    }
  });
  
  // Customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerFormValues) => {
      return await apiRequest('POST', '/api/customers', customerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['/api/customers']});
      toast({
        title: "Customer added",
        description: "New customer has been added successfully",
      });
      closeAddCustomerDialog();
      form.reset();
    },
  });
  
  // Filter customers based on search and status
  const filteredCustomers = customers?.filter(customer => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = customer.name.toLowerCase().includes(query);
      const matchesEmail = customer.email.toLowerCase().includes(query);
      const matchesCompany = customer.company ? customer.company.toLowerCase().includes(query) : false;
      
      if (!matchesName && !matchesEmail && !matchesCompany) {
        return false;
      }
    }
    
    // Apply status filter
    if (statusFilter !== "all" && customer.status !== statusFilter) {
      return false;
    }
    
    return true;
  });
  
  // Form submit handler
  const onSubmit = (data: CustomerFormValues) => {
    createCustomerMutation.mutate(data);
  };
  
  // Dialog handlers
  const openAddCustomerDialog = () => setIsAddCustomerOpen(true);
  const closeAddCustomerDialog = () => setIsAddCustomerOpen(false);
  
  // Logout handler
  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    window.location.href = '/';
  };
  
  return (
    <div className="bg-slate-50 text-slate-800 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <AuthHeader 
        user={userData || { id: 1, name: "John Doe", initials: "JD" }} 
        notifications={notifications || []} 
        onLogout={handleLogout} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar recentCampaigns={recentCampaigns || []} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
                <p className="text-slate-500 mt-1">Manage your customer database</p>
              </div>
              <Button 
                onClick={openAddCustomerDialog}
                className="flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Add Customer</span>
              </Button>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex space-x-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <div className="flex items-center">
                      <Filter size={14} className="mr-2" />
                      <span>Status</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* View Selector */}
            <div className="mb-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="grid">Grid View</TabsTrigger>
                  <TabsTrigger value="activity">Activity View</TabsTrigger>
                </TabsList>
                
                {/* Customer Grid View */}
                <TabsContent value="grid" className="mt-0">
                  {isLoadingCustomers ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                      {[1, 2, 3, 4, 5, 6].map((_, idx) => (
                        <Card key={idx} className="h-[200px] animate-pulse">
                          <CardHeader className="bg-slate-100 p-4 h-[70px]" />
                          <CardContent className="p-4 space-y-3">
                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                            <div className="h-4 bg-slate-100 rounded w-1/2" />
                            <div className="h-6 bg-slate-100 rounded w-full" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredCustomers && filteredCustomers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                      {filteredCustomers.map((customer) => (
                        <CustomerCard key={customer.id} customer={customer} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-slate-300" />
                      <h3 className="mt-3 text-lg font-medium text-slate-800">No customers found</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {searchQuery || statusFilter !== "all" 
                          ? "Try changing your search or filters" 
                          : "Get started by adding your first customer"}
                      </p>
                      <Button 
                        onClick={openAddCustomerDialog}
                        className="mt-4"
                      >
                        Add Customer
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                {/* Customer Activity View */}
                <TabsContent value="activity" className="mt-0">
                  {isLoadingActivities ? (
                    <div className="rounded-md border">
                      <div className="p-4 space-y-3">
                        {[1, 2, 3, 4, 5].map((_, idx) => (
                          <div key={idx} className="h-12 bg-slate-100 rounded animate-pulse" />
                        ))}
                      </div>
                    </div>
                  ) : activities && activities.length > 0 ? (
                    <CustomerActivityTable activities={activities} />
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="mx-auto h-12 w-12 text-slate-300" />
                      <h3 className="mt-3 text-lg font-medium text-slate-800">No activity found</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Customer activity will appear here as your customers interact with your campaigns.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
      
      {/* Add Customer Dialog */}
      <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg">
              <Users className="text-primary-500 mr-2" size={20} />
              <span>Add New Customer</span>
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-4" 
              onClick={closeAddCustomerDialog}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-3 pt-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeAddCustomerDialog}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCustomerMutation.isPending}
                >
                  {createCustomerMutation.isPending ? "Adding..." : "Add Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;