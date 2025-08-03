import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Filter, TrendingUp, TrendingDown, Edit, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ContactSegment, ContactSegmentFilter, Contact } from '@shared/schema';

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'greaterThanOrEqual', label: 'Greater Than or Equal' },
  { value: 'lessThanOrEqual', label: 'Less Than or Equal' },
  { value: 'isEmpty', label: 'Is Empty' },
  { value: 'isNotEmpty', label: 'Is Not Empty' },
  { value: 'in', label: 'In List' }
];

const CONTACT_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company' },
  { value: 'jobTitle', label: 'Job Title' },
  { value: 'industry', label: 'Industry' },
  { value: 'contactType', label: 'Contact Type' },
  { value: 'leadSource', label: 'Lead Source' },
  { value: 'leadStatus', label: 'Lead Status' },
  { value: 'lifecycleStage', label: 'Lifecycle Stage' },
  { value: 'score', label: 'Score' },
  { value: 'engagementLevel', label: 'Engagement Level' },
  { value: 'conversionProbability', label: 'Conversion Probability' },
  { value: 'tags', label: 'Tags' },
  { value: 'location', label: 'Location' },
  { value: 'country', label: 'Country' }
];

export default function UnifiedContactSegments() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewContactsSegmentId, setViewContactsSegmentId] = useState<number | null>(null);
  const [segmentForm, setSegmentForm] = useState({
    name: '',
    description: '',
    contactTypes: ['lead', 'customer'] as ('lead' | 'customer')[],
    filters: [] as ContactSegmentFilter[]
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch unified contact segments
  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['/api/contact-segments'],
    queryFn: async () => {
      const response = await apiRequest('/api/contact-segments', 'GET');
      return await response.json() as ContactSegment[];
    }
  });

  // Fetch contacts for a specific segment
  const { data: segmentContacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ['/api/contact-segments', viewContactsSegmentId, 'contacts'],
    queryFn: async () => {
      if (!viewContactsSegmentId) return [];
      const response = await apiRequest(`/api/contact-segments/${viewContactsSegmentId}/contacts`, 'GET');
      return await response.json() as Contact[];
    },
    enabled: !!viewContactsSegmentId
  });

  // Create segment mutation
  const createSegmentMutation = useMutation({
    mutationFn: async (segmentData: any) => {
      return await apiRequest('/api/contact-segments', 'POST', segmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contact-segments'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Contact segment created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create contact segment.",
        variant: "destructive",
      });
    }
  });

  // Delete segment mutation
  const deleteSegmentMutation = useMutation({
    mutationFn: async (segmentId: number) => {
      return await apiRequest(`/api/contact-segments/${segmentId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contact-segments'] });
      toast({
        title: "Success",
        description: "Contact segment deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact segment.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setSegmentForm({
      name: '',
      description: '',
      contactTypes: ['lead', 'customer'],
      filters: []
    });
  };

  const addFilter = () => {
    setSegmentForm(prev => ({
      ...prev,
      filters: [...prev.filters, {
        field: 'name',
        operator: 'equals',
        value: '',
        contactTypes: prev.contactTypes
      }]
    }));
  };

  const updateFilter = (index: number, updates: Partial<ContactSegmentFilter>) => {
    setSegmentForm(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      )
    }));
  };

  const removeFilter = (index: number) => {
    setSegmentForm(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!segmentForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a segment name.",
        variant: "destructive",
      });
      return;
    }

    if (segmentForm.filters.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one filter condition.",
        variant: "destructive",
      });
      return;
    }

    createSegmentMutation.mutate({
      name: segmentForm.name,
      description: segmentForm.description,
      contactTypes: segmentForm.contactTypes,
      filterCriteria: segmentForm.filters,
      isActive: true
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(1) + '%';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
            <span>Loading contact segments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Unified Contact Segments</h2>
          <p className="text-gray-600 mt-1">
            Create and manage segments that include both leads and customers
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Contact Segment</DialogTitle>
              <DialogDescription>
                Create a new segment to group leads and customers based on specific criteria.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Segment Name</Label>
                  <Input
                    id="name"
                    value={segmentForm.name}
                    onChange={(e) => setSegmentForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., High-Value Prospects"
                    required
                  />
                </div>
                
                <div>
                  <Label>Contact Types</Label>
                  <div className="flex gap-2 mt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={segmentForm.contactTypes.includes('lead')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSegmentForm(prev => ({ 
                              ...prev, 
                              contactTypes: [...prev.contactTypes.filter(t => t !== 'lead'), 'lead']
                            }));
                          } else {
                            setSegmentForm(prev => ({ 
                              ...prev, 
                              contactTypes: prev.contactTypes.filter(t => t !== 'lead')
                            }));
                          }
                        }}
                      />
                      <span>Leads</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={segmentForm.contactTypes.includes('customer')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSegmentForm(prev => ({ 
                              ...prev, 
                              contactTypes: [...prev.contactTypes.filter(t => t !== 'customer'), 'customer']
                            }));
                          } else {
                            setSegmentForm(prev => ({ 
                              ...prev, 
                              contactTypes: prev.contactTypes.filter(t => t !== 'customer')
                            }));
                          }
                        }}
                      />
                      <span>Customers</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={segmentForm.description}
                  onChange={(e) => setSegmentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this segment..."
                  rows={3}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Filter Conditions</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addFilter}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Filter
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {segmentForm.filters.map((filter, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                      <div className="col-span-3">
                        <Label className="text-xs">Field</Label>
                        <Select
                          value={filter.field}
                          onValueChange={(value) => updateFilter(index, { field: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_FIELDS.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-3">
                        <Label className="text-xs">Operator</Label>
                        <Select
                          value={filter.operator}
                          onValueChange={(value) => updateFilter(index, { operator: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FILTER_OPERATORS.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-5">
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={typeof filter.value === 'string' ? filter.value : ''}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          placeholder="Filter value..."
                          disabled={filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty'}
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFilter(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {segmentForm.filters.length === 0 && (
                    <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <Filter className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No filter conditions added yet</p>
                      <p className="text-sm">Click "Add Filter" to start building your segment</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSegmentMutation.isPending}>
                  {createSegmentMutation.isPending ? 'Creating...' : 'Create Segment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Segments Grid */}
      {segments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Contact Segments Yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first unified contact segment to organize leads and customers together.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Segment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <Card key={segment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{segment.name}</CardTitle>
                    {segment.description && (
                      <CardDescription className="mt-1">
                        {segment.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewContactsSegmentId(segment.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSegmentMutation.mutate(segment.id)}
                      disabled={deleteSegmentMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {segment.contactTypes.map(type => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type === 'lead' ? 'Leads' : 'Customers'}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Total Contacts</div>
                      <div className="font-semibold text-lg">
                        {formatNumber(segment.totalCount || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Conversion Rate</div>
                      <div className="font-semibold text-lg flex items-center">
                        {formatPercentage(segment.conversionRate || 0)}
                        {segment.conversionRate && segment.conversionRate > 0.1 ? (
                          <TrendingUp className="h-3 w-3 ml-1 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 ml-1 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Leads</div>
                      <div className="font-medium">{formatNumber(segment.leadCount || 0)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Customers</div>
                      <div className="font-medium">{formatNumber(segment.customerCount || 0)}</div>
                    </div>
                  </div>
                  
                  {segment.avgScore && (
                    <div>
                      <div className="text-gray-600 text-sm">Average Score</div>
                      <div className="font-semibold">{segment.avgScore}/100</div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Created {new Date(segment.createdAt).toLocaleDateString()}
                    {segment.lastUpdated && (
                      <div>Updated {new Date(segment.lastUpdated).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Contacts Dialog */}
      <Dialog open={!!viewContactsSegmentId} onOpenChange={() => setViewContactsSegmentId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Segment Contacts
              {segments.find(s => s.id === viewContactsSegmentId)?.name && (
                <span className="text-base font-normal text-gray-600 ml-2">
                  - {segments.find(s => s.id === viewContactsSegmentId)?.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Contacts matching this segment's criteria
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingContacts ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                <span className="ml-2">Loading contacts...</span>
              </div>
            ) : segmentContacts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No contacts match this segment's criteria yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {segmentContacts.map((contact) => (
                  <div key={`${contact.contactType}-${contact.id}`} 
                       className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                        {contact.initials || contact.name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-gray-600">{contact.email}</div>
                        {contact.company && (
                          <div className="text-sm text-gray-500">{contact.company}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={contact.contactType === 'lead' ? 'default' : 'secondary'}>
                        {contact.contactType === 'lead' ? 'Lead' : 'Customer'}
                      </Badge>
                      {contact.score && (
                        <Badge variant="outline">
                          Score: {contact.score}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}