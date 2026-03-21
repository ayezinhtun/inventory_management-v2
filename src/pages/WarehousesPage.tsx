import React, { useState, useId } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
'../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { Switch } from '../components/ui/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import { Plus, Building2, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Warehouse } from '../lib/types';
export function WarehousesPage() {
  const {
    warehouses,
    regions,
    racks,
    currentUser,
    getRegionName,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: '',
    region_id: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    is_active: true
  });
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">
          You do not have permission to view this page.
        </p>
      </div>);

  }
  const handleOpenDialog = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        region_id: warehouse.region_id,
        address: warehouse.address || '',
        contact_person: warehouse.contact_person || '',
        contact_phone: warehouse.contact_phone || '',
        is_active: warehouse.is_active
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        name: '',
        region_id: '',
        address: '',
        contact_person: '',
        contact_phone: '',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };
  const handleSave = () => {
    if (!formData.name.trim() || !formData.region_id) {
      toast.error('Name and Region are required');
      return;
    }
    if (editingWarehouse) {
      updateWarehouse(editingWarehouse.id, formData);
      toast.success('Warehouse updated successfully');
    } else {
      addWarehouse(formData);
      toast.success('Warehouse added successfully');
    }
    setIsDialogOpen(false);
  };
  const handleDelete = (id: string) => {
    const hasRacks = racks.some((r) => r.warehouse_id === id);
    if (hasRacks) {
      toast.error(
        'Cannot delete warehouse: It contains racks. Please reassign or delete them first.'
      );
      return;
    }
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      deleteWarehouse(id);
      toast.success('Warehouse deleted successfully');
    }
  };
  const getRackCount = (warehouseId: string) => {
    return racks.filter((r) => r.warehouse_id === warehouseId).length;
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Warehouses
          </h1>
          <p className="text-muted-foreground">
            Manage physical storage locations and data centers
          </p>
        </div>

        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Racks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.length > 0 ?
              warehouses.map((warehouse) =>
              <TableRow key={warehouse.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                        {warehouse.name}
                      </div>
                    </TableCell>
                    <TableCell>{getRegionName(warehouse.region_id)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{warehouse.contact_person || '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {warehouse.contact_phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getRackCount(warehouse.id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                    variant={warehouse.is_active ? 'default' : 'secondary'}
                    className={
                    warehouse.is_active ?
                    'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                    ''
                    }>
                    
                        {warehouse.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDialog(warehouse)}>
                      
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(warehouse.id)}>
                      
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground">
                  
                    No warehouses found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
            </DialogTitle>
            <DialogDescription>
              {editingWarehouse ?
              'Update warehouse details below.' :
              'Enter details for the new warehouse.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Warehouse Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value
                })
                }
                placeholder="e.g., Ahlone DC" />
              
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">
                Region <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.region_id}
                onValueChange={(val) =>
                setFormData({
                  ...formData,
                  region_id: val
                })
                }>
                
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.
                  filter((r) => r.is_active).
                  map((r) =>
                  <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  address: e.target.value
                })
                }
                placeholder="Full physical address..."
                rows={2} />
              
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Person</Label>
                <Input
                  id="contact"
                  value={formData.contact_person}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    contact_person: e.target.value
                  })
                  }
                  placeholder="Name" />
                
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.contact_phone}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    contact_phone: e.target.value
                  })
                  }
                  placeholder="Phone number" />
                
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive warehouses won't appear in dropdowns
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  is_active: checked
                })
                } />
              
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Warehouse</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}