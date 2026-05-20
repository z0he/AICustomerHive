import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQueryParam } from '@/lib/useQueryParam';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ContactSegmentFilter } from '@shared/schema';
import ContactDrawer from './ContactDrawer';
import EditContactModal from './EditContactModal';
import AdvancedFilters from '@/components/contacts/AdvancedFilters';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical,
  Users,
  Trash2,
  Edit
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
  id: string;
  name: string;
  email: string;
  jobTitle?: string;
  industry?: string;
  country?: string;
  lifecycleStage?: string;
  source?: string;
  lastActivity?: string;
  owner?: string;
  company?: string;
}

export default function ContactsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stage, setStage] = useQueryParam<LifecycleStage>('stage', 'all');
  // `q` lives in the URL so deep-links (and the voice agent's ui.navigate
  // hint) can land the page pre-filtered. `replace: true` avoids pushing a
  // history entry per keystroke.
  const [search, setSearch] = useQueryParam<string>('q', '', { replace: true });
  const [owner, setOwner] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<ContactSegmentFilter[]>([]);
  
  // Bulk selection state
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  
  // Delete confirmation state
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

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

  // Delete mutations
  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      return await apiRequest(`/api/contacts/${contactId}`, 'DELETE');
    },
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setSelectedContactIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      toast({
        title: "Contact deleted",
        description: "The contact has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: "Failed to delete the contact. Please try again.",
        variant: "destructive",
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (contactIds: string[]) => {
      await Promise.all(
        contactIds.map(id => apiRequest(`/api/contacts/${id}`, 'DELETE'))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setSelectedContactIds(new Set());
      setIsSelectAll(false);
      toast({
        title: "Contacts deleted",
        description: `Successfully deleted ${selectedContactIds.size} contacts.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Bulk delete failed",
        description: "Failed to delete some contacts. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    setIsSelectAll(checked);
    if (checked) {
      setSelectedContactIds(new Set(contacts.map(c => c.id)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(contactId);
      } else {
        newSet.delete(contactId);
        setIsSelectAll(false);
      }
      return newSet;
    });
  };

  // Delete handlers
  const handleDeleteContact = (contact: Contact) => {
    setContactToDelete(contact);
    setShowDeleteConfirm(true);
  };

  const handleBulkDelete = () => {
    if (selectedContactIds.size > 0) {
      setShowBulkDeleteConfirm(true);
    }
  };

  const confirmDelete = () => {
    if (contactToDelete) {
      deleteMutation.mutate(contactToDelete.id);
      setShowDeleteConfirm(false);
      setContactToDelete(null);
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedContactIds));
    setShowBulkDeleteConfirm(false);
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
            <div className="flex items-center gap-2">
              {selectedContactIds.size > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete {selectedContactIds.size} contacts
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
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
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isSelectAll}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Country/Region</TableHead>
                    <TableHead>Lifecycle Stage</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact: Contact) => (
                    <TableRow 
                      key={contact.id} 
                      className="hover:bg-slate-50"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedContactIds.has(contact.id)}
                          onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                          data-testid={`checkbox-contact-${contact.id}`}
                        />
                      </TableCell>
                      <TableCell 
                        className="font-medium cursor-pointer" 
                        onClick={() => handleContactClick(contact)}
                        data-testid={`text-contact-name-${contact.id}`}
                      >
                        {contact.name}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer" 
                        onClick={() => handleContactClick(contact)}
                        data-testid={`text-contact-email-${contact.id}`}
                      >
                        {contact.email}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer" 
                        onClick={() => handleContactClick(contact)}
                      >
                        {contact.jobTitle || '—'}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer" 
                        onClick={() => handleContactClick(contact)}
                      >
                        {contact.industry || '—'}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer" 
                        onClick={() => handleContactClick(contact)}
                      >
                        {contact.country || '—'}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer" 
                        onClick={() => handleContactClick(contact)}
                      >
                        <Badge className={getStageColor(contact.lifecycleStage || 'lead')}>
                          {LIFECYCLE_STAGES.find(s => s.value === contact.lifecycleStage)?.label || contact.lifecycleStage || 'Lead'}
                        </Badge>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer" 
                        onClick={() => handleContactClick(contact)}
                      >
                        {contact.source || '—'}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer" 
                        onClick={() => handleContactClick(contact)}
                      >
                        {formatDate(contact.lastActivity)}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer" 
                        onClick={() => handleContactClick(contact)}
                      >
                        {contact.owner || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-contact-actions-${contact.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleEditContact(contact)}
                              data-testid={`button-edit-contact-${contact.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteContact(contact)}
                              className="text-red-600"
                              data-testid={`button-delete-contact-${contact.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{contactToDelete?.name}</strong> ({contactToDelete?.email})? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Contacts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedContactIds.size} selected contacts? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedContactIds.size} contacts`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}