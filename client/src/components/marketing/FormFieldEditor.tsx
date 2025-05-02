import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  Grip,
  Trash2,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  Copy,
} from 'lucide-react';

export interface FormField {
  id: string;
  type: string;
  name: string;
  label: string;
  placeholder?: string;
  required: boolean;
  order: number;
  options?: { label: string; value: string }[];
  defaultValue?: string;
  helpText?: string;
}

interface FormFieldEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

export function FormFieldEditor({ fields, onChange }: FormFieldEditorProps) {
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isAddingField, setIsAddingField] = useState(false);

  // Generate unique ID for new fields
  const generateId = () => {
    return Date.now().toString();
  };

  // Field type options
  const fieldTypes = [
    { value: 'text', label: 'Single Line Text' },
    { value: 'textarea', label: 'Paragraph Text' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'phone', label: 'Phone' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'date', label: 'Date Picker' },
    { value: 'hidden', label: 'Hidden Field' },
  ];

  // Add new field
  const handleAddField = () => {
    const newField: FormField = {
      id: generateId(),
      type: 'text',
      name: '',
      label: '',
      placeholder: '',
      required: false,
      order: fields.length + 1,
    };
    setEditingField(newField);
    setIsAddingField(true);
  };

  // Save field changes
  const handleSaveField = () => {
    if (!editingField) return;

    let updatedFields = [...fields];
    if (isAddingField) {
      updatedFields.push(editingField);
    } else {
      updatedFields = updatedFields.map(field => 
        field.id === editingField.id ? editingField : field
      );
    }

    // Sort by order
    updatedFields = updatedFields.sort((a, b) => a.order - b.order);
    
    onChange(updatedFields);
    setEditingField(null);
    setIsAddingField(false);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingField(null);
    setIsAddingField(false);
  };

  // Edit existing field
  const handleEditField = (field: FormField) => {
    setEditingField({ ...field });
    setIsAddingField(false);
  };

  // Delete field
  const handleDeleteField = (fieldId: string) => {
    const updatedFields = fields.filter(field => field.id !== fieldId);
    // Re-number the order
    const reorderedFields = updatedFields.map((field, index) => ({
      ...field,
      order: index + 1,
    }));
    onChange(reorderedFields);
  };

  // Duplicate field
  const handleDuplicateField = (field: FormField) => {
    const newField = {
      ...field,
      id: generateId(),
      name: `${field.name}_copy`,
      label: `${field.label} (Copy)`,
      order: fields.length + 1,
    };
    onChange([...fields, newField]);
  };

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order property
    const reorderedFields = items.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    onChange(reorderedFields);
  };

  // Move field up or down
  const moveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newFields = [...fields];
    const field = newFields[index];
    newFields.splice(index, 1);
    newFields.splice(newIndex, 0, field);

    // Update order property
    const reorderedFields = newFields.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    onChange(reorderedFields);
  };

  // Update field property
  const updateEditingField = (property: keyof FormField, value: any) => {
    if (!editingField) return;
    setEditingField({
      ...editingField,
      [property]: value,
    });
  };

  // Add option to select/radio fields
  const handleAddOption = () => {
    if (!editingField) return;
    const options = editingField.options || [];
    setEditingField({
      ...editingField,
      options: [
        ...options,
        { label: '', value: '' },
      ],
    });
  };

  // Update option in select/radio fields
  const handleUpdateOption = (index: number, field: 'label' | 'value', value: string) => {
    if (!editingField || !editingField.options) return;
    const newOptions = [...editingField.options];
    newOptions[index] = {
      ...newOptions[index],
      [field]: value,
    };
    setEditingField({
      ...editingField,
      options: newOptions,
    });
  };

  // Remove option from select/radio fields
  const handleRemoveOption = (index: number) => {
    if (!editingField || !editingField.options) return;
    const newOptions = [...editingField.options];
    newOptions.splice(index, 1);
    setEditingField({
      ...editingField,
      options: newOptions,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Form Fields</h3>
        <Button 
          onClick={handleAddField}
          variant="outline"
          className="flex items-center gap-2"
          disabled={!!editingField}
        >
          <PlusCircle size={16} />
          Add Field
        </Button>
      </div>

      {/* Field list */}
      {fields.length === 0 && !editingField ? (
        <div className="text-center py-8 border border-dashed rounded-md">
          <p className="text-muted-foreground">No fields added yet. Click "Add Field" to get started.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="fields">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {fields.map((field, index) => (
                  <Draggable key={field.id} draggableId={field.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="border rounded-md p-3 bg-background flex items-center gap-3"
                      >
                        <div 
                          {...provided.dragHandleProps}
                          className="cursor-grab"
                        >
                          <Grip size={16} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className="text-sm font-medium">{field.label || 'Untitled Field'}</div>
                            {field.required && (
                              <span className="ml-1 text-destructive">*</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                            <span className="capitalize bg-muted px-1.5 py-0.5 rounded-sm">
                              {fieldTypes.find(t => t.value === field.type)?.label || field.type}
                            </span>
                            <span className="text-muted-foreground">{field.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveField(index, 'up')}
                            disabled={index === 0}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowUp size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveField(index, 'down')}
                            disabled={index === fields.length - 1}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowDown size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateField(field)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditField(field)}
                            className="h-8 w-8 p-0"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteField(field.id)}
                            className="h-8 w-8 p-0 text-destructive"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Field editor */}
      {editingField && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{isAddingField ? 'Add Field' : 'Edit Field'}</CardTitle>
            <CardDescription>Configure the field properties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select
                  value={editingField.type}
                  onValueChange={(value) => updateEditingField('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Field Name (API name)</Label>
                <Input
                  value={editingField.name}
                  onChange={(e) => updateEditingField('name', e.target.value)}
                  placeholder="e.g. first_name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Field Label</Label>
              <Input
                value={editingField.label}
                onChange={(e) => updateEditingField('label', e.target.value)}
                placeholder="e.g. First Name"
              />
            </div>

            <div className="space-y-2">
              <Label>Placeholder Text</Label>
              <Input
                value={editingField.placeholder || ''}
                onChange={(e) => updateEditingField('placeholder', e.target.value)}
                placeholder="e.g. Enter your first name"
              />
            </div>

            {(editingField.type === 'select' || editingField.type === 'radio') && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Options</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddOption}
                    className="h-8"
                  >
                    Add Option
                  </Button>
                </div>
                {(!editingField.options || editingField.options.length === 0) ? (
                  <div className="text-sm text-muted-foreground">
                    No options added yet. Click "Add Option" to add options.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editingField.options?.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={option.label}
                          onChange={(e) => handleUpdateOption(index, 'label', e.target.value)}
                          placeholder="Option Label"
                          className="flex-1"
                        />
                        <Input
                          value={option.value}
                          onChange={(e) => handleUpdateOption(index, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Help Text (Optional)</Label>
              <Input
                value={editingField.helpText || ''}
                onChange={(e) => updateEditingField('helpText', e.target.value)}
                placeholder="Additional instructions for this field"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="required"
                checked={editingField.required}
                onCheckedChange={(checked) => updateEditingField('required', checked)}
              />
              <Label htmlFor="required">Required Field</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveField}>
              {isAddingField ? 'Add Field' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}