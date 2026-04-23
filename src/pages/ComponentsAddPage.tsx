import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useRegionStore } from '../store/useRegionStore';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { useComponentsStore } from '../store/useComponentsStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Separator } from '../components/ui/Separator';
import { toast } from 'sonner';
import { ArrowLeft, Save, X, Loader2 } from 'lucide-react';
import type { ItemStatus, ItemCondition, FormField } from '../lib/types';

export function ComponentsAddPage() {
  const { currentUser, componentTypes, navigate } = useStore();
  const { regions, fetchRegions } = useRegionStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();
  const { createComponent } = useComponentsStore();

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    item_name: '',
    component_type_id: '',
    manufacturer: '',
    model: '',
    part_number: '',
    region_id: '',
    warehouse_id: '',
    bin_location: '',
    quantity: 1,
    minimum_stock: 0,
    reorder_quantity: 0,
    status: 'Working' as ItemStatus,
    condition: 'New' as ItemCondition,
    purchase_date: '',
    purchase_price: '',
    vendor: '',
    warranty_expiry_date: '',
    compatible_with: '',
    notes: '',
    tags: '',
  });

  // Specification field values — keyed by FormField id
  const [specValues, setSpecValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRegions();
    fetchWarehouses();
  }, []);

  // Reset spec values when component type changes
  useEffect(() => {
    setSpecValues({});
  }, [formData.component_type_id]);

  const selectedType = componentTypes.find((ct) => ct.id === formData.component_type_id);
  const specFields: FormField[] = selectedType?.requires_specification ? (selectedType.fields ?? []) : [];

  const filteredWarehouses = warehouses.filter(
    (w) => w.region_id === formData.region_id && w.status === 'active'
  );

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Report ONLY the specific missing fields
    const missing: string[] = [];
    if (!formData.item_name.trim())       missing.push('Component Name');
    if (!formData.component_type_id)      missing.push('Component Type');
    if (!formData.region_id)              missing.push('Region');
    if (!formData.warehouse_id)           missing.push('Warehouse');
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    // Validate required spec fields
    for (const f of specFields) {
      if (f.required && !specValues[f.id]?.trim()) {
        toast.error(`"${f.label}" is required`);
        return;
      }
    }

    setSaving(true);
    try {
      await createComponent({
        item_name: formData.item_name,
        component_type_id: formData.component_type_id,
        manufacturer: formData.manufacturer,
        model: formData.model,
        part_number: formData.part_number,
        specifications: specValues,
        region_id: formData.region_id,
        warehouse_id: formData.warehouse_id,
        installed_in_device_id: null,
        device_slot: '',
        bin_location: formData.bin_location,
        quantity: Number(formData.quantity) || 1,
        reserved_quantity: 0,
        minimum_stock: Number(formData.minimum_stock) || 0,
        reorder_quantity: Number(formData.reorder_quantity) || 0,
        status: formData.status,
        condition: formData.condition,
        tested: false,
        test_date: null,
        test_results: '',
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
        vendor: formData.vendor,
        purchase_order_number: '',
        warranty_type: '',
        warranty_expiry_date: formData.warranty_expiry_date || null,
        compatible_with: formData.compatible_with,
        notes: formData.notes,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        barcode: '',
        created_by: currentUser?.id || '',
        updated_by: null,
      });
      toast.success('Component added successfully');
      navigate('components');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save component');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('components')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-heading">Add Component</h1>
            <p className="text-muted-foreground">Register a new spare part or component</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('components')} disabled={saving}>
            <X className="h-4 w-4 mr-2" />Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save Component</>}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* ── Basic Information ── */}
        <Card>
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Component Name <span className="text-destructive">*</span></Label>
              <Input
                value={formData.item_name}
                onChange={(e) => handleChange('item_name', e.target.value)}
                placeholder="e.g. 16GB DDR4 RAM"
              />
            </div>

            <div className="space-y-2">
              <Label>Component Type <span className="text-destructive">*</span></Label>
              <Select
                value={formData.component_type_id}
                onValueChange={(v) => handleChange('component_type_id', v)}
              >
                <SelectTrigger>
                  <SelectValue
                    displayValue={componentTypes.find((ct) => ct.id === formData.component_type_id)?.type_name}
                    placeholder="Select type"
                  />
                </SelectTrigger>
                <SelectContent>
                  {componentTypes.filter((ct) => ct.is_active).map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>{ct.type_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input value={formData.manufacturer} onChange={(e) => handleChange('manufacturer', e.target.value)} placeholder="e.g. Samsung" />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={formData.model} onChange={(e) => handleChange('model', e.target.value)} placeholder="e.g. EVO Plus" />
            </div>
            <div className="space-y-2">
              <Label>Part Number</Label>
              <Input value={formData.part_number} onChange={(e) => handleChange('part_number', e.target.value)} placeholder="Enter part number" />
            </div>
            <div className="space-y-2">
              <Label>Compatible With</Label>
              <Input value={formData.compatible_with} onChange={(e) => handleChange('compatible_with', e.target.value)} placeholder="e.g. Dell R740, HP DL380" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger><SelectValue displayValue={formData.status} placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Working">Working</SelectItem>
                  <SelectItem value="Broken">Broken</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={(v) => handleChange('condition', v)}>
                <SelectTrigger><SelectValue displayValue={formData.condition} placeholder="Select condition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Used">Used</SelectItem>
                  <SelectItem value="Refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Specification Fields (shown when type requires spec and has fields) ── */}
        {specFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {specFields.map((f) => (
                <div key={f.id} className="space-y-2">
                  <Label>
                    {f.label}
                    {f.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {f.field_type === 'dropdown' && (f.options ?? []).length > 0 ? (
                    <Select
                      value={specValues[f.id] ?? ''}
                      onValueChange={(v) => setSpecValues((prev) => ({ ...prev, [f.id]: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue
                          displayValue={specValues[f.id]}
                          placeholder={`Select ${f.label}`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : f.field_type === 'time' ? 'time' : 'text'}
                      value={specValues[f.id] ?? ''}
                      onChange={(e) => setSpecValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                      placeholder={f.label}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Inventory & Location ── */}
        <Card>
          <CardHeader><CardTitle>Inventory &amp; Location</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Region <span className="text-destructive">*</span></Label>
              <Select
                value={formData.region_id}
                onValueChange={(v) => { handleChange('region_id', v); handleChange('warehouse_id', ''); }}
              >
                <SelectTrigger>
                  <SelectValue
                    displayValue={regions.find((r) => r.id === formData.region_id)?.name}
                    placeholder="Select region"
                  />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter((r) => (r.status ?? '').toLowerCase() === 'active')
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Warehouse <span className="text-destructive">*</span></Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(v) => handleChange('warehouse_id', v)}
                disabled={!formData.region_id}
              >
                <SelectTrigger>
                  <SelectValue
                    displayValue={filteredWarehouses.find((w) => w.id === formData.warehouse_id)?.name}
                    placeholder="Select warehouse"
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredWarehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bin Location</Label>
              <Input value={formData.bin_location} onChange={(e) => handleChange('bin_location', e.target.value)} placeholder="e.g. Shelf A-12" />
            </div>
            <div className="space-y-2">
              <Label>Initial Quantity</Label>
              <Input type="number" min="1" value={formData.quantity} onChange={(e) => handleChange('quantity', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Minimum Stock Level</Label>
              <Input type="number" min="0" value={formData.minimum_stock} onChange={(e) => handleChange('minimum_stock', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reorder Quantity</Label>
              <Input type="number" min="0" value={formData.reorder_quantity} onChange={(e) => handleChange('reorder_quantity', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* ── Purchase Information ── */}
        <Card>
          <CardHeader><CardTitle>Purchase Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input value={formData.vendor} onChange={(e) => handleChange('vendor', e.target.value)} placeholder="Vendor name" />
            </div>
            <div className="space-y-2">
              <Label>Purchase Price (USD)</Label>
              <Input type="number" value={formData.purchase_price} onChange={(e) => handleChange('purchase_price', e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input type="date" value={formData.purchase_date} onChange={(e) => handleChange('purchase_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Warranty Expiry Date</Label>
              <Input type="date" value={formData.warranty_expiry_date} onChange={(e) => handleChange('warranty_expiry_date', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* ── Additional Details ── */}
        <Card>
          <CardHeader><CardTitle>Additional Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={formData.tags} onChange={(e) => handleChange('tags', e.target.value)} placeholder="e.g. memory, upgrade, spare" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Add any additional notes here…" rows={4} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
