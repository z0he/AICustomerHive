import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Copy, CopyCheck, Eye, Code } from 'lucide-react';

interface FormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: any;
}

export function FormPreviewDialog({ open, onOpenChange, form }: FormPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [embedCodeCopied, setEmbedCodeCopied] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: any, value: any) => {
    setFormState({
      ...formState,
      [field.name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitAttempted(true);

    // Check if required fields are filled
    const requiredFields = form.formFields.filter((field: any) => field.required);
    const missingFields = requiredFields.filter((field: any) => !formState[field.name]);
    
    if (missingFields.length === 0) {
      // Form submission successful
      setShowSuccess(true);
      
      toast({
        title: "Form submitted",
        description: "Your form has been successfully submitted in preview mode.",
      });
    } else {
      toast({
        title: "Form validation failed",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
    }
  };

  const resetPreview = () => {
    setFormState({});
    setIsSubmitAttempted(false);
    setShowSuccess(false);
  };

  const renderField = (field: any) => {
    const isInvalid = isSubmitAttempted && field.required && !formState[field.name];
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'phone':
      case 'date':
        return (
          <div className="space-y-2" key={field.id}>
            <Label className="flex items-center">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              type={field.type}
              placeholder={field.placeholder}
              value={formState[field.name] || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              aria-invalid={isInvalid}
              className={isInvalid ? 'border-destructive' : ''}
            />
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
            {isInvalid && (
              <p className="text-xs text-destructive">This field is required</p>
            )}
          </div>
        );
      
      case 'textarea':
        return (
          <div className="space-y-2" key={field.id}>
            <Label className="flex items-center">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              placeholder={field.placeholder}
              value={formState[field.name] || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className={isInvalid ? 'border-destructive' : ''}
            />
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
            {isInvalid && (
              <p className="text-xs text-destructive">This field is required</p>
            )}
          </div>
        );
      
      case 'select':
        return (
          <div className="space-y-2" key={field.id}>
            <Label className="flex items-center">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={formState[field.name] || ''}
              onValueChange={(value) => handleInputChange(field, value)}
            >
              <SelectTrigger className={isInvalid ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: any, index: number) => (
                  <SelectItem key={index} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
            {isInvalid && (
              <p className="text-xs text-destructive">This field is required</p>
            )}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2" key={field.id}>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`checkbox-${field.id}`}
                checked={formState[field.name] || false}
                onCheckedChange={(checked) => handleInputChange(field, checked)}
              />
              <Label 
                htmlFor={`checkbox-${field.id}`}
                className={field.required ? 'after:content-["*"] after:ml-0.5 after:text-destructive' : ''}
              >
                {field.label}
              </Label>
            </div>
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
            {isInvalid && (
              <p className="text-xs text-destructive">This field is required</p>
            )}
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2" key={field.id}>
            <Label className="flex items-center">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <RadioGroup
              value={formState[field.name] || ''}
              onValueChange={(value) => handleInputChange(field, value)}
            >
              {field.options?.map((option: any, index: number) => (
                <div className="flex items-center space-x-2" key={index}>
                  <RadioGroupItem value={option.value} id={`radio-${field.id}-${index}`} />
                  <Label htmlFor={`radio-${field.id}-${index}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
            {isInvalid && (
              <p className="text-xs text-destructive">This field is required</p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  const copyEmbedCode = () => {
    if (form.embedCode) {
      navigator.clipboard.writeText(form.embedCode)
        .then(() => {
          setEmbedCodeCopied(true);
          setTimeout(() => setEmbedCodeCopied(false), 2000);
          toast({
            title: "Copied to clipboard",
            description: "The embed code has been copied to your clipboard.",
          });
        })
        .catch(() => {
          toast({
            title: "Failed to copy",
            description: "Could not copy the embed code to clipboard.",
            variant: "destructive",
          });
        });
    }
  };

  // Generate embed code for preview
  const generateEmbedCode = () => {
    return `<!-- Form Embed Code for ${form.name} -->
<script src="${window.location.origin}/api/marketing/forms/embed/${form.id}.js" async></script>
<div id="form-container-${form.id}" class="crm-form-container"></div>`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Form Preview: {form.name}</DialogTitle>
          <DialogDescription>
            This is how your form will appear to website visitors.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="preview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye size={16} />
              Preview
            </TabsTrigger>
            <TabsTrigger value="embed" className="flex items-center gap-1">
              <Code size={16} />
              Embed Code
            </TabsTrigger>
          </TabsList>
          
          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            {!showSuccess ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="max-w-xl mx-auto">
                    <h3 className="text-xl font-semibold mb-2">{form.title}</h3>
                    {form.description && (
                      <p className="text-muted-foreground mb-6">{form.description}</p>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Render all form fields */}
                      {form.formFields.sort((a: any, b: any) => a.order - b.order).map(renderField)}
                      
                      <Button type="submit" className="w-full mt-4">
                        {form.submitButtonText || 'Submit'}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="max-w-xl mx-auto text-center py-8">
                    <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-2 mb-4">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{form.successMessage || 'Thank you for your submission!'}</h3>
                    <Button variant="outline" onClick={resetPreview}>
                      Reset Form
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Embed Code Tab */}
          <TabsContent value="embed">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Embed Code</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyEmbedCode}
                      className="flex items-center gap-1"
                    >
                      {embedCodeCopied ? <CopyCheck size={16} /> : <Copy size={16} />}
                      {embedCodeCopied ? 'Copied!' : 'Copy Code'}
                    </Button>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm">{form.embedCode || generateEmbedCode()}</pre>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Copy and paste this code into your website where you want the form to appear.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}