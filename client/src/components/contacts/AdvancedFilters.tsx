import React, { useState } from 'react';
import { Plus, Filter, X, Save, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ContactSegmentFilter } from '@shared/schema';

const FILTER_OPERATORS = [
  { value: 'equals', label: 'is equal to' },
  { value: 'notEquals', label: 'is not equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'greaterThan', label: 'is greater than' },
  { value: 'lessThan', label: 'is less than' },
  { value: 'greaterThanOrEqual', label: 'is greater than or equal to' },
  { value: 'lessThanOrEqual', label: 'is less than or equal to' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
  { value: 'in', label: 'is any of' }
];

const CONTACT_PROPERTIES = [
  { value: 'firstName', label: 'First Name', type: 'text' },
  { value: 'lastName', label: 'Last Name', type: 'text' },
  { value: 'name', label: 'Name', type: 'text' },
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'company', label: 'Company', type: 'text' },
  { value: 'jobTitle', label: 'Job Title', type: 'text' },
  { value: 'industry', label: 'Industry', type: 'select', options: [
    "Accounting","Airlines/Aviation","Alternative Medicine","Animation",
    "Banking","Biotechnology","Construction","Consumer Electronics",
    "Education Management","E-Learning","Financial Services",
    "Information Technology and Services","Marketing and Advertising",
    "Non-Profit Organization Management","Real Estate","Retail"
    // Truncated for brevity - would include all 147 industries
  ]},
  { value: 'contactSource', label: 'Contact Source', type: 'select', options: [
    "Website","Referral","Social Media","Email Campaign","Event",
    "Paid Search","Organic Search","Direct","Trade Show","Webinar",
    "Cold Call","Partner","Advertisement","Content Marketing","Other"
  ]},
  { value: 'lifecycleStage', label: 'Lifecycle Stage', type: 'select', options: [
    'lead', 'opportunity', 'customer', 'evangelist', 'churned'
  ]},
  { value: 'country', label: 'Country', type: 'text' },
  { value: 'phone', label: 'Phone', type: 'text' },
  { value: 'score', label: 'Lead Score', type: 'number' },
  { value: 'owner', label: 'Contact Owner', type: 'text' },
  { value: 'createdAt', label: 'Create Date', type: 'date' },
  { value: 'lastActivity', label: 'Last Activity Date', type: 'date' }
];

const LIFECYCLE_STAGE_LABELS = {
  lead: 'Lead',
  opportunity: 'Opportunity', 
  customer: 'Customer',
  evangelist: 'Evangelist',
  churned: 'Churned'
};

interface AdvancedFiltersProps {
  filters: ContactSegmentFilter[];
  onFiltersChange: (filters: ContactSegmentFilter[]) => void;
  onApplyFilters: () => void;
}

interface FilterCondition extends ContactSegmentFilter {
  id: string;
}

export default function AdvancedFilters({ filters, onFiltersChange, onApplyFilters }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conditions, setConditions] = useState<FilterCondition[]>(
    filters.map(f => ({ ...f, id: Math.random().toString(36) }))
  );
  const [logicalOperator, setLogicalOperator] = useState<'all' | 'any'>('all');

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: Math.random().toString(36),
      field: '',
      operator: 'equals',
      value: ''
    };
    setConditions([...conditions, newCondition]);
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const applyFilters = () => {
    const validConditions = conditions.filter(c => c.field && c.operator);
    onFiltersChange(validConditions);
    onApplyFilters();
    setIsOpen(false);
  };

  const resetFilters = () => {
    setConditions([]);
    onFiltersChange([]);
    onApplyFilters();
    setIsOpen(false);
  };

  const getPropertyType = (field: string) => {
    return CONTACT_PROPERTIES.find(p => p.value === field)?.type || 'text';
  };

  const getPropertyOptions = (field: string) => {
    return CONTACT_PROPERTIES.find(p => p.value === field)?.options || [];
  };

  const renderValueInput = (condition: FilterCondition) => {
    const property = CONTACT_PROPERTIES.find(p => p.value === condition.field);
    
    if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
      return null; // No value input needed
    }

    if (property?.type === 'select') {
      const options = property.options || [];
      return (
        <Select 
          value={condition.value as string} 
          onValueChange={(value) => updateCondition(condition.id, { value })}
        >
          <SelectTrigger className="min-w-[200px]" data-testid={`select-filter-value-${condition.id}`}>
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {property.value === 'lifecycleStage' ? LIFECYCLE_STAGE_LABELS[option as keyof typeof LIFECYCLE_STAGE_LABELS] : option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={property?.type === 'number' ? 'number' : 'text'}
        placeholder="Enter value"
        value={condition.value as string}
        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
        className="min-w-[200px]"
        data-testid={`input-filter-value-${condition.id}`}
      />
    );
  };

  const activeFilterCount = filters.length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="relative"
          data-testid="button-advanced-filters"
        >
          <Filter className="h-4 w-4 mr-2" />
          Advanced filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Filters
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Logical operator selection */}
          {conditions.length > 1 && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Show contacts that match:</Label>
              <Select value={logicalOperator} onValueChange={(value: 'all' | 'any') => setLogicalOperator(value)}>
                <SelectTrigger className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All conditions (AND)</SelectItem>
                  <SelectItem value="any">Any conditions (OR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filter conditions */}
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <Card key={condition.id} className="p-4">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    {index > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {logicalOperator.toUpperCase()}
                      </Badge>
                    )}

                    {/* Property Selection */}
                    <Select 
                      value={condition.field} 
                      onValueChange={(value) => updateCondition(condition.id, { field: value, value: '' })}
                    >
                      <SelectTrigger className="min-w-[150px]" data-testid={`select-filter-property-${condition.id}`}>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_PROPERTIES.map((property) => (
                          <SelectItem key={property.value} value={property.value}>
                            {property.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Operator Selection */}
                    <Select 
                      value={condition.operator} 
                      onValueChange={(value) => updateCondition(condition.id, { operator: value as any })}
                    >
                      <SelectTrigger className="min-w-[150px]" data-testid={`select-filter-operator-${condition.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FILTER_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Value Input */}
                    {renderValueInput(condition)}

                    {/* Remove condition button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(condition.id)}
                      data-testid={`button-remove-condition-${condition.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add condition button */}
          <Button 
            variant="outline" 
            onClick={addCondition}
            className="w-full"
            data-testid="button-add-condition"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add condition
          </Button>

          {/* Action buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={resetFilters} data-testid="button-reset-filters">
              Reset filters
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} data-testid="button-cancel-filters">
                Cancel
              </Button>
              <Button onClick={applyFilters} data-testid="button-apply-filters">
                Apply filters ({conditions.filter(c => c.field).length})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}