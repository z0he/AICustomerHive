import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FieldMappingProps {
  sourceFields: string[];  // Column headers from the CSV
  targetFields: string[];  // Required fields in the CRM
  onComplete: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

const FieldMapping: React.FC<FieldMappingProps> = ({ 
  sourceFields, 
  targetFields, 
  onComplete, 
  onCancel 
}) => {
  // Initialize mapping with empty values
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [mappingErrors, setMappingErrors] = useState<string[]>([]);
  
  // Try to auto-map fields that have similar names
  useEffect(() => {
    const initialMapping: Record<string, string> = {};
    
    // Auto-map exact matches and close matches
    targetFields.forEach(targetField => {
      // Try to find exact match
      const exactMatch = sourceFields.find(sourceField => 
        sourceField.toLowerCase() === targetField.toLowerCase()
      );
      
      if (exactMatch) {
        initialMapping[targetField] = exactMatch;
        return;
      }
      
      // Try to find close match (e.g. "first_name" for "firstName")
      const closeMatches = sourceFields.filter(sourceField => {
        const sourceNormalized = sourceField.toLowerCase().replace(/[_\s-]/g, '');
        const targetNormalized = targetField.toLowerCase();
        return sourceNormalized === targetNormalized || 
               sourceNormalized.includes(targetNormalized) || 
               targetNormalized.includes(sourceNormalized);
      });
      
      if (closeMatches.length === 1) {
        initialMapping[targetField] = closeMatches[0];
      }
    });
    
    setFieldMapping(initialMapping);
  }, [sourceFields, targetFields]);
  
  // Handle field mapping change
  const handleMappingChange = (targetField: string, sourceField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [targetField]: sourceField === "_none_" ? "" : sourceField
    }));
  };
  
  // Complete mapping
  const handleComplete = () => {
    // Validate required fields are mapped
    const requiredFields = ['firstName', 'lastName', 'email'];
    const unmappedRequired = requiredFields.filter(field => !fieldMapping[field]);
    
    if (unmappedRequired.length > 0) {
      setMappingErrors(unmappedRequired.map(field => `${field} is required for import`));
      return;
    }
    
    // Clear any errors
    setMappingErrors([]);
    
    // Call the onComplete callback with the mapping
    onComplete(fieldMapping);
  };
  
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Map Columns to AICRM Fields</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Please match the columns from your file to the appropriate fields in AICRM.
        Fields marked with * are required.
      </p>
      
      {mappingErrors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside">
              {mappingErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2">
        {targetFields.map((targetField) => {
          const isRequired = ['firstName', 'lastName', 'email'].includes(targetField);
          const isMatched = fieldMapping[targetField] && fieldMapping[targetField] !== "";
          
          return (
            <div key={targetField} className="grid grid-cols-5 items-center gap-4">
              <div className="col-span-2">
                <Label className="flex items-center">
                  {targetField}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                  {isMatched && <Check className="h-4 w-4 ml-2 text-green-500" />}
                </Label>
              </div>
              <div className="col-span-3">
                <Select
                  value={fieldMapping[targetField] === "" ? "_none_" : fieldMapping[targetField] || ''}
                  onValueChange={(value) => handleMappingChange(targetField, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">Don't import</SelectItem>
                    {sourceFields.map((sourceField) => (
                      <SelectItem key={sourceField} value={sourceField}>
                        {sourceField}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-end mt-6 space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleComplete}>
          Import with Mapping
        </Button>
      </div>
    </Card>
  );
};

export default FieldMapping;