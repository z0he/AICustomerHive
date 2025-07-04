import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Settings, Key, CreditCard } from "lucide-react";
import { Link } from "wouter";

interface UsageData {
  aiPrompts: {
    used: number;
    limit: number;
    hasPersonalKey: boolean;
  };
  emails: {
    used: number;
    limit: number;
    hasPersonalKey: boolean;
  };
  tier: string;
}

interface UsageWarningProps {
  usage: UsageData;
  showFullDashboard?: boolean;
  className?: string;
}

export default function UsageWarning({ usage, showFullDashboard = false, className = "" }: UsageWarningProps) {
  const aiPercentage = usage.aiPrompts.limit > 0 ? (usage.aiPrompts.used / usage.aiPrompts.limit) * 100 : 0;
  const emailPercentage = usage.emails.limit > 0 ? (usage.emails.used / usage.emails.limit) * 100 : 0;
  
  const aiLimitReached = usage.aiPrompts.limit > 0 && usage.aiPrompts.used >= usage.aiPrompts.limit;
  const emailLimitReached = usage.emails.limit > 0 && usage.emails.used >= usage.emails.limit;
  const aiNearLimit = aiPercentage >= 80 && !aiLimitReached;
  const emailNearLimit = emailPercentage >= 80 && !emailLimitReached;

  const showWarning = aiLimitReached || emailLimitReached || aiNearLimit || emailNearLimit;

  if (!showWarning && !showFullDashboard) {
    return null;
  }

  return (
    <div className={className}>
      {showFullDashboard && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Usage Dashboard
              <Badge variant={usage.tier === 'free' ? 'secondary' : 'default'}>
                {usage.tier === 'free' ? 'Free Tier' : usage.tier.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Prompts Usage */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">AI Prompts</span>
                <span className="text-sm text-muted-foreground">
                  {usage.aiPrompts.used} / {usage.aiPrompts.hasPersonalKey ? '∞' : usage.aiPrompts.limit}
                </span>
              </div>
              {usage.aiPrompts.hasPersonalKey ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">Personal API Key</Badge>
                  <span className="text-sm text-green-600">Unlimited usage</span>
                </div>
              ) : (
                <Progress value={aiPercentage} className="h-2" />
              )}
            </div>

            {/* Email Usage */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Emails Sent</span>
                <span className="text-sm text-muted-foreground">
                  {usage.emails.used} / {usage.emails.hasPersonalKey ? '∞' : usage.emails.limit}
                </span>
              </div>
              {usage.emails.hasPersonalKey ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">Personal API Key</Badge>
                  <span className="text-sm text-green-600">Unlimited usage</span>
                </div>
              ) : (
                <Progress value={emailPercentage} className="h-2" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Alerts */}
      {(aiLimitReached || emailLimitReached) && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Usage Limit Reached</AlertTitle>
          <AlertDescription className="text-red-700">
            {aiLimitReached && emailLimitReached ? (
              "You've reached your AI prompt and email sending limits."
            ) : aiLimitReached ? (
              "You've reached your AI prompt limit."
            ) : (
              "You've reached your email sending limit."
            )}
            {" "}
            To continue using the system, please add your personal API keys or wait for your next billing cycle.
          </AlertDescription>
          <div className="mt-3 flex gap-2">
            <Link href="/settings?tab=integrations">
              <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-100">
                <Settings className="h-4 w-4 mr-1" />
                Add API Keys
              </Button>
            </Link>
            <Button size="sm" variant="outline" disabled className="text-gray-500">
              <CreditCard className="h-4 w-4 mr-1" />
              Upgrade Plan (Coming Soon)
            </Button>
          </div>
        </Alert>
      )}

      {(aiNearLimit || emailNearLimit) && !(aiLimitReached || emailLimitReached) && (
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Approaching Usage Limit</AlertTitle>
          <AlertDescription className="text-amber-700">
            {aiNearLimit && emailNearLimit ? (
              "You're approaching your AI prompt and email sending limits."
            ) : aiNearLimit ? (
              `You've used ${usage.aiPrompts.used} of ${usage.aiPrompts.limit} AI prompts.`
            ) : (
              `You've sent ${usage.emails.used} of ${usage.emails.limit} emails.`
            )}
            {" "}
            Consider adding your personal API keys for unlimited usage.
          </AlertDescription>
          <div className="mt-3 flex gap-2">
            <Link href="/settings?tab=integrations">
              <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                <Settings className="h-4 w-4 mr-1" />
                Add API Keys
              </Button>
            </Link>
          </div>
        </Alert>
      )}
    </div>
  );
}