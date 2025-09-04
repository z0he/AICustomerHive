import { useQuery } from "@tanstack/react-query";
import { useQueryParams } from "@/lib/useQueryParam";
import { Link } from "wouter";
import { Search, Filter, Plus, Download, Users, Mail, Building, MapPin, Tag, Calendar, User } from "lucide-react";
import clsx from "clsx";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STAGES = [
  { key: "all", label: "All", description: "All contacts" },
  { key: "lead", label: "Leads", description: "New prospects" },
  { key: "mql", label: "MQL", description: "Marketing qualified leads" },
  { key: "opportunity", label: "Opportunities", description: "Sales qualified" },
  { key: "customer", label: "Customers", description: "Active customers" },
  { key: "evangelist", label: "Evangelists", description: "Brand advocates" },
  { key: "churned", label: "Churned", description: "Lost customers" },
] as const;

type StageKey = typeof STAGES[number]["key"];

type ContactRow = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  country?: string;
  lifecycleStage?: string;
  contactSource?: string;
  lastActivityAt?: string;
  contactOwner?: string;
  phone?: string;
  status?: string;
};

// Mock API call - replace with actual API endpoint
async function fetchContacts(stage: string, q: string, owner: string): Promise<{ rows: ContactRow[] }> {
  const params = new URLSearchParams();
  if (stage && stage !== "all") params.set("stage", stage);
  if (q) params.set("q", q);
  if (owner) params.set("owner", owner);

  const response = await fetch(`/api/customers?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load contacts");
  }

  const data = await response.json();
  
  // Transform the data to match our ContactRow interface
  const rows = data.map((contact: any) => ({
    id: contact.id.toString(),
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    jobTitle: contact.jobTitle,
    company: contact.company,
    industry: contact.industry,
    country: contact.country,
    lifecycleStage: contact.lifecycleStage,
    contactSource: contact.contactSource,
    lastActivityAt: contact.createdAt, // Using createdAt as placeholder for lastActivityAt
    contactOwner: contact.contactOwner,
    phone: contact.phone,
    status: contact.status,
  }));

  return { rows };
}

export default function ContactsPage() {
  const [params, setParams] = useQueryParams();
  const stage = (params.get("stage") as StageKey) || "all";
  const q = params.get("q") || "";
  const owner = params.get("owner") || "";

  const [searchInput, setSearchInput] = useState(q);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["contacts", { stage, q, owner }],
    queryFn: () => fetchContacts(stage, q, owner),
    staleTime: 30_000,
  });

  const handleSearch = (value: string) => {
    setParams({ q: value || undefined });
  };

  const handleOwnerChange = (value: string) => {
    setParams({ owner: value || undefined });
  };

  const activeStage = STAGES.find(s => s.key === stage) || STAGES[0];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
            <p className="text-sm text-gray-600">Manage your leads and customers</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create contact
            </Button>
          </div>
        </div>
      </div>

      {/* Stage Pills */}
      <div className="border-b bg-white px-6 py-4">
        <StagePills active={stage} onChange={(s) => setParams({ stage: s === "all" ? undefined : s })} />
      </div>

      {/* Filters and Search */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search name, email, company..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(searchInput);
                }
              }}
              className="pl-9"
            />
          </div>
          
          <Select value={owner} onValueChange={handleOwnerChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All owners</SelectItem>
              <SelectItem value="me">My contacts</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Advanced filters
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {isLoading && <TableSkeleton />}
        {isError && (
          <ErrorState 
            error={error instanceof Error ? error.message : "Failed to load contacts"} 
            onRetry={() => window.location.reload()} 
          />
        )}
        {!isLoading && !isError && (
          <ContactsTable 
            rows={data?.rows || []} 
            stage={activeStage}
          />
        )}
      </div>
    </div>
  );
}

function StagePills({ active, onChange }: { active: StageKey; onChange: (s: StageKey) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {STAGES.map(stage => (
        <button
          key={stage.key}
          onClick={() => onChange(stage.key)}
          className={clsx(
            "px-4 py-2 rounded-full text-sm font-medium transition-colors",
            "border focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
            active === stage.key
              ? "bg-green-600 text-white border-green-600"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          )}
        >
          {stage.label}
        </button>
      ))}
    </div>
  );
}

function ContactsTable({ rows, stage }: { rows: ContactRow[]; stage: typeof STAGES[number] }) {
  if (rows.length === 0) {
    return <EmptyState stage={stage} />;
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Job Title</Th>
              <Th>Company</Th>
              <Th>Industry</Th>
              <Th>Country/Region</Th>
              <Th>Lifecycle Stage</Th>
              <Th>Source</Th>
              <Th>Last Activity</Th>
              <Th>Owner</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map(row => (
              <ContactRow key={row.id} contact={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactRow({ contact }: { contact: ContactRow }) {
  const displayName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "—";
  
  return (
    <tr className="hover:bg-gray-50 cursor-pointer">
      <Td>
        <Link href={`/contacts/${contact.id}`} className="text-green-700 hover:text-green-800 hover:underline font-medium">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-green-600" />
            </div>
            {displayName}
          </div>
        </Link>
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          {contact.email}
        </div>
      </Td>
      <Td>{contact.jobTitle || "—"}</Td>
      <Td>
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-gray-400" />
          {contact.company || "—"}
        </div>
      </Td>
      <Td>{contact.industry || "—"}</Td>
      <Td>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          {contact.country || "—"}
        </div>
      </Td>
      <Td>
        <span className={clsx(
          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
          getStageColor(contact.lifecycleStage)
        )}>
          <Tag className="w-3 h-3 mr-1" />
          {contact.lifecycleStage || "—"}
        </span>
      </Td>
      <Td>{contact.contactSource || "—"}</Td>
      <Td>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          {contact.lastActivityAt ? new Date(contact.lastActivityAt).toLocaleDateString() : "—"}
        </div>
      </Td>
      <Td>{contact.contactOwner || "—"}</Td>
    </tr>
  );
}

function getStageColor(stage?: string) {
  switch (stage?.toLowerCase()) {
    case "lead":
      return "bg-blue-100 text-blue-800";
    case "mql":
      return "bg-purple-100 text-purple-800";
    case "opportunity":
      return "bg-yellow-100 text-yellow-800";
    case "customer":
      return "bg-green-100 text-green-800";
    case "evangelist":
      return "bg-emerald-100 text-emerald-800";
    case "churned":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left font-medium px-4 py-3 text-gray-600 whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 whitespace-nowrap">
      {children}
    </td>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border">
      <div className="animate-pulse">
        <div className="h-12 bg-gray-100 border-b"></div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 border-b bg-gray-50"></div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ stage }: { stage: typeof STAGES[number] }) {
  return (
    <div className="bg-white rounded-lg border p-12 text-center">
      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No {stage.label.toLowerCase()} found
      </h3>
      <p className="text-gray-600 mb-6">
        {stage.key === "all" 
          ? "Get started by creating your first contact or importing existing contacts."
          : `No contacts match the ${stage.label.toLowerCase()} stage. Try switching to a different stage or adjusting your filters.`
        }
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create contact
        </Button>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Import contacts
        </Button>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-lg border p-12 text-center">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Users className="w-6 h-6 text-red-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Failed to load contacts
      </h3>
      <p className="text-gray-600 mb-6">
        {error}
      </p>
      <Button onClick={onRetry} variant="outline">
        Try again
      </Button>
    </div>
  );
}