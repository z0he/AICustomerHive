import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryParam } from '@/lib/useQueryParam';
import { useToast } from '@/hooks/use-toast';
import type { ContactSegmentFilter } from '@shared/schema';
import ContactDrawer from './ContactDrawer';
import EditContactModal from './EditContactModal';
import AdvancedFilters from '@/components/contacts/AdvancedFilters';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical,
  Users
} from 'lucide-react';

type LifecycleStage = 'all' | 'lead' | 'opportunity' | 'customer' | 'evangelist' | 'churned';

const LIFECYCLE_STAGES: { value: LifecycleStage; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-800' },
  { value: 'lead', label: 'Leads', color: 'bg-blue-100 text-blue-800' },
  { value: 'opportunity', label: 'Opportunities', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'customer', label: 'Customers', color: 'bg-green-100 text-green-800' },
  { value: 'evangelist', label: 'Evangelists', color: 'bg-purple-100 text-purple-800' },
  { value: 'churned', label: 'Churned', color: 'bg-red-100 text-red-800' },
];

interface Contact {
  id: number;
  name: string;
  email: string;
  jobTitle?: string;
  industry?: string;
  country?: string;
  lifecycleStage: string;
  source?: string;
  lastActivity?: string;
  owner?: string;
  company?: string;
}

export default function ContactsPage() {
  const { toast } = useToast();
  const [stage, setStage] = useQueryParam<LifecycleStage>('stage', 'all');
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<ContactSegmentFilter[]>([]);

  // Fetch contacts based on current filters
  const { 
    data: response, 
    isLoading, 
    error,
    refetch: refetchContacts
  } = useQuery({
    queryKey: ['contacts', stage, search, owner, advancedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (stage !== 'all') params.set('stage', stage);
      if (search) params.set('q', search);
      if (owner && owner !== 'all') params.set('owner', owner);
      
      // Add advanced filters
      if (advancedFilters.length > 0) {
        params.set('advancedFilters', JSON.stringify(advancedFilters));
      }

      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch contacts');
      }
      return res.json();
    }
  });

  const contacts: Contact[] = response?.contacts || [];
  const stageCounts = response?.counts || {
    all: 0,
    lead: 0,
    opportunity: 0,
    customer: 0,
    evangelist: 0,
    churned: 0
  };

  const getStageColor = (stageValue: string) => {
    const stage = LIFECYCLE_STAGES.find(s => s.value === stageValue);
    return stage?.color || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const handleContactClick = (contact: Contact) => {
    console.log('open contact', contact.id, contact);
    setSelectedContact(contact);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedContact(null);
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setIsEditModalOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingContact(null);
  };

  const handleAdvancedFiltersChange = (filters: ContactSegmentFilter[]) => {
    setAdvancedFilters(filters);
  };

  const handleApplyAdvancedFilters = () => {
    refetchContacts();
  };

  const currentStageInfo = LIFECYCLE_STAGES.find(s => s.value === stage);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-red-600">Failed to load contacts. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-emerald-600" />
            Contacts
          </h1>
          <p className="text-slate-500 mt-1">
            Manage all your contacts across their lifecycle
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleAddContact}>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Stage Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {LIFECYCLE_STAGES.map((stageOption) => (
          <Button
            key={stageOption.value}
            variant={stage === stageOption.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStage(stageOption.value)}
            className={stage === stageOption.value ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            {stageOption.label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={owner || "all"} onValueChange={(value) => setOwner(value === "all" ? "" : value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            <SelectItem value="John Doe">John Doe</SelectItem>
            <SelectItem value="Jane Smith">Jane Smith</SelectItem>
            <SelectItem value="Unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
        {/* Advanced Filters Component */}
        <AdvancedFilters
          filters={advancedFilters}
          onFiltersChange={handleAdvancedFiltersChange}
          onApplyFilters={handleApplyAdvancedFilters}
        />
      </div>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {currentStageInfo?.label} Contacts ({contacts.length})
            </span>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                No {stage === 'all' ? '' : currentStageInfo?.label.toLowerCase()} contacts found
              </h3>
              <p className="text-slate-500">
                {search ? 'Try adjusting your search criteria.' : 'Get started by adding your first contact.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Country/Region</TableHead>
                    <TableHead>Lifecycle Stage</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact: Contact) => (
                    <TableRow 
                      key={contact.id} 
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleContactClick(contact)}
                    >
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>{contact.jobTitle || '—'}</TableCell>
                      <TableCell>{contact.industry || '—'}</TableCell>
                      <TableCell>{contact.country || '—'}</TableCell>
                      <TableCell>
                        <Badge className={getStageColor(contact.lifecycleStage)}>
                          {LIFECYCLE_STAGES.find(s => s.value === contact.lifecycleStage)?.label || contact.lifecycleStage}
                        </Badge>
                      </TableCell>
                      <TableCell>{contact.source || '—'}</TableCell>
                      <TableCell>{formatDate(contact.lastActivity)}</TableCell>
                      <TableCell>{contact.owner || 'Unassigned'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Detail Drawer */}
      <ContactDrawer 
        contact={selectedContact}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onEdit={handleEditContact}
      />

      {/* Edit Contact Modal */}
      <EditContactModal
        contact={editingContact}
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        mode={editingContact ? 'edit' : 'add'}
      />
    </div>
  );
}