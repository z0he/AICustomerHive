import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Eye, Search } from "lucide-react";

interface PersonalizationToken {
  token: string;
  label: string;
  category: string;
}

interface PersonalizationPreview {
  processed: string;
  tokens: string[];
}

interface PersonalizationTokenPickerProps {
  onTokenInsert: (token: string) => void;
  initialContent?: string;
  placeholder?: string;
}

export function PersonalizationTokenPicker({ 
  onTokenInsert, 
  initialContent = "",
  placeholder = "Type your message here..."
}: PersonalizationTokenPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [previewContent, setPreviewContent] = useState(initialContent);
  const [sampleEmail, setSampleEmail] = useState("");
  const { toast } = useToast();

  // Fetch available personalization tokens
  const { data: tokens = [], isLoading: tokensLoading } = useQuery({
    queryKey: ['/api/personalization/tokens'],
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (data: { content: string; sampleEmail?: string }) => {
      const response = await fetch('/api/personalization/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to preview content');
      }
      
      return response.json();
    },
  });

  // Filter tokens based on search
  const filteredTokens = tokens.filter((token: PersonalizationToken) =>
    token.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group tokens by category
  const tokensByCategory = filteredTokens.reduce((acc: Record<string, PersonalizationToken[]>, token: PersonalizationToken) => {
    if (!acc[token.category]) {
      acc[token.category] = [];
    }
    acc[token.category].push(token);
    return acc;
  }, {});

  const handleTokenClick = (token: string) => {
    onTokenInsert(`{{${token}}}`);
    toast({
      title: "Token Added",
      description: `Added ${token} to your content`,
    });
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(`{{${token}}}`);
    toast({
      title: "Copied",
      description: `{{${token}}} copied to clipboard`,
    });
  };

  const handlePreview = () => {
    if (!previewContent.trim()) {
      toast({
        title: "No Content",
        description: "Please enter some content to preview",
        variant: "destructive"
      });
      return;
    }

    previewMutation.mutate({
      content: previewContent,
      sampleEmail: sampleEmail || undefined
    });
  };

  useEffect(() => {
    setPreviewContent(initialContent);
  }, [initialContent]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tokens" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tokens">Available Tokens</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {tokensLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading tokens...</span>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(tokensByCategory).map(([category, categoryTokens]) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{category}</CardTitle>
                    <CardDescription className="text-xs">
                      Click to insert, or use the copy button
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 gap-2">
                      {categoryTokens.map((token: PersonalizationToken) => (
                        <div
                          key={token.token}
                          className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50"
                        >
                          <div className="flex-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start h-auto p-0 font-normal"
                              onClick={() => handleTokenClick(token.token)}
                            >
                              <div className="text-left">
                                <div className="font-medium">{token.label}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {`{{${token.token}}}`}
                                </div>
                              </div>
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyToken(token.token)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!tokensLoading && Object.keys(tokensByCategory).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No tokens match your search" : "No personalization tokens available"}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="preview-content">Content to Preview</Label>
              <Textarea
                id="preview-content"
                placeholder={placeholder}
                value={previewContent}
                onChange={(e) => setPreviewContent(e.target.value)}
                className="min-h-32"
              />
            </div>

            <div>
              <Label htmlFor="sample-email">Sample Email (Optional)</Label>
              <Input
                id="sample-email"
                type="email"
                placeholder="john@example.com"
                value={sampleEmail}
                onChange={(e) => setSampleEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use a real email from your CRM to see actual data, or leave empty for sample data
              </p>
            </div>

            <Button 
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="w-full"
            >
              {previewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Personalization
                </>
              )}
            </Button>
          </div>

          {previewMutation.data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview Result</CardTitle>
                <CardDescription>
                  Found {previewMutation.data.tokens.length} personalization tokens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {previewMutation.data.tokens.length > 0 && (
                    <div>
                      <Label className="text-xs font-medium">Tokens Found:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {previewMutation.data.tokens.map((token: string) => (
                          <Badge key={token} variant="secondary" className="text-xs">
                            {token}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-xs font-medium">Personalized Content:</Label>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <pre className="whitespace-pre-wrap text-sm">
                        {previewMutation.data.processed}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {previewMutation.error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">
                  Error: {previewMutation.error.message}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}