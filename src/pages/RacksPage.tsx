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
import { Switch } from '../components/ui/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import { Progress } from '../components/ui/Progress';
import { Plus, Server, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Rack } from '../lib/types';
export function RacksPage() {
  const {
    racks,
    warehouses,
    currentUser,
    getWarehouseName,
    addRack,
    updateRack,
    deleteRack
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    warehouse_id: '',
    location: '',
    total_units: 42,
    used_units: 0,
    is_active: true
  });
  // PM and Engineer can view, Admin can edit
  const canEdit = currentUser?.role === 'Admin';
  const handleOpenDialog = (rack?: Rack) => {
    if (!canEdit) return;
    if (rack) {
      setEditingRack(rack);
      setFormData({
        name: rack.name,
        warehouse_id: rack.warehouse_id,
        location: rack.location || '',
        total_units: rack.total_units,
        used_units: rack.used_units,
        is_active: rack.is_active
      });
    } else {
      setEditingRack(null);
      setFormData({
        name: '',
        warehouse_id: '',
        location: '',
        total_units: 42,
        used_units: 0,
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };
  const handleSave = () => {
    if (!formData.name.trim() || !formData.warehouse_id) {
      toast.error('Name and Warehouse are required');
      return;
    }
    if (editingRack) {
      updateRack(editingRack.id, formData);
      toast.success('Rack updated successfully');
    } else {
      addRack(formData);
      toast.success('Rack added successfully');
    }
    setIsDialogOpen(false);
  };
  const handleDelete = (id: string) => {
    if (!canEdit) return;
    // In a real app, we'd check if inventory is assigned to this rack
    if (window.confirm('Are you sure you want to delete this rack?')) {
      deleteRack(id);
      toast.success('Rack deleted successfully');
    }
  };
  // Filter racks based on role
  let visibleRacks = racks;
  if (currentUser?.role !== 'Admin' && currentUser?.assigned_region_id) {
    const validWarehouseIds = warehouses.
    filter((w) => w.region_id === currentUser.assigned_region_id).
    map((w) => w.id);
    visibleRacks = racks.filter((r) =>
    validWarehouseIds.includes(r.warehouse_id)
    );
  }
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Racks & Capacity
          </h1>
          <p className="text-muted-foreground">
            Manage server racks and monitor utilization
          </p>
        </div>

        {canEdit &&
        <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rack
          </Button>
        }
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity (U)</TableHead>
                <TableHead className="w-[200px]">Utilization</TableHead>
                <TableHead>Status</TableHead>
                {canEdit &&
                <TableHead className="text-right">Actions</TableHead>
                }
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRacks.length > 0 ?
              visibleRacks.map((rack) => {
                const utilization = rack.used_units / rack.total_units * 100;
                let progressColor = 'bg-emerald-500';
                if (utilization > 80) progressColor = 'bg-destructive';else
                if (utilization > 60) progressColor = 'bg-yellow-500';
                return (
                  <TableRow key={rack.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Server className="h-4 w-4 mr-2 text-muted-foreground" />
                          {rack.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getWarehouseName(rack.warehouse_id)}
                      </TableCell>
                      <TableCell>{rack.location || '—'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{rack.used_units}</span>{' '}
                          / {rack.total_units} U
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {utilization.toFixed(0)}%
                            </span>
                            <span className="text-muted-foreground">
                              {rack.total_units - rack.used_units} U free
                            </span>
                          </div>
                          <Progress
                          value={utilization}
                          className="h-2"
                          indicatorClassName={progressColor} />
                        
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                        variant={rack.is_active ? 'default' : 'secondary'}
                        className={
                        rack.is_active ?
                        'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                        ''
                        }>
                        
                          {rack.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {canEdit &&
                    <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenDialog(rack)}>
                          
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(rack.id)}>
                          
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                    }
                    </TableRow>);

              }) :

              <TableRow>
                  <TableCell
                  colSpan={canEdit ? 7 : 6}
                  className="h-32 text-center text-muted-foreground">
                  
                    No racks found.
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
            <DialogTitle>{editingRack ? 'Edit Rack' : 'Add Rack'}</DialogTitle>
            <DialogDescription>
              {editingRack ?
              'Update rack details below.' :
              'Enter details for the new rack.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Rack Name <span className="text-destructive">*</span>
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
                placeholder="e.g., Rack-A01" />
              
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse">
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(val) =>
                setFormData({
                  ...formData,
                  warehouse_id: val
                })
                }>
                
                <SelectTrigger>
                  <SelectValue placeholder="Select a warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.
                  filter((w) => w.is_active).
                  map((w) =>
                  <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Physical Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  location: e.target.value
                })
                }
                placeholder="e.g., Floor 1, Room 101" />
              
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_units">Total Units (U)</Label>
                <Input
                  id="total_units"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.total_units}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_units: parseInt(e.target.value) || 42
                  })
                  } />
                
              </div>
              <div className="space-y-2">
                <Label htmlFor="used_units">Used Units (U)</Label>
                <Input
                  id="used_units"
                  type="number"
                  min="0"
                  max={formData.total_units}
                  value={formData.used_units}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    used_units: parseInt(e.target.value) || 0
                  })
                  } />
                
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active Status</Label>
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
            <Button onClick={handleSave}>Save Rack</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}