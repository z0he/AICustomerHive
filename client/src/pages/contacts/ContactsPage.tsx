import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useContactsParams } from "@/lib/useQueryParam";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  Users, 
  AlertCircle,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SelectContact } from "../../../../shared/schema";

// Stage configuration for pills and filtering
const STAGES = [
  { key: 'all', label: 'All', count: 0 },
  { key: 'lead', label: 'Leads', count: 0 },
  { key: 'mql', label: 'MQLs', count: 0 },
  { key: 'opportunity', label: 'Opportunities', count: 0 },
  { key: 'customer', label: 'Customers', count: 0 },
  { key: 'evangelist', label: 'Evangelists', count: 0 },
  { key: 'churned', label: 'Churned', count: 0 },
] as const;

interface ContactsResponse {
  contacts: SelectContact[];
  total: number;
  counts: Record<string, number>;
}

// Fetch contacts from API
async function fetchContacts(stage: string, q: string, owner: string): Promise<ContactsResponse> {
  const params = new URLSearchParams();
  if (stage !== 'all') params.append('stage', stage);
  if (q) params.append('q', q);
  if (owner) params.append('owner', owner);

  const response = await fetch(`/api/contacts?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch contacts: ${response.statusText}`);
  }

  return response.json();
}

function StagePill({ 
  stage, 
  count, 
  isActive, 
  onClick 
}: { 
  stage: { key: string; label: string }; 
  count: number; 
  isActive: boolean; 
  onClick: () => void; 
}) {
  return (
    <button
      onClick={onClick}
      data-testid={`pill-${stage.key}`}
      className={cn(
        "inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2",
        isActive
          ? "bg-green-100 text-green-800 border-green-300"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
      )}
    >
      {stage.label}
      <Badge variant="secondary" className="ml-2 text-xs">
        {count}
      </Badge>
    </button>
  );
}

function ContactsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ stage }: { stage: string }) {
  const stageConfig = STAGES.find(s => s.key === stage);
  const stageLabel = stageConfig?.label.toLowerCase() || 'contacts';
  
  return (
    <div className="text-center py-12" data-testid="contacts-empty">
      <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No {stageLabel} found
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto">
        {stage === 'all' 
          ? "Get started by adding your first contact or importing from a CSV file."
          : `No contacts match the current ${stageLabel} filter. Try adjusting your search or selecting a different stage.`}
      </p>
      <Button className="mt-4" variant="outline">
        Add Contact
      </Button>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Failed to load contacts
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto mb-4">
        {error}
      </p>
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
    </div>
  );
}

function ContactRow({ 
  contact, 
  onClick 
}: { 
  contact: SelectContact; 
  onClick: () => void; 
}) {
  const displayName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unnamed Contact';
  
  // Format last activity - placeholder since not in current schema
  const lastActivity = contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString() : 'Never';
  
  return (
    <TableRow 
      className="hover:bg-gray-50 cursor-pointer focus-within:bg-gray-50"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
    >
      <TableCell className="font-medium">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-sm font-medium text-green-800">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{displayName}</div>
            {contact.email && (
              <div className="text-sm text-gray-500">{contact.email}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>{contact.jobTitle || '-'}</TableCell>
      <TableCell>{contact.company || '-'}</TableCell>
      <TableCell>-</TableCell> {/* Industry - not in current schema */}
      <TableCell>-</TableCell> {/* Country/Region - not in current schema */}
      <TableCell>
        <Badge variant="secondary">
          {contact.lifecycleStage}
        </Badge>
      </TableCell>
      <TableCell>-</TableCell> {/* Source - not in current schema */}
      <TableCell>{lastActivity}</TableCell>
      <TableCell>-</TableCell> {/* Owner - not in current schema */}
    </TableRow>
  );
}

export default function ContactsPage() {
  const { user } = useAuth();
  const { stage, q, owner, updateParams } = useContactsParams();
  const [searchInput, setSearchInput] = useState(q);

  // Fetch contacts data
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/contacts', stage, q, owner],
    queryFn: () => fetchContacts(stage, q, owner),
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Handle stage pill clicks
  const handleStageChange = (newStage: string) => {
    updateParams({ stage: newStage });
  };

  // Handle search input changes
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    updateParams({ q: value });
  };

  // Handle owner filter changes  
  const handleOwnerChange = (value: string) => {
    updateParams({ owner: value === 'all' ? '' : value });
  };

  // Handle contact row clicks (placeholder for drawer/navigation)
  const handleContactClick = (contact: SelectContact) => {
    console.log('Contact clicked:', contact);
    // TODO: Open contact drawer or navigate to /contacts/:id
  };

  // Merge stage counts with static config
  const stagesWithCounts = STAGES.map(stageConfig => ({
    ...stageConfig,
    count: data?.counts?.[stageConfig.key] || 0
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600 mt-1">
              Manage all your leads, opportunities, and customers in one place
            </p>
          </div>
          <Button>
            Add Contact
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="space-y-4">
          {/* Stage Pills */}
          <div className="flex flex-wrap gap-2">
            {stagesWithCounts.map((stageConfig) => (
              <StagePill
                key={stageConfig.key}
                stage={stageConfig}
                count={stageConfig.count}
                isActive={stage === stageConfig.key}
                onClick={() => handleStageChange(stageConfig.key)}
              />
            ))}
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search contacts..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={owner || 'all'} onValueChange={handleOwnerChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                <SelectItem value="me">Assigned to me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Advanced filters
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {isLoading ? (
            <div className="p-6">
              <ContactsTableSkeleton />
            </div>
          ) : isError ? (
            <ErrorState 
              error={error?.message || 'An unexpected error occurred'} 
              onRetry={() => refetch()} 
            />
          ) : !data?.contacts?.length ? (
            <EmptyState stage={stage} />
          ) : (
            <div className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {data.total} {stage === 'all' ? 'contacts' : STAGES.find(s => s.key === stage)?.label.toLowerCase() || 'contacts'}
                    </span>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View options
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table data-testid="contacts-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Country/Region</TableHead>
                        <TableHead>Lifecycle Stage</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead>Owner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.contacts.map((contact) => (
                        <ContactRow
                          key={contact.id}
                          contact={contact}
                          onClick={() => handleContactClick(contact)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}