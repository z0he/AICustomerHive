import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Save, Check, X } from "lucide-react";

interface UserConfig {
  hasOpenAI: boolean;
  hasMailgun: boolean;
  mailgunDomain: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function Settings() {
  const [config, setConfig] = useState<UserConfig>({
    hasOpenAI: false,
    hasMailgun: false,
    mailgunDomain: null
  });
  const [openaiKey, setOpenaiKey] = useState("");
  const [mailgunKey, setMailgunKey] = useState("");
  const [mailgunDomain, setMailgunDomain] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showMailgunKey, setShowMailgunKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserConfig();
  }, []);

  const fetchUserConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/config', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setMailgunDomain(data.mailgunDomain || "");
      } else {
        console.error('Failed to fetch user config');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast({
        title: "Error",
        description: "Failed to load configuration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    try {
      const payload: any = {};
      
      if (openaiKey.trim()) {
        payload.openaiApiKey = openaiKey.trim();
      }
      
      if (mailgunKey.trim()) {
        payload.mailgunApiKey = mailgunKey.trim();
      }
      
      if (mailgunDomain.trim()) {
        payload.mailgunDomain = mailgunDomain.trim();
      }

      const response = await fetch('/api/user/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setConfig({
          hasOpenAI: data.hasOpenAI,
          hasMailgun: data.hasMailgun,
          mailgunDomain: mailgunDomain.trim() || null
        });
        
        // Clear the input fields after successful save
        setOpenaiKey("");
        setMailgunKey("");
        
        toast({
          title: "Success",
          description: "Configuration saved successfully",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Loading configuration...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Configure your API keys for AI-powered features and email delivery.
                  All keys are stored securely and encrypted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* OpenAI Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">OpenAI API Key</Label>
                      <p className="text-sm text-muted-foreground">
                        Required for AI-powered voice commands and intelligent insights
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {config.hasOpenAI ? (
                        <div className="flex items-center text-green-600">
                          <Check className="h-4 w-4 mr-1" />
                          <span className="text-sm">Configured</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <X className="h-4 w-4 mr-1" />
                          <span className="text-sm">Not configured</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="openai-key">OpenAI API Key</Label>
                    <div className="relative">
                      <Input
                        id="openai-key"
                        type={showOpenaiKey ? "text" : "password"}
                        placeholder={config.hasOpenAI ? "••••••••••••••••••••••••••••••••••••••••••••••••••••" : "sk-..."}
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      >
                        {showOpenaiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>
                    </p>
                  </div>
                </div>

                {/* Mailgun Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Mailgun Configuration</Label>
                      <p className="text-sm text-muted-foreground">
                        Required for email campaigns and automated messaging
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {config.hasMailgun ? (
                        <div className="flex items-center text-green-600">
                          <Check className="h-4 w-4 mr-1" />
                          <span className="text-sm">Configured</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <X className="h-4 w-4 mr-1" />
                          <span className="text-sm">Not configured</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mailgun-key">Mailgun API Key</Label>
                      <div className="relative">
                        <Input
                          id="mailgun-key"
                          type={showMailgunKey ? "text" : "password"}
                          placeholder={config.hasMailgun ? "••••••••••••••••••••••••••••••••••••••••••••••••••••" : "key-..."}
                          value={mailgunKey}
                          onChange={(e) => setMailgunKey(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowMailgunKey(!showMailgunKey)}
                        >
                          {showMailgunKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mailgun-domain">Mailgun Domain</Label>
                      <Input
                        id="mailgun-domain"
                        type="text"
                        placeholder="mg.yourdomain.com"
                        value={mailgunDomain}
                        onChange={(e) => setMailgunDomain(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Get your credentials from <a href="https://app.mailgun.com/app/sending/domains" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mailgun Dashboard</a>
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={saveConfiguration} 
                    disabled={isSaving || (!openaiKey.trim() && !mailgunKey.trim() && !mailgunDomain.trim())}
                    className="min-w-[120px]"
                  >
                    {isSaving ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Save className="h-4 w-4 mr-2" />
                        Save Configuration
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>
                  Customize your experience and notification settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Preference settings will be available in a future update.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}