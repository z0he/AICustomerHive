import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Play, Pause, Settings, Plus } from "lucide-react";

export default function AutomationWorkflowsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation Workflows</h1>
          <p className="text-gray-600 mt-1">
            Create and manage automated workflows for your marketing campaigns
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sample Workflow */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Welcome Series
              </CardTitle>
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Automated email sequence for new subscribers
            </p>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>5 steps</span>
              <span>142 enrolled</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="outline">
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add more sample workflows */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                Lead Nurturing
              </CardTitle>
              <Badge variant="outline" className="text-gray-600 border-gray-200">
                Paused
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Follow up with qualified leads over 30 days
            </p>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>8 steps</span>
              <span>89 enrolled</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="outline">
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}