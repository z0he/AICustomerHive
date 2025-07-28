import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Mail,
  Phone,
  Globe,
  MessageSquare,
  Calendar,
  CreditCard,
  TrendingUp,
  Eye,
  MousePointer,
  Download,
  User,
  Building,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// Types
import { Customer, CustomerTouchpoint, JourneyStage } from "@shared/schema";

interface CustomerJourneyMapProps {
  customers: Customer[];
  touchpoints: CustomerTouchpoint[];
  journeyStages: JourneyStage[];
  onCustomerSelect: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

// Touchpoint type icons mapping
const touchpointIcons: Record<string, any> = {
  website_visit: Globe,
  email_open: Mail,
  email_click: MousePointer,
  form_submit: Download,
  phone_call: Phone,
  meeting: Calendar,
  demo: Eye,
  trial_signup: User,
  purchase: CreditCard,
  support_ticket: MessageSquare,
};

// Stage colors mapping
const stageColors: Record<string, string> = {
  awareness: "bg-blue-100 text-blue-800 border-blue-200",
  consideration: "bg-yellow-100 text-yellow-800 border-yellow-200",
  decision: "bg-orange-100 text-orange-800 border-orange-200",
  retention: "bg-green-100 text-green-800 border-green-200",
  advocacy: "bg-purple-100 text-purple-800 border-purple-200"
};

export default function CustomerJourneyMap({
  customers,
  touchpoints,
  journeyStages,
  onCustomerSelect,
  selectedCustomer
}: CustomerJourneyMapProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);

  // Filter customers based on search and stage
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    if (searchQuery) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (stageFilter !== "all") {
      filtered = filtered.filter(customer => {
        const customerTouchpoints = touchpoints.filter(t => t.customerId === customer.id);
        return customerTouchpoints.some(t => t.touchpointStage === stageFilter);
      });
    }

    return filtered;
  }, [customers, searchQuery, stageFilter, touchpoints]);

  // Get customer touchpoints with journey progression
  const getCustomerJourney = (customerId: number) => {
    const customerTouchpoints = touchpoints
      .filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Group touchpoints by stage
    const touchpointsByStage = customerTouchpoints.reduce((acc, touchpoint) => {
      const stage = touchpoint.touchpointStage;
      if (!acc[stage]) {
        acc[stage] = [];
      }
      acc[stage].push(touchpoint);
      return acc;
    }, {} as Record<string, CustomerTouchpoint[]>);

    return { customerTouchpoints, touchpointsByStage };
  };

  // Calculate customer journey score
  const getJourneyScore = (customerId: number) => {
    const customerTouchpoints = touchpoints.filter(t => t.customerId === customerId);
    if (customerTouchpoints.length === 0) return 0;
    
    const totalScore = customerTouchpoints.reduce((sum, t) => sum + (t.score || 0), 0);
    return Math.round(totalScore / customerTouchpoints.length);
  };

  // Get current stage for customer
  const getCurrentStage = (customerId: number) => {
    const customerTouchpoints = touchpoints
      .filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return customerTouchpoints[0]?.touchpointStage || "awareness";
  };

  // Get unique stages from touchpoints
  const availableStages = useMemo(() => {
    const stagesSet = new Set(touchpoints.map(t => t.touchpointStage));
    const stages = Array.from(stagesSet);
    return stages.sort();
  }, [touchpoints]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Journey Explorer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {availableStages.map(stage => (
                  <SelectItem key={stage} value={stage}>
                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer Journey Cards */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-500 text-center">
                {searchQuery || stageFilter !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : "Start tracking customer touchpoints to see journey maps here."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer) => {
            const { customerTouchpoints, touchpointsByStage } = getCustomerJourney(customer.id);
            const journeyScore = getJourneyScore(customer.id);
            const currentStage = getCurrentStage(customer.id);
            const isExpanded = expandedCustomer === customer.id;

            return (
              <Card key={customer.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {customer.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">{customer.name}</h3>
                          <Badge className={stageColors[currentStage] || "bg-gray-100 text-gray-800"}>
                            {currentStage.charAt(0).toUpperCase() + currentStage.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Mail className="mr-1 h-3 w-3" />
                            {customer.email}
                          </span>
                          {customer.company && (
                            <span className="flex items-center">
                              <Building className="mr-1 h-3 w-3" />
                              {customer.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-sm font-semibold">Journey Score</div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-bold">{journeyScore}/100</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Journey Overview */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">{customerTouchpoints.length}</span> touchpoints
                      {customerTouchpoints.length > 0 && (
                        <>
                          {" • "}
                          <span>Last activity {format(new Date(customerTouchpoints[customerTouchpoints.length - 1]?.createdAt || new Date()), "MMM d, yyyy")}</span>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCustomerSelect(customer)}
                      className={selectedCustomer?.id === customer.id ? "bg-primary/10 border-primary" : ""}
                    >
                      View Details
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </div>

                  {/* Expanded Journey Details */}
                  {isExpanded && (
                    <div className="space-y-4 pt-4 border-t">
                      {availableStages.map(stage => {
                        const stageTouchpoints = touchpointsByStage[stage] || [];
                        if (stageTouchpoints.length === 0) return null;

                        return (
                          <div key={stage} className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge className={stageColors[stage] || "bg-gray-100 text-gray-800"}>
                                {stage.charAt(0).toUpperCase() + stage.slice(1)}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {stageTouchpoints.length} touchpoint{stageTouchpoints.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {stageTouchpoints.map((touchpoint, idx) => {
                                const Icon = touchpointIcons[touchpoint.touchpointType] || MapPin;
                                return (
                                  <div key={idx} className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
                                    <Icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-gray-900 truncate">
                                        {touchpoint.description || touchpoint.touchpointType.replace('_', ' ')}
                                      </div>
                                      <div className="text-xs text-gray-500 flex items-center space-x-2">
                                        <span>{touchpoint.channel}</span>
                                        <span>•</span>
                                        <span>{format(new Date(touchpoint.createdAt), "MMM d")}</span>
                                        {touchpoint.score && touchpoint.score > 0 && (
                                          <>
                                            <span>•</span>
                                            <span className="font-medium">{touchpoint.score}/100</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}