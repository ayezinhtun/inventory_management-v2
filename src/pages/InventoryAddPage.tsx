import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { toast } from 'sonner';
import { ArrowLeft, Save, X } from 'lucide-react';
import type { ItemType, ItemStatus, ItemCondition } from '../lib/types';
export function InventoryAddPage() {
  const {
    currentUser,
    regions,
    warehouses,
    racks,
    addInventoryItem,
    navigate
  } = useStore();
  const [formData, setFormData] = useState({
    item_name: '',
    item_type: 'Server' as ItemType,
    manufacturer: '',
    model: '',
    serial_number: '',
    asset_tag: '',
    region_id: '',
    warehouse_id: '',
    rack_id: '',
    rack_position: '',
    floor: '',
    room: '',
    cabinet: '',
    quantity: 1,
    status: 'Working' as ItemStatus,
    condition: 'New' as ItemCondition,
    purchase_date: '',
    purchase_price: '',
    vendor: '',
    warranty_expiry_date: '',
    notes: '',
    tags: ''
  });
  const filteredWarehouses = warehouses.filter(
    (w) => w.region_id === formData.region_id && w.is_active
  );
  const filteredRacks = racks.filter(
    (r) => r.warehouse_id === formData.warehouse_id && r.is_active
  );
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSave = () => {
    if (
    !formData.item_name ||
    !formData.serial_number ||
    !formData.region_id ||
    !formData.warehouse_id)
    {
      toast.error(
        'Please fill in all required fields (Name, Serial Number, Region, Warehouse)'
      );
      return;
    }
    addInventoryItem({
      item_name: formData.item_name,
      item_type: formData.item_type,
      manufacturer: formData.manufacturer,
      model: formData.model,
      serial_number: formData.serial_number,
      asset_tag: formData.asset_tag,
      specifications: {},
      region_id: formData.region_id,
      warehouse_id: formData.warehouse_id,
      rack_id: formData.rack_id || null,
      rack_position: formData.rack_position,
      floor: formData.floor,
      room: formData.room,
      cabinet: formData.cabinet,
      network_config: {},
      ownership: {},
      quantity: Number(formData.quantity) || 1,
      reserved_quantity: 0,
      status: formData.status,
      condition: formData.condition,
      lifecycle: {},
      maintenance: {},
      notes: formData.notes,
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
      purchase_date: formData.purchase_date || null,
      purchase_price: formData.purchase_price ?
      Number(formData.purchase_price) :
      null,
      vendor: formData.vendor,
      warranty_expiry_date: formData.warranty_expiry_date || null,
      created_by: currentUser?.id || '',
      updated_by: null
    });
    toast.success('Inventory item added successfully');
    navigate('inventory');
  };
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('inventory')}>
            
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-heading">
              Add Inventory Item
            </h1>
            <p className="text-muted-foreground">
              Register a new hardware device into the system
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('inventory')}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Item
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Item Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.item_name}
                onChange={(e) => handleChange('item_name', e.target.value)}
                placeholder="e.g. Web Server 01" />
              
            </div>
            <div className="space-y-2">
              <Label>Item Type</Label>
              <Select
                value={formData.item_type}
                onValueChange={(v) => handleChange('item_type', v)}>
                
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Server">Server</SelectItem>
                  <SelectItem value="Switch">Switch</SelectItem>
                  <SelectItem value="Router">Router</SelectItem>
                  <SelectItem value="Firewall">Firewall</SelectItem>
                  <SelectItem value="Storage Array">Storage Array</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                placeholder="e.g. Dell" />
              
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="e.g. PowerEdge R740" />
              
            </div>
            <div className="space-y-2">
              <Label>
                Serial Number <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.serial_number}
                onChange={(e) => handleChange('serial_number', e.target.value)}
                placeholder="Enter serial number" />
              
            </div>
            <div className="space-y-2">
              <Label>Asset Tag</Label>
              <Input
                value={formData.asset_tag}
                onChange={(e) => handleChange('asset_tag', e.target.value)}
                placeholder="Enter asset tag" />
              
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => handleChange('status', v)}>
                
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Working">Working</SelectItem>
                  <SelectItem value="Broken">Broken</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(v) => handleChange('condition', v)}>
                
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Used">Used</SelectItem>
                  <SelectItem value="Refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Region <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.region_id}
                onValueChange={(v) => {
                  handleChange('region_id', v);
                  handleChange('warehouse_id', '');
                  handleChange('rack_id', '');
                }}>
                
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) =>
                  <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(v) => {
                  handleChange('warehouse_id', v);
                  handleChange('rack_id', '');
                }}
                disabled={!formData.region_id}>
                
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {filteredWarehouses.map((w) =>
                  <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rack</Label>
              <Select
                value={formData.rack_id}
                onValueChange={(v) => handleChange('rack_id', v)}
                disabled={!formData.warehouse_id}>
                
                <SelectTrigger>
                  <SelectValue placeholder="Select rack" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRacks.map((r) =>
                  <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rack Position</Label>
              <Input
                value={formData.rack_position}
                onChange={(e) => handleChange('rack_position', e.target.value)}
                placeholder="e.g. U12-U14" />
              
            </div>
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input
                value={formData.floor}
                onChange={(e) => handleChange('floor', e.target.value)}
                placeholder="e.g. 1st Floor" />
              
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Input
                value={formData.room}
                onChange={(e) => handleChange('room', e.target.value)}
                placeholder="e.g. Server Room A" />
              
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input
                value={formData.vendor}
                onChange={(e) => handleChange('vendor', e.target.value)}
                placeholder="Vendor name" />
              
            </div>
            <div className="space-y-2">
              <Label>Purchase Price (USD)</Label>
              <Input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => handleChange('purchase_price', e.target.value)}
                placeholder="0.00" />
              
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)} />
              
            </div>
            <div className="space-y-2">
              <Label>Warranty Expiry Date</Label>
              <Input
                type="date"
                value={formData.warranty_expiry_date}
                onChange={(e) =>
                handleChange('warranty_expiry_date', e.target.value)
                } />
              
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder="e.g. production, database, critical" />
              
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any additional notes here..."
                rows={4} />
              
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);

}