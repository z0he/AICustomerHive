import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { 
  FilePlus, 
  FileEdit, 
  Trash, 
  Copy, 
  Eye, 
  BarChart,
  ExternalLink,
  Folder,
  Loader2
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { CreateFormDialog } from '@/components/marketing/CreateFormDialog';
import { FormPreviewDialog } from '@/components/marketing/FormPreviewDialog';
import { MarketingFormStats } from '@/components/marketing/MarketingFormStats';

const MarketingForms = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [clipboardTimeout, setClipboardTimeout] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  // Fetch all marketing forms
  const { 
    data: forms = [], 
    isLoading: isFormsLoading,
    error: formsError 
  } = useQuery({
    queryKey: ['/api/marketing/forms'],
    staleTime: 60000, // 1 minute
  });
  
  // Filter forms based on active tab
  const filteredForms = activeTab === 'all' 
    ? forms 
    : forms.filter((form: any) => form.folder.toLowerCase() === activeTab);

  // Handle form deletion
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: number) => {
      const response = await fetch(`/api/marketing/forms/${formId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete form');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/forms'] });
      toast({
        title: "Form deleted",
        description: "The form has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting form",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Handle copying embed code to clipboard
  const handleCopyEmbedCode = (formId: number, embedCode: string) => {
    navigator.clipboard.writeText(embedCode)
      .then(() => {
        setClipboardTimeout(prev => ({ ...prev, [formId]: true }));
        setTimeout(() => {
          setClipboardTimeout(prev => ({ ...prev, [formId]: false }));
        }, 2000);
        
        toast({
          title: "Copied to clipboard",
          description: "The embed code has been copied to your clipboard.",
        });
      })
      .catch((error) => {
        toast({
          title: "Failed to copy",
          description: "Could not copy the embed code to clipboard.",
          variant: "destructive",
        });
      });
  };

  // Handle form preview
  const handlePreviewForm = (form: any) => {
    setSelectedForm(form);
    setIsPreviewOpen(true);
  };

  return (
    <div className="bg-slate-50 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Marketing Forms</h1>
        <p className="text-slate-500 mt-1">Create and manage forms for your website</p>
      </div>
      
      <div>
          <div className="flex justify-end mb-6">
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsCreateFormOpen(true)}
                className="flex items-center gap-2"
              >
                <FilePlus size={16} />
                Create Form
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList>
              <TabsTrigger value="all">All Forms</TabsTrigger>
              <TabsTrigger value="default">Default</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
              <TabsTrigger value="lead">Lead Generation</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              {isFormsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : formsError ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">
                      Failed to load forms. Please try again later.
                    </p>
                  </CardContent>
                </Card>
              ) : filteredForms.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">
                      No forms found in this category. Create a new form to get started.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setIsCreateFormOpen(true)}
                    >
                      Create Form
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Conversion Rate</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredForms.map((form: any) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Folder size={16} className="text-muted-foreground" />
                          {form.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{form.formType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={form.status === 'active' ? 'success' : 'secondary'} className="capitalize">
                            {form.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{form.views}</TableCell>
                        <TableCell>{form.submissions}</TableCell>
                        <TableCell>{form.conversionRate}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePreviewForm(form)}
                              title="Preview form"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyEmbedCode(form.id, form.embedCode)}
                              title="Copy embed code"
                            >
                              {clipboardTimeout[form.id] ? (
                                <Badge variant="outline" className="rounded-full px-2">
                                  Copied!
                                </Badge>
                              ) : (
                                <Copy size={16} />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit form"
                            >
                              <FileEdit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete form"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this form?')) {
                                  deleteFormMutation.mutate(form.id);
                                }
                              }}
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Form Performance</CardTitle>
              <CardDescription>
                View performance metrics for your marketing forms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketingFormStats />
            </CardContent>
          </Card>
        </div>

      {/* Form Creation Dialog */}
      <CreateFormDialog 
        open={isCreateFormOpen} 
        onOpenChange={setIsCreateFormOpen} 
      />

      {/* Form Preview Dialog */}
      {selectedForm && (
        <FormPreviewDialog 
          open={isPreviewOpen} 
          onOpenChange={setIsPreviewOpen}
          form={selectedForm}
        />
      )}
    </div>
  );
};

export default MarketingForms;