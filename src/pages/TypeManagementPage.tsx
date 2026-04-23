import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { Switch } from '../components/ui/Switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';
import { Separator } from '../components/ui/Separator';
import {
  Plus, Tags, Edit, Trash2, GripVertical, X, Eye, ListFilter,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { ComponentType, FormField } from '../lib/types';

// ── helpers ───────────────────────────────────────────────────────────────────

function generateFieldId() {
  return Math.random().toString(36).slice(2, 9);
}

const FIELD_TYPE_LABELS: Record<FormField['field_type'], string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  time: 'Time',
  dropdown: 'Dropdown',
};

// Preview of what the dynamic form will look like
function FormPreview({ fields }: { fields: FormField[] }) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No fields added yet — add fields above to preview the form.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.id} className="space-y-1">
          <Label className="text-xs">
            {f.label || <span className="italic text-muted-foreground">Untitled field</span>}
            {f.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {f.field_type === 'text' && <Input disabled placeholder={f.label} className="h-8 text-xs opacity-60" />}
          {f.field_type === 'number' && <Input disabled type="number" placeholder="0" className="h-8 text-xs opacity-60" />}
          {f.field_type === 'date' && <Input disabled type="date" className="h-8 text-xs opacity-60" />}
          {f.field_type === 'time' && <Input disabled type="time" className="h-8 text-xs opacity-60" />}
          {f.field_type === 'dropdown' && (
            <select disabled className="w-full h-8 text-xs rounded-md border border-input bg-transparent px-2 opacity-60">
              <option value="">{(f.options ?? []).length > 0 ? `${f.options!.length} option(s)` : 'No options yet'}</option>
            </select>
          )}
        </div>
      ))}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  type_name: '',
  category: 'Hardware',
  description: '',
  requires_specification: false,
  is_active: true,
};

export function TypeManagementPage() {
  const { componentTypes, components, currentUser, addComponentType, updateComponentType, deleteComponentType } = useStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<ComponentType | null>(null);
  const [editingType, setEditingType] = useState<ComponentType | null>(null);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fields, setFields] = useState<FormField[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'fields'>('info');

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">You do not have permission to view this page.</p>
      </div>
    );
  }

  // ── dialog ──────────────────────────────────────────────────────────────────

  function openDialog(type?: ComponentType) {
    if (type) {
      setEditingType(type);
      setFormData({
        type_name: type.type_name,
        category: type.category || 'Hardware',
        description: type.description || '',
        requires_specification: type.requires_specification,
        is_active: type.is_active,
      });
      setFields(type.fields ?? []);
    } else {
      setEditingType(null);
      setFormData(INITIAL_FORM);
      setFields([]);
    }
    setActiveTab('info');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.type_name.trim()) {
      toast.error('Type name is required');
      return;
    }
    // When spec toggle is OFF, clear all fields so no stale data is saved
    const resolvedFields = formData.requires_specification ? fields : [];
    const payload = { ...formData, fields: resolvedFields };

    if (editingType) {
      // Direct Supabase update with explicit error handling (no silent catch)
      const { error } = await supabase
        .from('component_types')
        .update({
          type_name: payload.type_name,
          category: payload.category,
          description: payload.description,
          requires_specification: payload.requires_specification,
          is_active: payload.is_active,
          fields: resolvedFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingType.id);
      if (error) {
        toast.error(`Failed to save: ${error.message}`);
        return;
      }
      // Also update in-memory store
      updateComponentType(editingType.id, payload);
      toast.success('Component type updated');
    } else {
      addComponentType({ ...payload, created_by: currentUser!.id });
      toast.success('Component type created');
    }
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    const hasComponents = components.some((c) => c.component_type_id === id);
    if (hasComponents) {
      toast.error('Cannot delete: components of this type exist in inventory.');
      return;
    }
    if (window.confirm('Delete this component type?')) {
      deleteComponentType(id);
      toast.success('Deleted');
    }
  }

  // ── field builder actions ───────────────────────────────────────────────────

  function addField() {
    setFields((prev) => [
      ...prev,
      { id: generateFieldId(), label: '', field_type: 'text', required: false },
    ]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function updateField<K extends keyof FormField>(id: string, key: K, value: FormField[K]) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  }

  function moveField(index: number, direction: 'up' | 'down') {
    const next = [...fields];
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setFields(next);
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Type Management</h1>
          <p className="text-muted-foreground">
            Define component types with custom form fields
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Type
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Custom Fields</TableHead>
                <TableHead>Requires Spec</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {componentTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No component types yet. Click "Add Type" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                componentTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Tags className="h-4 w-4 text-muted-foreground" />
                        {type.type_name}
                      </div>
                    </TableCell>
                    <TableCell>{type.category}</TableCell>
                    <TableCell>
                      {(type.fields ?? []).length > 0 ? (
                        <button
                          className="flex items-center gap-1 text-primary text-sm hover:underline"
                          onClick={() => { setPreviewType(type); setPreviewOpen(true); }}
                        >
                          <ListFilter className="h-3.5 w-3.5" />
                          {type.fields.length} field{type.fields.length !== 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.requires_specification ? (
                        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={type.is_active ? 'default' : 'secondary'}
                        className={type.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}
                      >
                        {type.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" title="Preview form"
                          onClick={() => { setPreviewType(type); setPreviewOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openDialog(type)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive"
                          onClick={() => handleDelete(type.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Component Type' : 'Add Component Type'}</DialogTitle>
            <DialogDescription>
              Define the type's basic information and optional custom form fields.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs — Form Fields tab only visible when requires_specification is ON */}
          <div className="flex gap-1 border-b mb-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'info'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Basic Info
            </button>
            {formData.requires_specification && (
              <button
                onClick={() => setActiveTab('fields')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'fields'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Form Fields {fields.length > 0 && `(${fields.length})`}
              </button>
            )}
          </div>

          {/* Tab: Basic Info */}
          {activeTab === 'info' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="type_name">
                  Type Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="type_name"
                  value={formData.type_name}
                  onChange={(e) => setFormData({ ...formData, type_name: e.target.value })}
                  placeholder="e.g., RAM, SSD, NIC, Cable"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Peripheral">Peripheral</SelectItem>
                    <SelectItem value="Accessory">Accessory</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description…"
                  rows={2}
                />
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requires Specification</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Force users to enter specs when adding this component
                    </p>
                  </div>
                  <Switch
                    checked={formData.requires_specification}
                    onCheckedChange={(v) => {
                      setFormData({ ...formData, requires_specification: v });
                      // Auto-navigate: ON → go to fields tab, OFF → go back to info
                      setActiveTab(v ? 'fields' : 'info');
                    }}
                  />
                </div>

                {/* Inline spec field builder — shown when Requires Specification is ON */}
                {formData.requires_specification && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                        Specification Fields
                      </p>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { addField(); setActiveTab('fields'); }}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Field
                      </Button>
                    </div>
                    {fields.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No fields yet — click <strong>Add Field</strong> or switch to the <strong>Form Fields</strong> tab.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        <strong>{fields.length}</strong> field{fields.length !== 1 ? 's' : ''} configured.
                        Switch to the <strong>Form Fields</strong> tab to edit them.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Inactive types won't appear in dropdowns
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
            </div>
          )}

          {/* Tab: Form Fields Builder */}
          {activeTab === 'fields' && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Add custom fields that will appear whenever someone creates a component of this type.
              </p>

              {fields.length === 0 ? (
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <ListFilter className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No fields yet</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={addField}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add First Field
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <React.Fragment key={field.id}>
                    <div
                      className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                    >
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={idx === 0}
                          onClick={() => moveField(idx, 'up')}
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={idx === fields.length - 1}
                          onClick={() => moveField(idx, 'down')}
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(field.id, 'label', e.target.value)}
                          placeholder="Field label (e.g. Capacity, Speed)"
                          className="h-8 text-sm"
                        />
                      </div>

                      {/* Type */}
                      <Select
                        value={field.field_type}
                        onValueChange={(v) => updateField(field.id, 'field_type', v as FormField['field_type'])}
                      >
                        <SelectTrigger className="w-28 h-8 text-sm">
                          <SelectValue displayValue={FIELD_TYPE_LABELS[field.field_type]} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="time">Time</SelectItem>
                          <SelectItem value="dropdown">Dropdown</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Required */}
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(v) => updateField(field.id, 'required', v)}
                          className="scale-75"
                        />
                        <span className="text-xs text-muted-foreground">Req.</span>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive p-1"
                        onClick={() => removeField(field.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Dropdown options editor */}
                    {field.field_type === 'dropdown' && (
                      <div className="ml-8 mt-1.5">
                        <Input
                          value={(field.options ?? []).join(', ')}
                          onChange={(e) =>
                            updateField(field.id, 'options', e.target.value.split(',').map((o) => o.trim()).filter(Boolean))
                          }
                          placeholder="Option 1, Option 2, Option 3 …"
                          className="h-7 text-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-0.5">Comma-separated choices</p>
                      </div>
                    )}
                    </React.Fragment>
                  ))}

                  <Button size="sm" variant="outline" onClick={addField} className="w-full mt-1">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Field
                  </Button>
                </div>
              )}

              {/* Live preview */}
              {fields.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                      Form Preview
                    </p>
                    <div className="border rounded-lg p-4 bg-background">
                      <FormPreview fields={fields} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingType ? 'Update Type' : 'Create Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog (read-only form preview) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Form Preview — {previewType?.type_name}
            </DialogTitle>
            <DialogDescription>
              This is how the form will appear when adding a component of this type.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {previewType ? (
              <FormPreview fields={previewType.fields ?? []} />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={() => { setPreviewOpen(false); openDialog(previewType!); }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
