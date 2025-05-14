import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LeadStatusFilterProps {
  onFilterChange: (status: string) => void;
  activeFilter: string;
  leads: any[];
}

export default function LeadStatusFilter({ onFilterChange, activeFilter, leads }: LeadStatusFilterProps) {
  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: leads.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
      lost: 0
    };
    
    leads.forEach(lead => {
      const status = lead.leadStatus || 'new';
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    
    return counts;
  }, [leads]);
  
  // Status configurations
  const statuses = [
    { id: 'all', label: 'All', variant: 'default' },
    { id: 'new', label: 'New', variant: 'secondary' },
    { id: 'contacted', label: 'Contacted', variant: 'default' },
    { id: 'qualified', label: 'Qualified', variant: 'success' },
    { id: 'proposal', label: 'Proposal', variant: 'warning' },
    { id: 'negotiation', label: 'Negotiation', variant: 'orange' },
    { id: 'won', label: 'Won', variant: 'success' },
    { id: 'lost', label: 'Lost', variant: 'destructive' }
  ];
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {statuses.map(status => (
          <Button
            key={status.id}
            variant={activeFilter === status.id ? "default" : "outline"}
            className="justify-between h-auto py-2 px-2 text-xs sm:text-sm w-full"
            onClick={() => onFilterChange(status.id)}
          >
            <span className="truncate mr-1">{status.label}</span>
            <Badge variant="secondary" className="ml-1 shrink-0">
              {statusCounts[status.id] || 0}
            </Badge>
          </Button>
        ))}
      </div>
      
      <div className="bg-slate-50 p-3 rounded-md text-xs sm:text-sm text-slate-500">
        <p className="line-clamp-3">
          Lead status indicates the progress of a lead through your sales pipeline. 
          Regularly update lead statuses to keep your pipeline organized.
        </p>
      </div>
    </div>
  );
}