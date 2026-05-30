import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useHardwareInventoryStore } from '../store/useHardwareInventoryStore';
import { useRegionStore } from '../store/useRegionStore';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import { Save, X, Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import type { HardwareInventory } from '../lib/types';

interface FormData {
  name: string;
  item_type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  asset_tag: string;
  specifications: Record<string, string>;
  status: HardwareInventory['status'];
  condition: HardwareInventory['condition'];
  region_id: string;
  warehouse_id: string;
}

export function InventoryAddPage() {
  const { navigate, selectedId, currentUser } = useStore();
  const { hardwareInventory, createHardwareInventory, updateHardwareInventory } = useHardwareInventoryStore();
  const { regions, fetchRegions } = useRegionStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();

  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingHardware, setEditingHardware] = useState<HardwareInventory | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    item_type: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    asset_tag: '',
    specifications: {},
    status: 'available',
    condition: 'working',
    region_id: '',
    warehouse_id: ''
  });

  const [specFields, setSpecFields] = useState<Array<{ key: string, value: string }>>([
    { key: '', value: '' }
  ]);

  // Data is already fetched by fetchAppData() in useStore.ts during app initialization


  // Check for edit mode
  useEffect(() => {
    if (selectedId) {
      setEditMode(true);
      const hardware = hardwareInventory.find(h => h.id === selectedId);
      if (hardware) {
        setEditingHardware(hardware);
        setFormData({
          name: hardware.name,
          item_type: hardware.item_type,
          manufacturer: hardware.manufacturer,
          model: hardware.model,
          serial_number: hardware.serial_number,
          asset_tag: hardware.asset_tag,
          specifications: hardware.specifications || {},
          status: hardware.status,
          condition: hardware.condition,
          region_id: hardware.region_id || '',
          warehouse_id: hardware.warehouse_id || ''
        });
        // Convert specs to array
        const specArray = Object.entries(hardware.specifications || {}).map(([key, value]) => ({
          key, value: String(value)
        }));
        setSpecFields(specArray.length > 0 ? specArray : [{ key: '', value: '' }]);
      }
    }
  }, [selectedId, hardwareInventory, regions, warehouses]);

  const addSpecField = () => {
    setSpecFields([...specFields, { key: '', value: '' }]);
  };

  const removeSpecField = (index: number) => {
    if (specFields.length > 1) {
      setSpecFields(specFields.filter((_, i) => i !== index));
    }
  };

  const updateSpecField = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...specFields];
    newFields[index][field] = value;
    setSpecFields(newFields);
  };

  const buildSpecifications = () => {
    const specs: Record<string, string> = {};
    specFields.forEach(({ key, value }) => {
      if (key.trim()) {
        specs[key.trim()] = value;
      }
    });
    return specs;
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Hardware name is required');
      return false;
    }
    if (!formData.item_type) {
      toast.error('Item type is required');
      return false;
    }
    if (!formData.serial_number.trim()) {
      toast.error('Serial number is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const specs = buildSpecifications();
      const data = {
        ...formData,
        specifications: specs,
        created_by: currentUser?.id,
        updated_by: currentUser?.id
      };

      if (editMode && editingHardware) {
        await updateHardwareInventory(editingHardware.id, data);
        toast.success('Hardware updated successfully');
        navigate('inventory');
      } else {
        await createHardwareInventory(data);
        toast.success('Hardware added successfully');
        navigate('inventory');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save hardware');
    } finally {
      setSaving(false);
    }
  };

  const filteredWarehouses = warehouses.filter(
    w => w.region_id === formData.region_id
  );

  // Compute display names for SelectValue
  const selectedRegionName = useMemo(() => {
    return regions.find(r => r.id === formData.region_id)?.name;
  }, [regions, formData.region_id]);

  const selectedWarehouseName = useMemo(() => {
    return filteredWarehouses.find(w => w.id === formData.warehouse_id)?.name;
  }, [filteredWarehouses, formData.warehouse_id]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('inventory')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {editMode ? 'Edit Hardware' : 'Add Hardware'}
            </h1>
            <p className="text-muted-foreground">
              {editMode ? 'Update hardware information' : 'Register new hardware asset'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('inventory')} disabled={saving}>
            <X className="h-4 w-4 mr-2" />Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />{editMode ? 'Update' : 'Save'}</>
            )}
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card className='overflow-visible'>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Hardware Name <span className="text-destructive">*</span></Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Dell PowerEdge R740"
            />
          </div>

          <div className="space-y-2">
            <Label>Item Type <span className="text-destructive">*</span></Label>
            <Select value={formData.item_type} onValueChange={(v) => handleChange('item_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Server">Server</SelectItem>
                <SelectItem value="Laptop">Laptop</SelectItem>
                <SelectItem value="Desktop">Desktop</SelectItem>
                <SelectItem value="Router">Router</SelectItem>
                <SelectItem value="Switch">Switch</SelectItem>
                <SelectItem value="Storage">Storage</SelectItem>
                <SelectItem value="Network">Network</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Manufacturer</Label>
            <Input
              value={formData.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              placeholder="e.g., Dell"
            />
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              placeholder="e.g., PowerEdge R740"
            />
          </div>

          <div className="space-y-2">
            <Label>Serial Number <span className="text-destructive">*</span></Label>
            <Input
              value={formData.serial_number}
              onChange={(e) => handleChange('serial_number', e.target.value)}
              placeholder="Unique serial number"
              disabled={editMode}
            />
          </div>

          <div className="space-y-2">
            <Label>Asset Tag</Label>
            <Input
              value={formData.asset_tag}
              onChange={(e) => handleChange('asset_tag', e.target.value)}
              placeholder="Internal asset tag"
            />
          </div>
        </CardContent>
      </Card>

      {/* Specifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Specifications</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addSpecField}>
            <Plus className="h-4 w-4 mr-2" />Add Spec
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {specFields.map((field, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Spec name (e.g., CPU)"
                value={field.key}
                onChange={(e) => updateSpecField(index, 'key', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value (e.g., Intel Xeon)"
                value={field.value}
                onChange={(e) => updateSpecField(index, 'value', e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSpecField(index)}
                disabled={specFields.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Location & Status */}
      <Card className='overflow-visible'>
        <CardHeader>
          <CardTitle>Location & Status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Region</Label>
            <Select 
              value={formData.region_id} 
              onValueChange={(v) => handleChange('region_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select region" displayValue={selectedRegionName} />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select
              value={formData.warehouse_id}
              onValueChange={(v) => handleChange('warehouse_id', v)}
              disabled={!formData.region_id}
            >
              <SelectTrigger>
                <SelectValue 
                  placeholder={formData.region_id ? "Select warehouse" : "Select region first"} 
                  displayValue={selectedWarehouseName} 
                />
              </SelectTrigger>
              <SelectContent>
                {filteredWarehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v: any) => handleChange('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={formData.condition} onValueChange={(v: any) => handleChange('condition', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="working">Working</SelectItem>
                <SelectItem value="repairing">Repairing</SelectItem>
                <SelectItem value="broken">Broken</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}