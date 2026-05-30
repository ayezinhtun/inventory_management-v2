import React, { useState, useId, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from
  '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from
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
  SelectValue
} from
  '../components/ui/Select';
import { Plus, Building2, Edit, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWarehouseStore, type Warehouse } from '../store/useWarehouseStore';
import { useRegionStore } from '../store/useRegionStore';
export function WarehousesPage() {
  const {
    warehouses,
    isLoading,
    fetchWarehouses,
    addWarehouses,
    deleteWarehouse,
    updateWarehouse
  } = useWarehouseStore();

  const { regions, fetchRegions } = useRegionStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    region_id: '',
    address: '',
    contact_person: '',
    phone: '',
    status: 'active'
  });

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Save loading state
  const [saveLoading, setSaveLoading] = useState(false);

  // Data is already fetched by fetchAppData() in useStore.ts during app initialization


  const resetForm = () => {
    setFormData({ name: '', region_id: '', address: '', contact_person: '', phone: '', status: 'active' });
    setIsDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteWarehouse(deleteTarget.id);
      toast.success('Warehouse deleted successfully');
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete warehouse');
      console.error('Error deleting warehouse:', error)
    } finally {
      setDeleteLoading(false);
    }
  }

  // for open dialog
  const handleOpenDialog = (warehouse?: Warehouse) => {
    if (warehouse) {
      // Edit mode
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        region_id: warehouse.region_id,
        address: warehouse.address || '',
        contact_person: warehouse.contact_person || '',
        phone: warehouse.phone || '',
        status: warehouse.status || 'active'
      });
    } else {
      // Add mode
      setEditingWarehouse(null);
      setFormData({
        name: '',
        region_id: '',
        address: '',
        contact_person: '',
        phone: '',
        status: 'active'
      });
    }

    setIsDialogOpen(true);
  }

  const handleSaveWarehouse = async () => {
    if (!formData.name.trim()) {
      toast.error('Warehouse name is required');
      return;
    }

    setSaveLoading(true);
    try {
      if (editingWarehouse) {
        //update existing warehouse
        await updateWarehouse(editingWarehouse.id, formData);
        toast.success('Warehouse updated successfully');
      } else {
        // add new warehouse 
        await addWarehouses(formData);
        toast.success('Warehouse added successfully');
      }

      setFormData({ name: '', region_id: '', address: '', contact_person: '', phone: '', status: 'active' });
      setEditingWarehouse(null);
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(`Failed to ${editingWarehouse ? 'update' : 'add'} warehouse`);
      console.error('Error', error);
    } finally {
      setSaveLoading(false);
    }
  }
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

        <Button
          onClick={() => handleOpenDialog()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-sm text-muted-foreground">Loading warehouses...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No warehouses found
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map(warehouse => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {warehouse.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {regions.find(r => r.id === warehouse.region_id)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{warehouse.contact_person}</div>
                          <div className="text-xs text-muted-foreground">
                            {warehouse.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={warehouse.status === 'active' ? 'default' : 'secondary'}>
                          {warehouse.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(warehouse)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(warehouse)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
            </DialogTitle>
            <DialogDescription>
              {editingWarehouse ? 'Update the warehouse details.' : 'Enter details for the new warehouse.'}
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Ahlone DC" />

            </div>
            <div className="space-y-2">
              <Label htmlFor="region">
                Region <span className="text-destructive">*</span>
              </Label>
              <select
                value={formData.region_id}
                onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a region</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full physical address..."
                rows={2} />

            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Person</Label>
                <Input
                  id="contact"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Name" />

              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                checked={formData.status === 'active'}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveWarehouse}
              disabled={saveLoading}
            >
              {saveLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingWarehouse ? 'Update Warehouse' : 'Add Warehouse'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Warehouse
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}