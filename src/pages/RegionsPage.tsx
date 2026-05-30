import React, { useEffect, useState } from 'react';
import { useRegionStore, type Region } from '../store/useRegionStore';
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
import { Plus, Globe, Edit, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';
export function RegionsPage() {
  const {
    regions,
    isLoading,
    fetchRegions,
    addRegion,
    deleteRegion,
    updateRegion
  } = useRegionStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Region | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Save loading state
  const [saveLoading, setSaveLoading] = useState(false);

  // Data is already fetched by fetchAppData() in useStore.ts during app initialization

  // const handleAddRegion = async () => {
  //   if (!formData.name.trim()) {
  //     toast.error('Region name is required');
  //     return;
  //   }

  //   try {
  //     await addRegion(formData);
  //     setFormData({ name: '', description: '', status: 'active' });
  //     setIsDialogOpen(false);
  //     toast.success('Region added successfully');
  //   } catch (error) {
  //     toast.error('Failed to add region');
  //     console.error('Error adding region:', error);
  //   }
  // }

  const resetForm = () => {
    setFormData({ name: '', description: '', status: 'active' });
    setIsDialogOpen(false);
  }

  // delete region
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteRegion(deleteTarget.id);
      toast.success('Region deleted successfully');
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete region');
      console.error('Error deleting region:', error);
    } finally {
      setDeleteLoading(false);
    }
  }

  const handleOpenDialog = (region?: Region) => {
    if (region) {
      // edit mode
      setEditingRegion(region);
      setFormData({
        name: region.name,
        description: region.description || '',
        status: region.status || 'active'
      });
    } else {
      // Add mode
      setEditingRegion(null);
      setFormData({
        name: '',
        description: '',
        status: 'active'
      });
    }

    setIsDialogOpen(true);
  }

  const handleSaveRegion = async () => {
    if (!formData.name.trim()) {
      toast.error('Region name is required');
      return;
    }

    setSaveLoading(true);
    try {
      if (editingRegion) {
        //update existing region
        await updateRegion(editingRegion.id, formData);
        toast.success('Region updated successfully');
      } else {
        // add new region 

        await addRegion(formData);
        toast.success('Region added successfully');
      }

      setFormData({ name: '', description: '', status: 'active' });
      setEditingRegion(null);
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(`Failed to ${editingRegion ? 'update' : 'add'} region`);
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
            Regions
          </h1>
          <p className="text-muted-foreground">
            Manage operational regions and territories
          </p>
        </div>

        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Region
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-sm text-muted-foreground">Loading regions...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-muted-foreground">
                        No regions found.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  regions.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell className="font-medium">{region.name}</TableCell>
                      <TableCell>{region.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={region.status === 'active' ? 'default' : 'secondary'}>
                          {region.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(region.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenDialog(region)}
                          >

                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(region)}
                          >

                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table >
          )
          }
        </CardContent >
      </Card >

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRegion ? 'Edit Region' : 'Add Region'}
            </DialogTitle>
            <DialogDescription>
              {editingRegion ? 'Update the region details.' : 'Enter details for the new region.'}
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
            <Button onClick={handleSaveRegion} disabled={saveLoading}>
              {saveLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingRegion ? 'Update Region' : 'Add Region'}
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
              Delete Region
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
    </div >);

}