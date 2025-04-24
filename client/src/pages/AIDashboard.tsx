import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sparkles, Mic, BrainCircuit, Lightbulb, Info, Settings, Key } from 'lucide-react';
import CampaignSuggestions from '@/components/ai/CampaignSuggestions';
import CustomerInsights from '@/components/ai/CustomerInsights';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function AIDashboard() {
  const [activeTab, setActiveTab] = useState('campaign-suggestions');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Check if OpenAI integration is configured with a valid API key
  const { data: hasValidApiKey = false } = useQuery({
    queryKey: ['/api/config/openai/status'],
    refetchOnWindowFocus: false,
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleSaveApiKey = async () => {
    try {
      await apiRequest('/api/config/openai', {
        method: 'POST',
        data: { apiKey }
      });
      setIsSettingsOpen(false);
      
      // Force a refresh to update the API key status
      window.location.reload();
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Capabilities
          </h1>
          <p className="text-muted-foreground mt-1">
            Leverage AI to enhance your marketing and sales activities
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* API Key Settings Card */}
      {isSettingsOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              OpenAI API Configuration
            </CardTitle>
            <CardDescription>
              Connect your OpenAI API key to enable advanced AI features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label htmlFor="apiKey" className="text-sm font-medium">
                  OpenAI API Key
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="p-2 border rounded-md"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is securely stored and never shared with third parties.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKey} disabled={!apiKey.trim().startsWith('sk-')}>
              Save API Key
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* API Key Status */}
      {!hasValidApiKey && !isSettingsOpen && (
        <Alert variant="default" className="bg-muted">
          <Info className="h-4 w-4" />
          <AlertTitle>OpenAI API Key Required</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>
              To use advanced AI features, you need to configure your OpenAI API key.
            </span>
            <Button size="sm" onClick={() => setIsSettingsOpen(true)}>
              Configure API Key
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* AI Features Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaign-suggestions" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Campaign Suggestions
          </TabsTrigger>
          <TabsTrigger value="customer-insights" className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            Customer Insights
            <Badge variant="outline" className="ml-2 hidden md:inline-flex">Premium</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="campaign-suggestions">
          <CampaignSuggestions />
        </TabsContent>
        <TabsContent value="customer-insights">
          <CustomerInsights />
        </TabsContent>
      </Tabs>

      {/* Quick Resources Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voice Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Control your CRM with voice commands. Click the microphone icon to get started.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              <Mic className="h-4 w-4 mr-2" />
              View Voice Command Guide
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Smart Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get AI-powered insights on your campaigns and customer engagement metrics.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              View Analytics
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Learn how to leverage AI features to enhance your CRM experience.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              Explore Resources
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default AIDashboard;