import React, { useState } from 'react';
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
import { Plus, Globe, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';
import type { Region } from '../lib/types';
export function RegionsPage() {
  const {
    regions,
    warehouses,
    currentUser,
    addRegion,
    updateRegion,
    deleteRegion
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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
  const handleOpenDialog = (region?: Region) => {
    if (region) {
      setEditingRegion(region);
      setFormData({
        name: region.name,
        description: region.description || '',
        is_active: region.is_active
      });
    } else {
      setEditingRegion(null);
      setFormData({
        name: '',
        description: '',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Region name is required');
      return;
    }
    if (editingRegion) {
      updateRegion(editingRegion.id, formData);
      toast.success('Region updated successfully');
    } else {
      addRegion(formData);
      toast.success('Region added successfully');
    }
    setIsDialogOpen(false);
  };
  const handleDelete = (id: string) => {
    const hasWarehouses = warehouses.some((w) => w.region_id === id);
    if (hasWarehouses) {
      toast.error(
        'Cannot delete region: It contains warehouses. Please reassign or delete them first.'
      );
      return;
    }
    if (window.confirm('Are you sure you want to delete this region?')) {
      deleteRegion(id);
      toast.success('Region deleted successfully');
    }
  };
  const getWarehouseCount = (regionId: string) => {
    return warehouses.filter((w) => w.region_id === regionId).length;
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Regions
          </h1>
          <p className="text-muted-foreground">
            Manage operational regions and territories
          </p>
        </div>

        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Region
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Warehouses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.length > 0 ?
              regions.map((region) =>
              <TableRow key={region.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                        {region.name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {region.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getWarehouseCount(region.id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                    variant={region.is_active ? 'default' : 'secondary'}
                    className={
                    region.is_active ?
                    'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                    ''
                    }>
                    
                        {region.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(region.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDialog(region)}>
                      
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(region.id)}>
                      
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
                  
                    No regions found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRegion ? 'Edit Region' : 'Add Region'}
            </DialogTitle>
            <DialogDescription>
              {editingRegion ?
              'Update region details below.' :
              'Enter details for the new region.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Region Name <span className="text-destructive">*</span>
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
                placeholder="e.g., Yangon" />
              
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value
                })
                }
                placeholder="Brief description of this region..."
                rows={3} />
              
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive regions won't appear in dropdowns
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
            <Button onClick={handleSave}>Save Region</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}