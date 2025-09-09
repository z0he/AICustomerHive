import React, { useState, useRef, ChangeEvent } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Upload, AlertCircle, CheckCircle, FilePlus, FileText, FileUp } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import FieldMapping from '@/components/data/FieldMapping';

const CustomerData = () => {
  const { toast } = useToast();
  const [importData, setImportData] = useState<string>('');
  const [activeTab, setActiveTab] = useState('export');
  const [importMethod, setImportMethod] = useState<'json' | 'csv'>('json');
  const [importResult, setImportResult] = useState<{imported: number; errors: any[]} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for CSV mapping
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [parsedCsvData, setParsedCsvData] = useState<any[]>([]);

  // Query to get customer export data
  const { data: exportData, isLoading: isExportLoading, error: exportError } = useQuery({
    queryKey: ['/api/customers/export'],
    enabled: activeTab === 'export',
  });

  // Mutation for importing customer data with JSON
  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const response = await fetch('/api/customers/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import customer data');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      toast({
        title: 'Import Successful',
        description: `Imported ${data.imported} customer records with ${data.errors.length} errors.`,
        variant: 'success',
      });
      // Invalidate customer-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for importing customer data with CSV file
  const importCSVMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import CSV data');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      toast({
        title: 'CSV Import Successful',
        description: `Imported ${data.imported} customer records with ${data.errors.length} errors.`,
        variant: 'success',
      });
      // Invalidate customer-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'CSV Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle JSON export data download
  const handleExportDownload = () => {
    if (!exportData) return;
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Export Downloaded',
      description: 'Customer data has been exported successfully.',
    });
  };

  // Handle CSV export data download
  const handleCSVDownload = () => {
    if (!exportData || !exportData.data) return;
    
    // Get field names from metadata or first item
    const fields = exportData.metadata?.fields || Object.keys(exportData.data[0] || {});
    
    // Create CSV header row
    let csv = fields.join(',') + '\n';
    
    // Add data rows
    exportData.data.forEach((customer: any) => {
      const row = fields.map(field => {
        // Handle nested or missing fields
        const value = customer[field];
        // Escape and quote strings that contain commas or quotes
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        // Format dates
        if (value instanceof Date) {
          return value.toISOString();
        }
        // Handle arrays
        if (Array.isArray(value)) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',');
      
      csv += row + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'CSV Downloaded',
      description: 'Customer data has been exported as CSV successfully.',
    });
  };

  // Handle import action
  const handleImport = () => {
    try {
      const data = JSON.parse(importData);
      
      if (!Array.isArray(data)) {
        throw new Error('Import data must be an array of customer records');
      }
      
      importMutation.mutate(data);
    } catch (e) {
      toast({
        title: 'Invalid JSON',
        description: 'The import data must be valid JSON format.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle file upload click
  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file change event
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'csv') {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a CSV file.',
        variant: 'destructive',
      });
      return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'File size should be less than 5MB.',
        variant: 'destructive',
      });
      return;
    }
    
    // Store the file for later use
    setCsvFile(file);
    
    // Parse CSV headers for mapping
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        if (!csvText) {
          throw new Error('Failed to read CSV file');
        }
        
        // Get the first line (headers)
        const lines = csvText.split('\n');
        if (lines.length === 0) {
          throw new Error('CSV file is empty');
        }
        
        // Parse headers - handle quoted headers with commas inside
        const headerLine = lines[0].trim();
        const headers: string[] = [];
        let currentHeader = '';
        let inQuotes = false;
        
        for (let i = 0; i < headerLine.length; i++) {
          const char = headerLine[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            headers.push(currentHeader.trim().replace(/^"|"$/g, ''));
            currentHeader = '';
          } else {
            currentHeader += char;
          }
        }
        
        // Add the last header
        if (currentHeader) {
          headers.push(currentHeader.trim().replace(/^"|"$/g, ''));
        }
        
        // Save headers for mapping
        setCsvHeaders(headers);
        
        // Parse sample data for preview (up to 3 rows)
        const dataRows = lines.slice(1, 4).filter(line => line.trim());
        const parsedData: Record<string, string>[] = [];
        
        dataRows.forEach(row => {
          const values: string[] = [];
          let currentValue = '';
          inQuotes = false;
          
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim().replace(/^"|"$/g, ''));
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          
          // Add the last value
          if (currentValue || values.length > 0) {
            values.push(currentValue.trim().replace(/^"|"$/g, ''));
            
            // Create object with headers as keys
            const rowData: Record<string, string> = {};
            headers.forEach((header, index) => {
              if (index < values.length) {
                rowData[header] = values[index];
              }
            });
            
            parsedData.push(rowData);
          }
        });
        
        // Save parsed data
        setParsedCsvData(parsedData);
        
        // Show field mapping UI
        setShowFieldMapping(true);
        
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: 'Invalid CSV Format',
          description: 'Failed to parse CSV headers. Please check your file format.',
          variant: 'destructive',
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: 'Error Reading File',
        description: 'Failed to read the CSV file. Please try again.',
        variant: 'destructive',
      });
    };
    
    reader.readAsText(file);
  };

  // Mutation for importing customer data with mapped CSV file
  const importMappedCSVMutation = useMutation({
    mutationFn: async ({ 
      data, 
      mapping 
    }: { 
      data: any[]; 
      mapping: Record<string, string> 
    }) => {
      // Extract unmapped fields if any were identified
      const unmappedFieldsStr = mapping["__unmapped_fields"];
      const unmappedFields = unmappedFieldsStr ? unmappedFieldsStr.split(',') : [];
      
      // Remove the special mapping entry before proceeding
      const cleanMapping = { ...mapping };
      if (unmappedFieldsStr) {
        delete cleanMapping["__unmapped_fields"];
      }
      
      // Transform data according to the mapping
      const mappedData = data.map(record => {
        const mappedRecord: Record<string, any> = {};
        
        // Apply mapping - skip empty source fields (which means "Don't import")
        Object.entries(cleanMapping).forEach(([targetField, sourceField]) => {
          if (sourceField && sourceField !== "" && record[sourceField] !== undefined) {
            mappedRecord[targetField] = record[sourceField];
          }
        });
        
        // If there are unmapped fields, collect them into customFields
        if (unmappedFields.length > 0) {
          const customFieldsObj: Record<string, any> = {};
          
          unmappedFields.forEach(field => {
            if (record[field] !== undefined) {
              customFieldsObj[field] = record[field];
            }
          });
          
          // Only add customFields if there are any values
          if (Object.keys(customFieldsObj).length > 0) {
            mappedRecord.customFields = customFieldsObj;
          }
        }
        
        return mappedRecord;
      });
      
      // Separate contacts into leads and customers based on lifecycleStage
      const leads: Record<string, any>[] = [];
      const customers: Record<string, any>[] = [];
      
      mappedData.forEach(record => {
        // Check lifecycleStage to determine if lead or customer
        const stage = record.lifecycleStage?.toLowerCase();
        if (stage && (stage === 'lead' || stage === 'prospect' || stage === 'opportunity')) {
          leads.push(record);
        } else {
          customers.push(record);
        }
      });

      // Import data via the appropriate endpoints
      const results: { imported: number, errors: any[] } = { imported: 0, errors: [] };

      // Import customers if any
      if (customers.length > 0) {
        const customerResponse = await fetch('/api/customers/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: customers }),
        });
        
        if (!customerResponse.ok) {
          const errorData = await customerResponse.json();
          throw new Error(errorData.message || 'Failed to import customer data');
        }
        
        const customerResult = await customerResponse.json();
        results.imported += customerResult.imported;
        results.errors = [...results.errors, ...customerResult.errors];
      }
      
      // Import leads if any
      if (leads.length > 0) {
        const leadResponse = await fetch('/api/leads/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: leads }),
        });
        
        if (!leadResponse.ok) {
          const errorData = await leadResponse.json();
          throw new Error(errorData.message || 'Failed to import lead data');
        }
        
        const leadResult = await leadResponse.json();
        results.imported += leadResult.imported;
        results.errors = [...results.errors, ...leadResult.errors];
      }
      
      // Return combined results
      return results;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setShowFieldMapping(false);
      setCsvFile(null);
      setCsvHeaders([]);
      setParsedCsvData([]);
      
      toast({
        title: 'Import Successful',
        description: `Imported ${data.imported} records with ${data.errors.length} errors.`,
        variant: 'default',
      });
      // Invalidate both customer and lead queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'CSV Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handle completed field mapping
  const handleFieldMappingComplete = (mapping: Record<string, string>) => {
    // Read the entire CSV file and parse with mapping
    if (!csvFile) {
      toast({
        title: 'Error',
        description: 'No CSV file found. Please upload again.',
        variant: 'destructive',
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        if (!csvText) {
          throw new Error('Failed to read CSV file');
        }
        
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length <= 1) {
          throw new Error('CSV file has no data rows');
        }
        
        // Skip header row, process data rows
        const dataRows = lines.slice(1);
        const parsedRecords: Record<string, string>[] = [];
        
        dataRows.forEach(row => {
          const values: string[] = [];
          let currentValue = '';
          let inQuotes = false;
          
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim().replace(/^"|"$/g, ''));
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          
          // Add the last value
          if (currentValue || values.length > 0) {
            values.push(currentValue.trim().replace(/^"|"$/g, ''));
            
            // Create object with headers as keys
            const rowData: Record<string, string> = {};
            csvHeaders.forEach((header, index) => {
              if (index < values.length) {
                rowData[header] = values[index];
              }
            });
            
            parsedRecords.push(rowData);
          }
        });
        
        // Apply mapping and import
        importMappedCSVMutation.mutate({ 
          data: parsedRecords, 
          mapping 
        });
        
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: 'CSV Parsing Error',
          description: error instanceof Error ? error.message : 'Failed to parse CSV data',
          variant: 'destructive',
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: 'Error Reading File',
        description: 'Failed to read the CSV file. Please try again.',
        variant: 'destructive',
      });
    };
    
    reader.readAsText(csvFile);
  };
  
  // Handle cancellation of field mapping
  const handleFieldMappingCancel = () => {
    setShowFieldMapping(false);
    setCsvFile(null);
    setCsvHeaders([]);
    setParsedCsvData([]);
  };

  // Get user data for the header
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Get notifications for the header
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      // Default empty array if API not available
      return [];
    }
  });

  // Get recent campaigns for sidebar
  const { data: recentCampaigns = [] } = useQuery({
    queryKey: ['/api/campaigns/recent'],
    queryFn: async () => {
      // Default empty array if API not available
      return [];
    }
  });

  // Handle logout
  const handleLogout = () => {
    // Clear token and redirect to login
    localStorage.removeItem('auth_token');
    window.location.href = '/auth';
  };

  return (
    <div className="bg-slate-50 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Customer Data Management</h1>
        <p className="text-slate-500 mt-1">Import and export customer data</p>
      </div>
      
      <div>
          <div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>
        
        <TabsContent value="export" className="mt-4">
          <Card>
            <CardHeader className="dialog-header">
              <CardTitle className="dialog-title flex items-center">
                <Download className="mr-2" size={20} />
                Export Customer Data
              </CardTitle>
              <CardDescription>
                Export your customer data for backup or transferring to another system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isExportLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading export data...</span>
                </div>
              ) : exportError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to load export data. Please try again.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-brand-blue uppercase tracking-wide mb-2">Export Summary</h3>
                    <div className="flex flex-wrap gap-4">
                      <div className="bg-brand-blue/10 border border-brand-blue/20 p-4 rounded-lg">
                        <div className="text-sm text-brand-blue/80">Total Customers</div>
                        <div className="text-2xl font-bold text-brand-blue">{exportData?.metadata?.totalCount || exportData?.data?.length || 0}</div>
                      </div>
                      <div className="bg-brand-green/10 border border-brand-green/20 p-4 rounded-lg">
                        <div className="text-sm text-brand-green/80">Export Date</div>
                        <div className="text-md font-medium text-brand-green">
                          {exportData?.metadata?.exportDate 
                            ? new Date(exportData.metadata.exportDate).toLocaleDateString() 
                            : new Date().toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-brand-blue uppercase tracking-wide mb-2">Available Fields</h3>
                    <div className="flex flex-wrap gap-2 p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
                      {exportData?.metadata?.fields?.map((field: string) => (
                        <Badge key={field} className="bg-white border-brand-blue/20 text-brand-blue">{field}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-brand-blue uppercase tracking-wide mb-2">Sample Data (First 3 records)</h3>
                    <div className="code-sample data-container bg-white border p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(exportData?.data?.slice(0, 3), null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('import')}>
                Switch to Import
              </Button>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleCSVDownload} 
                  disabled={isExportLoading || !!exportError}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
                <Button 
                  onClick={handleExportDownload} 
                  disabled={isExportLoading || !!exportError}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download JSON
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="import" className="mt-4">
          <Card>
            <CardHeader className="dialog-header">
              <CardTitle className="dialog-title flex items-center">
                <Upload className="mr-2" size={20} />
                Import Customer Data
              </CardTitle>
              <CardDescription>
                Import customer data from JSON or CSV format. Choose your preferred import method below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showFieldMapping && csvHeaders.length > 0 ? (
                <FieldMapping 
                  sourceFields={csvHeaders}
                  targetFields={exportData?.metadata?.fields || [
                    'email', 'firstName', 'lastName', 'name', 'phone', 'company', 
                    'jobTitle', 'linkedinUrl', 'lifecycleStage', 'leadStatus',
                    'contactIndustry', 'contactOwner', 'contactSource', 'contactType',
                    'country', 'legalBasis', 'status'
                  ]}
                  onComplete={handleFieldMappingComplete}
                  onCancel={handleFieldMappingCancel}
                />
              ) : (
                <>
                  {/* Import Method Selection */}
                  <div className="mb-6">
                    <Label className="block text-sm font-medium mb-2">Import Method</Label>
                    <div className="flex space-x-4">
                      <div 
                        className={`flex-1 p-4 border rounded-md cursor-pointer flex flex-col items-center ${importMethod === 'json' ? 'border-primary bg-primary/5' : 'border-input'}`}
                        onClick={() => setImportMethod('json')}
                      >
                        <FileText size={24} className={importMethod === 'json' ? 'text-primary' : 'text-muted-foreground'} />
                        <span className="mt-2 font-medium">JSON</span>
                        <span className="text-xs text-muted-foreground mt-1">Paste JSON data</span>
                      </div>
                      <div 
                        className={`flex-1 p-4 border rounded-md cursor-pointer flex flex-col items-center ${importMethod === 'csv' ? 'border-primary bg-primary/5' : 'border-input'}`}
                        onClick={() => setImportMethod('csv')}
                      >
                        <FileUp size={24} className={importMethod === 'csv' ? 'text-primary' : 'text-muted-foreground'} />
                        <span className="mt-2 font-medium">CSV</span>
                        <span className="text-xs text-muted-foreground mt-1">Upload CSV file</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* JSON Import Method */}
                  {importMethod === 'json' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        JSON Data
                      </label>
                      <textarea
                        className="min-h-[200px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm code-sample font-mono shadow-sm"
                        placeholder='[{ "firstName": "John", "lastName": "Doe", "email": "john@example.com" }, ...]'
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Paste JSON data containing an array of customer records. Each record must have at least firstName, lastName, and email fields.
                      </p>
                    </div>
                  )}
                  
                  {/* CSV Import Method */}
                  {importMethod === 'csv' && (
                    <div className="mb-4">
                      <div className="border-2 border-dashed border-brand-green/30 rounded-md p-8 text-center bg-brand-green/5">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          accept=".csv" 
                          className="hidden" 
                        />
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="p-3 bg-primary/10 rounded-full">
                            <FileUp size={28} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              CSV file (max 5MB)
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            onClick={handleFileUploadClick}
                          >
                            Select CSV File
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Upload a CSV file with customer data. Don't worry if your column names don't match exactly - you'll be able to map them in the next step.
                      </p>
                    </div>
                  )}
                </>
              )}
              
              {/* Import Results */}
              {importResult && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Import Results</h3>
                  <div className="flex gap-4 mb-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Imported Successfully</div>
                      <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Errors</div>
                      <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                    </div>
                  </div>
                  
                  {importResult.errors.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium mb-2">Error Details</h4>
                      <div className="bg-muted p-4 rounded-lg max-h-[200px] overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <div key={index} className="mb-2 pb-2 border-b border-border last:border-0">
                            <p className="text-sm text-red-600">{error.error}</p>
                            <details className="mt-1">
                              <summary className="text-xs cursor-pointer">Record Data</summary>
                              <pre className="text-xs mt-1 p-2 bg-background rounded">{JSON.stringify(error.record, null, 2)}</pre>
                            </details>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('export')}>
                Switch to Export
              </Button>
              
              {importMethod === 'json' && (
                <Button 
                  onClick={handleImport} 
                  disabled={!importData.trim() || importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import JSON Data
                    </>
                  )}
                </Button>
              )}
              
              {importMethod === 'csv' && (
                <Button 
                  onClick={handleFileUploadClick}
                  disabled={importCSVMutation.isPending}
                >
                  {importCSVMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload CSV File
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CustomerData;