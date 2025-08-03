import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Components
import AuthHeader from "@/components/auth/AuthHeader";
import Sidebar from "@/components/layout/Sidebar";
import CustomerSegments from "@/components/customers/CustomerSegments";
import CustomerDetails from "@/components/customers/CustomerDetails";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  X,
  Columns,
  Linkedin,
  Globe,
  Settings
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

// Form utilities
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Types
import { Customer, CustomerActivity } from "@shared/schema";

// Types for auth and UI components
interface User {
  id: number;
  name: string;
  initials: string;
}

interface Notification {
  id: number;
  message: string;
  date: string;
  read: boolean;
}

interface RecentCampaign {
  id: number;
  name: string;
  path: string;
}

// Form schemas
const customerFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  contactOwner: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  lifecycleStage: z.string().default("lead"),
  leadStatus: z.string().optional(),
  industry: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  contactSource: z.string().optional(),
  contactType: z.string().optional(),
  linkedinUrl: z.string().optional(),
  legalBasis: z.string().optional(),
  status: z.string().default("active")
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

// Customer card component
const CustomerCard = ({ customer, onViewDetails }: { customer: Customer, onViewDetails: (customer: Customer) => void }) => {
  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" 
      onClick={() => onViewDetails(customer)}
    >
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
              <span>{customer.phone || "No phone"}</span>
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center space-x-1"
              onClick={(e) => {
                e.stopPropagation(); // Prevent the card click event
                onViewDetails(customer);
              }}
            >
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

// Define available columns
interface ColumnOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  width?: number;
}

const availableColumns: ColumnOption[] = [
  { id: "name", label: "Name", width: 3 },
  { id: "email", label: "Email", width: 3 },
  { id: "phone", label: "Phone", width: 2 },
  { id: "company", label: "Company", width: 2 },
  { id: "jobTitle", label: "Job Title", width: 2 },
  { id: "lifecycleStage", label: "Lifecycle Stage", width: 2 },
  { id: "leadStatus", label: "Lead Status", width: 2 },
  { id: "industry", label: "Industry", width: 2 },
  { id: "contactOwner", label: "Contact Owner", width: 2 },
  { id: "country", label: "Country", width: 2 },
  { id: "contactSource", label: "Source", width: 2 },
  { id: "linkedinUrl", label: "LinkedIn", width: 2 },
  { id: "createdAt", label: "Created Date", width: 2 },
];

// Column customization component
const ColumnCustomizer = ({ 
  columns, 
  onColumnsChange 
}: { 
  columns: string[]; 
  onColumnsChange: (columns: string[]) => void;
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Columns size={14} />
          <span>Columns</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium">Customize Columns</h4>
          <p className="text-sm text-slate-500">Select which columns to display in the table.</p>
        </div>
        <ScrollArea className="h-72">
          <div className="p-3 space-y-1">
            {availableColumns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`column-${column.id}`} 
                  checked={columns.includes(column.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onColumnsChange([...columns, column.id]);
                    } else {
                      onColumnsChange(columns.filter(c => c !== column.id));
                    }
                  }}
                />
                <label 
                  htmlFor={`column-${column.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {column.label}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

// Main component
const Customers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState("grid");
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "name", "email", "phone", "company"
  ]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: userData } = useQuery<User>({
    queryKey: ['/api/user/current'],
    staleTime: 300000 // 5 minutes
  });
  
  // Customer form
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      contactOwner: userData?.name || "",
      jobTitle: "",
      phone: "",
      lifecycleStage: "lead",
      leadStatus: "",
      industry: "",
      company: "",
      country: "",
      contactSource: "",
      contactType: "",
      linkedinUrl: "",
      legalBasis: "",
      status: "active"
    }
  });
  
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    staleTime: 300000 // 5 minutes
  });
  
  const { data: recentCampaigns = [] } = useQuery<RecentCampaign[]>({
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
  
  // Customer detail handlers
  const handleViewCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };
  
  const handleUpdateCustomer = (customerData: any) => {
    // TODO: Implement update customer mutation
    toast({
      title: "Update functionality",
      description: "Customer update functionality will be implemented soon"
    });
  };
  
  const handleAddNote = (note: string) => {
    // TODO: Implement add note to customer
    toast({
      title: "Note added",
      description: "Note functionality will be implemented soon"
    });
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
                <ColumnCustomizer 
                  columns={visibleColumns}
                  onColumnsChange={setVisibleColumns}
                />
              </div>
            </div>
            
            {/* View Selector */}
            <div className="mb-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="grid">All Customers</TabsTrigger>
                  <TabsTrigger value="segments">Segments</TabsTrigger>
                  <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                </TabsList>
                
                {/* Customer Grid View */}
                {/* Segments Tab */}
                <TabsContent value="segments" className="mt-0">
                  {isLoadingCustomers ? (
                    <div className="mt-6 rounded-lg border border-slate-200 overflow-hidden">
                      <div className="animate-pulse">
                        <div className="h-10 bg-slate-100"></div>
                        {[1, 2, 3].map((_, idx) => (
                          <div key={idx} className="h-24 border-t border-slate-200 bg-white flex items-center p-4">
                            <div className="space-y-2 flex-1">
                              <div className="h-5 bg-slate-200 rounded w-1/4"></div>
                              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <CustomerSegments customers={customers || []} />
                    </div>
                  )}
                </TabsContent>
                
                {/* Grid Tab */}
                <TabsContent value="grid" className="mt-0">
                  {isLoadingCustomers ? (
                    <div className="mt-6 rounded-lg border border-slate-200 overflow-hidden">
                      <div className="animate-pulse">
                        <div className="h-10 bg-slate-100"></div>
                        {[1, 2, 3, 4, 5].map((_, idx) => (
                          <div key={idx} className="h-16 border-t border-slate-200 bg-white flex items-center px-4">
                            <div className="h-8 w-8 bg-slate-200 rounded-full mr-3"></div>
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                              <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : filteredCustomers && filteredCustomers.length > 0 ? (
                    <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden bg-white">
                      {/* Bulk selection toolbar */}
                      {selectedCustomers.length > 0 && (
                        <div className="bg-primary-50 border-b border-primary-100 px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-primary-700">
                              {selectedCustomers.length} {selectedCustomers.length === 1 ? 'customer' : 'customers'} selected
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs h-8"
                              onClick={() => {
                                toast({
                                  title: "Bulk action",
                                  description: "This would email the selected customers",
                                });
                              }}
                            >
                              <Mail className="h-3.5 w-3.5 mr-1" />
                              Email
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs h-8"
                              onClick={() => {
                                toast({
                                  title: "Bulk action",
                                  description: "This would add selected customers to a campaign",
                                });
                              }}
                            >
                              <Users className="h-3.5 w-3.5 mr-1" />
                              Add to Campaign
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                toast({
                                  title: "Selection cleared",
                                  description: "All customers have been deselected",
                                });
                                setSelectedCustomers([]);
                                setIsAllSelected(false);
                              }}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Clear Selection
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Table header */}
                      <div className="grid grid-cols-12 gap-1 bg-slate-50 px-4 py-3 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <div className="col-span-1 flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-500"
                            checked={isAllSelected}
                            onChange={() => {
                              if (isAllSelected) {
                                setSelectedCustomers([]);
                              } else {
                                setSelectedCustomers(filteredCustomers?.map(c => c.id) || []);
                              }
                              setIsAllSelected(!isAllSelected);
                            }}
                          />
                        </div>
                        {visibleColumns.map(columnId => {
                          const column = availableColumns.find(c => c.id === columnId);
                          return column ? (
                            <div key={column.id} className={`col-span-${column.width || 2}`}>
                              {column.label}
                            </div>
                          ) : null;
                        })}
                        <div className="col-span-1 text-right">Actions</div>
                      </div>
                      
                      {/* Table rows */}
                      <div className="divide-y divide-slate-200">
                        {filteredCustomers.map((customer) => (
                          <div 
                            key={customer.id} 
                            className={`grid grid-cols-12 gap-1 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                              selectedCustomers.includes(customer.id) ? 'bg-primary-50' : ''
                            }`}
                            onClick={(e) => {
                              // Prevent triggering when clicking on checkbox
                              if ((e.target as HTMLElement).tagName !== 'INPUT') {
                                handleViewCustomerDetails(customer);
                              }
                            }}
                          >
                            <div className="col-span-1 flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-500"
                                checked={selectedCustomers.includes(customer.id)}
                                onChange={() => {
                                  if (selectedCustomers.includes(customer.id)) {
                                    setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                                    setIsAllSelected(false);
                                  } else {
                                    setSelectedCustomers([...selectedCustomers, customer.id]);
                                    if (selectedCustomers.length + 1 === filteredCustomers?.length) {
                                      setIsAllSelected(true);
                                    }
                                  }
                                }}
                              />
                              <div className={`w-2 h-2 rounded-full ${customer.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                            </div>
                            
                            {visibleColumns.map(columnId => {
                              const column = availableColumns.find(c => c.id === columnId);
                              if (!column) return null;
                              
                              const width = column.width || 2;
                              
                              switch (columnId) {
                                case 'name':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Avatar className="h-8 w-8 mr-2 bg-primary-100 text-primary-700">
                                        <AvatarFallback>{customer.initials}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="font-medium text-slate-900">{customer.name}</div>
                                        <div className="text-xs text-slate-500">Customer since {new Date(customer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                      </div>
                                    </div>
                                  );
                                case 'email':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Mail className="h-4 w-4 text-slate-400 mr-2" />
                                      <span className="text-slate-600 text-sm">{customer.email}</span>
                                    </div>
                                  );
                                case 'phone':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Phone className="h-4 w-4 text-slate-400 mr-2" />
                                      <span className="text-slate-600 text-sm">{customer.phone}</span>
                                    </div>
                                  );
                                case 'company':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Building className="h-4 w-4 text-slate-400 mr-2" />
                                      <span className="text-slate-600 text-sm">{customer.company || '—'}</span>
                                    </div>
                                  );
                                case 'jobTitle':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <FileText className="h-4 w-4 text-slate-400 mr-2" />
                                      <span className="text-slate-600 text-sm">{customer.jobTitle || '—'}</span>
                                    </div>
                                  );
                                case 'lifecycleStage':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Badge variant="outline" className="capitalize">
                                        {customer.lifecycleStage || 'Not set'}
                                      </Badge>
                                    </div>
                                  );
                                case 'leadStatus':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Badge
                                        variant={customer.leadStatus === 'qualified' ? 'default' : 'secondary'}
                                        className="capitalize"
                                      >
                                        {customer.leadStatus || 'Not set'}
                                      </Badge>
                                    </div>
                                  );
                                case 'industry':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Settings className="h-4 w-4 text-slate-400 mr-2" />
                                      <span className="text-slate-600 text-sm capitalize">{customer.industry || '—'}</span>
                                    </div>
                                  );
                                case 'contactOwner':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Users className="h-4 w-4 text-slate-400 mr-2" />
                                      <span className="text-slate-600 text-sm">{customer.contactOwner || userData?.name || '—'}</span>
                                    </div>
                                  );
                                case 'country':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Globe className="h-4 w-4 text-slate-400 mr-2" />
                                      <span className="text-slate-600 text-sm">{customer.country || '—'}</span>
                                    </div>
                                  );
                                case 'contactSource':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Badge variant="outline" className="capitalize">
                                        {customer.contactSource || 'Not set'}
                                      </Badge>
                                    </div>
                                  );
                                case 'linkedinUrl':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Linkedin className="h-4 w-4 text-slate-400 mr-2" />
                                      {customer.linkedinUrl ? (
                                        <a 
                                          href={customer.linkedinUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-slate-600 text-sm hover:text-primary truncate max-w-[180px]"
                                        >
                                          {customer.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
                                        </a>
                                      ) : (
                                        <span className="text-slate-400 text-sm">—</span>
                                      )}
                                    </div>
                                  );
                                case 'createdAt':
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                                      <span className="text-slate-600 text-sm">
                                        {new Date(customer.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  );
                                default:
                                  return (
                                    <div key={columnId} className={`col-span-${width} flex items-center`}>
                                      <span className="text-slate-600 text-sm">—</span>
                                    </div>
                                  );
                              }
                            })}
                            
                            <div className="col-span-1 flex items-center justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click
                                  handleViewCustomerDetails(customer);
                                }}
                              >
                                <FileText className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => {
                                  toast({
                                    title: "Edit Customer",
                                    description: `Now editing ${customer.name}`,
                                  });
                                }}
                              >
                                <ChevronRight className="h-4 w-4 text-slate-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="zohe@xyxz.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input placeholder="Zohe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Mustafa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="contactOwner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact owner</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={userData?.name || "Zohe Mustafa"}>
                          {userData?.name || "Zohe Mustafa"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job title</FormLabel>
                    <FormControl>
                      <Input placeholder="Marketing Manager" {...field} />
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
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lifecycleStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lifecycle stage</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lifecycle stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="opportunity">Opportunity</SelectItem>
                        <SelectItem value="subscriber">Subscriber</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="leadStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="unqualified">Unqualified</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Industry</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country/Region</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="ca">Canada</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="au">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Source</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social-media">Social Media</SelectItem>
                        <SelectItem value="email">Email Campaign</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Contact</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="linkedinUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn Profile URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="legalBasis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal basis for processing contact's data *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select legal basis" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="consent">Consent</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="legitimate-interest">Legitimate Interest</SelectItem>
                      </SelectContent>
                    </Select>
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
              
              <div className="flex justify-start space-x-3 pt-3 border-t mt-8">
                <Button 
                  type="submit" 
                  className="bg-blue-500 hover:bg-blue-600"
                  disabled={createCustomerMutation.isPending}
                >
                  {createCustomerMutation.isPending ? "Creating..." : "Create"}
                </Button>
                <Button 
                  type="submit" 
                  variant="outline"
                  disabled={createCustomerMutation.isPending}
                >
                  Create and add another
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeAddCustomerDialog}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      {selectedCustomer && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
              <DialogDescription>
                View and manage customer information
              </DialogDescription>
            </DialogHeader>
            
            <CustomerDetails 
              customer={selectedCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onAddNote={handleAddNote}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Customers;