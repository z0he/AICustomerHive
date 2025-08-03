import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

// Icons
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  X, 
  ChevronRight,
  Settings,
  Save,
  Trash2,
  PieChart,
  BarChart3
} from "lucide-react";

// Form utilities
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Types
import { Customer } from "@shared/schema";

// Customer segment interface
interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  filterCriteria: SegmentFilterCriteria[];
  customerCount: number;
  createdAt: Date;
}

// Filter criteria interface
interface SegmentFilterCriteria {
  field: string;
  operator: string;
  value: string;
}

// Form schema for segment creation
const segmentFormSchema = z.object({
  name: z.string().min(1, "Segment name is required"),
  description: z.string().optional(),
  filterCriteria: z.array(
    z.object({
      field: z.string().min(1, "Field is required"),
      operator: z.string().min(1, "Operator is required"),
      value: z.string().min(1, "Value is required")
    })
  ).min(1, "At least one filter criteria is required")
});

type SegmentFormValues = z.infer<typeof segmentFormSchema>;

// Available field options for segmentation
const fieldOptions = [
  { value: "lifecycleStage", label: "Lifecycle Stage" },
  { value: "leadStatus", label: "Lead Status" },
  { value: "contactIndustry", label: "Industry" },
  { value: "contactSource", label: "Source" },
  { value: "contactType", label: "Contact Type" },
  { value: "country", label: "Country" },
  { value: "contactOwner", label: "Contact Owner" }
];

// Operators for different field types
const stringOperators = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
  { value: "empty", label: "Is Empty" },
  { value: "notEmpty", label: "Is Not Empty" },
];

// Get field values based on customers and selected field
const getFieldValues = (customers: Customer[], field: string): {value: string, label: string}[] => {
  if (!customers || customers.length === 0) return [];
  
  // Get unique values for the selected field
  const uniqueValues = new Set();
  
  customers.forEach(customer => {
    const value = customer[field as keyof Customer];
    if (value) uniqueValues.add(value);
  });
  
  return Array.from(uniqueValues).map((value) => ({
    value: value as string,
    label: value as string
  }));
};

// Default values for field select based on field type
const getDefaultValues = (field: string): {value: string, label: string}[] => {
  switch(field) {
    case "lifecycleStage":
      return [
        { value: "lead", label: "Lead" },
        { value: "opportunity", label: "Opportunity" },
        { value: "customer", label: "Customer" },
        { value: "subscriber", label: "Subscriber" }
      ];
    case "leadStatus":
      return [
        { value: "new", label: "New" },
        { value: "open", label: "Open" },
        { value: "in-progress", label: "In Progress" },
        { value: "qualified", label: "Qualified" },
        { value: "unqualified", label: "Unqualified" }
      ];
    default:
      return [];
  }
};

// Filter Rule Component for segment creation
const FilterRule = ({ 
  index,
  customers, 
  onDelete,
  form 
}: { 
  index: number,
  customers: Customer[], 
  onDelete: () => void,
  form: any
}) => {
  const [selectedField, setSelectedField] = useState<string>("lifecycleStage");
  
  // Get field value for current field
  const fieldValues = getFieldValues(customers, selectedField);
  const defaultValues = getDefaultValues(selectedField);
  const valueOptions = fieldValues.length > 0 ? fieldValues : defaultValues;
  
  return (
    <div className="space-y-2 p-4 border rounded-md bg-slate-50 relative">
      <Button 
        type="button" 
        variant="ghost" 
        size="icon" 
        onClick={onDelete}
        className="absolute top-2 right-2 h-8 w-8 text-slate-500 hover:text-red-500"
      >
        <X size={16} />
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Field Selection */}
        <FormField
          control={form.control}
          name={`filterCriteria.${index}.field`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedField(value);
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fieldOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Operator Selection */}
        <FormField
          control={form.control}
          name={`filterCriteria.${index}.operator`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operator</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {stringOperators.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Value Selection or Input */}
        <FormField
          control={form.control}
          name={`filterCriteria.${index}.value`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value</FormLabel>
              {(valueOptions.length > 0 && field.value !== "empty" && field.value !== "notEmpty") ? (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select value" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {valueOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  {...field} 
                  placeholder="Enter value"
                />
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

// Example segments for the UI
const exampleSegments: CustomerSegment[] = [
  {
    id: "segment-1",
    name: "High-Value Customers",
    description: "Customers who are qualified and have opportunity status",
    filterCriteria: [
      { field: "lifecycleStage", operator: "equals", value: "opportunity" },
      { field: "leadStatus", operator: "equals", value: "qualified" }
    ],
    customerCount: 87,
    createdAt: new Date()
  },
  {
    id: "segment-2",
    name: "New Leads This Month",
    description: "Recently added leads from website",
    filterCriteria: [
      { field: "lifecycleStage", operator: "equals", value: "lead" },
      { field: "contactSource", operator: "equals", value: "website" }
    ],
    customerCount: 124,
    createdAt: new Date()
  },
  {
    id: "segment-3",
    name: "Tech Industry Prospects",
    description: "Leads and opportunities from the technology sector",
    filterCriteria: [
      { field: "contactIndustry", operator: "equals", value: "technology" }
    ],
    customerCount: 56,
    createdAt: new Date()
  }
];

// Segment Card Component
const SegmentCard = ({ 
  segment,
  onViewAnalytics,
  onViewCustomers
}: { 
  segment: CustomerSegment,
  onViewAnalytics: (segment: CustomerSegment) => void,
  onViewCustomers: (segment: CustomerSegment) => void
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{segment.name}</CardTitle>
            <CardDescription>{segment.description}</CardDescription>
          </div>
          <Badge variant="outline">{segment.customerCount} contacts</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="space-y-3">
          <div className="text-sm text-slate-500">
            <p>Created on {new Date(segment.createdAt).toLocaleDateString()}</p>
          </div>
          
          <ScrollArea className="h-16 border rounded-md bg-slate-50 p-2">
            <div className="space-y-1">
              {segment.filterCriteria.map((criteria, index) => (
                <div key={index} className="text-xs flex items-center space-x-1">
                  <span className="font-medium">
                    {fieldOptions.find(f => f.value === criteria.field)?.label}
                  </span>
                  <span className="text-slate-500">
                    {stringOperators.find(o => o.value === criteria.operator)?.label}
                  </span>
                  <span className="font-medium capitalize">
                    {criteria.value}
                  </span>
                  {index < segment.filterCriteria.length - 1 && (
                    <Badge variant="secondary" className="px-1 py-0">AND</Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => onViewAnalytics(segment)}
            >
              <BarChart3 size={14} />
              <span>Analytics</span>
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => onViewCustomers(segment)}
            >
              <Users size={14} />
              <span>View</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Customer Segments Component
const CustomerSegments = ({ 
  customers 
}: { 
  customers: Customer[] 
}) => {
  const [isCreateSegmentOpen, setIsCreateSegmentOpen] = useState(false);
  const [segments, setSegments] = useState<CustomerSegment[]>(exampleSegments);
  const [filterRules, setFilterRules] = useState<number[]>([0]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form for segment creation
  const form = useForm<SegmentFormValues>({
    resolver: zodResolver(segmentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      filterCriteria: [
        { field: "lifecycleStage", operator: "equals", value: "lead" }
      ]
    }
  });
  
  // Add a new filter rule
  const addFilterRule = () => {
    const newIndex = Math.max(...filterRules) + 1;
    setFilterRules([...filterRules, newIndex]);
    
    // Update form with new empty criteria
    const currentCriteria = form.getValues().filterCriteria || [];
    form.setValue('filterCriteria', [
      ...currentCriteria,
      { field: "lifecycleStage", operator: "equals", value: "lead" }
    ]);
  };
  
  // Remove a filter rule
  const removeFilterRule = (index: number) => {
    if (filterRules.length <= 1) return; // Keep at least one rule
    
    // Remove from UI
    setFilterRules(filterRules.filter(i => i !== index));
    
    // Remove from form
    const currentCriteria = form.getValues().filterCriteria || [];
    const newCriteria = currentCriteria.filter((_, i) => i !== filterRules.indexOf(index));
    form.setValue('filterCriteria', newCriteria);
  };
  
  // Apply segment filter criteria to customer data
  const applySegmentFilters = (customers: Customer[], criteria: SegmentFilterCriteria[]): Customer[] => {
    if (!customers || customers.length === 0 || !criteria || criteria.length === 0) {
      return [];
    }
    
    // Filter customers based on all criteria (AND logic)
    return customers.filter(customer => {
      // Check if customer matches all criteria
      return criteria.every(rule => {
        const field = rule.field as keyof Customer;
        const value = customer[field];
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
          if (rule.operator === 'empty') return true;
          if (rule.operator === 'notEmpty') return false;
          return false;
        }
        
        // String comparison for text fields
        const customerValue = String(value).toLowerCase();
        const ruleValue = rule.value.toLowerCase();
        
        switch (rule.operator) {
          case 'equals':
            return customerValue === ruleValue;
          case 'notEquals':
            return customerValue !== ruleValue;
          case 'contains':
            return customerValue.includes(ruleValue);
          case 'startsWith':
            return customerValue.startsWith(ruleValue);
          case 'endsWith':
            return customerValue.endsWith(ruleValue);
          case 'empty':
            return customerValue === '';
          case 'notEmpty':
            return customerValue !== '';
          default:
            return false;
        }
      });
    });
  };
  
  // Form submit handler
  const onSubmit = (data: SegmentFormValues) => {
    console.log("Creating segment with data:", data);
    
    // Apply filters to get matching customers
    const matchingCustomers = applySegmentFilters(customers, data.filterCriteria);
    const customerCount = matchingCustomers.length;
    
    // Create new segment
    const newSegment: CustomerSegment = {
      id: `segment-${segments.length + 1}`,
      name: data.name,
      description: data.description,
      filterCriteria: data.filterCriteria,
      customerCount: customerCount,
      createdAt: new Date()
    };
    
    // Add to state
    setSegments([...segments, newSegment]);
    
    // Show success toast
    toast({
      title: "Segment created",
      description: `Segment "${data.name}" has been created successfully`,
    });
    
    // Close modal and reset form
    closeCreateSegmentDialog();
    form.reset();
    setFilterRules([0]);
  };
  
  // Navigation
  const [, setLocation] = useLocation();
  
  // Dialog handlers
  const openCreateSegmentDialog = () => setLocation('/unified-segments');
  const closeCreateSegmentDialog = () => setIsCreateSegmentOpen(false);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Customer Segments</h2>
          <p className="text-sm text-slate-500">Group customers based on specific attributes and behaviors</p>
        </div>
        <Button 
          onClick={openCreateSegmentDialog}
          className="flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Create Segment</span>
        </Button>
      </div>
      
      {/* Segment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((segment) => (
          <SegmentCard 
            key={segment.id} 
            segment={segment} 
            onViewAnalytics={(segment) => {
              toast({
                title: "Segment Analytics",
                description: `Viewing analytics for segment "${segment.name}"`,
              });
            }}
            onViewCustomers={(segment) => {
              toast({
                title: "Segment Customers",
                description: `Viewing ${segment.customerCount} customers in "${segment.name}" segment`,
              });
            }}
          />
        ))}
      </div>
      
      {/* Create Segment Dialog */}
      <Dialog open={isCreateSegmentOpen} onOpenChange={setIsCreateSegmentOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Customer Segment</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Segment Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., High-Value Customers" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of this segment" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <Label className="text-base font-medium">Filter Criteria</Label>
                <p className="text-sm text-slate-500 mb-3">
                  Define rules to segment your customers. All conditions must be met (AND logic).
                </p>
                
                <div className="space-y-3">
                  {filterRules.map((ruleIndex) => (
                    <FilterRule 
                      key={ruleIndex}
                      index={filterRules.indexOf(ruleIndex)}
                      customers={customers}
                      onDelete={() => removeFilterRule(ruleIndex)}
                      form={form}
                    />
                  ))}
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFilterRule}
                  className="mt-3 flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Add Condition</span>
                </Button>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCreateSegmentDialog}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="flex items-center space-x-1"
                >
                  <Save size={16} />
                  <span>Create Segment</span>
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerSegments;