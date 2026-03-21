import React, { useState, Component } from 'react';
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
import { Plus, Tags, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ComponentType } from '../lib/types';
export function TypeManagementPage() {
  const {
    componentTypes,
    components,
    currentUser,
    addComponentType,
    updateComponentType,
    deleteComponentType
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ComponentType | null>(null);
  const [formData, setFormData] = useState({
    type_name: '',
    category: 'Hardware',
    description: '',
    requires_specification: false,
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
  const handleOpenDialog = (type?: ComponentType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        type_name: type.type_name,
        category: type.category || 'Hardware',
        description: type.description || '',
        requires_specification: type.requires_specification,
        is_active: type.is_active
      });
    } else {
      setEditingType(null);
      setFormData({
        type_name: '',
        category: 'Hardware',
        description: '',
        requires_specification: false,
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };
  const handleSave = () => {
    if (!formData.type_name.trim()) {
      toast.error('Type name is required');
      return;
    }
    if (editingType) {
      updateComponentType(editingType.id, formData);
      toast.success('Component type updated successfully');
    } else {
      addComponentType({
        ...formData,
        created_by: currentUser.id
      });
      toast.success('Component type added successfully');
    }
    setIsDialogOpen(false);
  };
  const handleDelete = (id: string) => {
    const hasComponents = components.some((c) => c.component_type_id === id);
    if (hasComponents) {
      toast.error(
        'Cannot delete type: Components of this type exist in inventory.'
      );
      return;
    }
    if (
    window.confirm('Are you sure you want to delete this component type?'))
    {
      deleteComponentType(id);
      toast.success('Component type deleted successfully');
    }
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Type Management
          </h1>
          <p className="text-muted-foreground">
            Manage dynamic component types for the inventory system
          </p>
        </div>

        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Type
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Requires Spec</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {componentTypes.length > 0 ?
              componentTypes.map((type) =>
              <TableRow key={type.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Tags className="h-4 w-4 mr-2 text-muted-foreground" />
                        {type.type_name}
                      </div>
                    </TableCell>
                    <TableCell>{type.category}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {type.description || '—'}
                    </TableCell>
                    <TableCell>
                      {type.requires_specification ?
                  <Badge
                    variant="outline"
                    className="border-blue-200 text-blue-700 bg-blue-50">
                    
                          Yes
                        </Badge> :

                  <span className="text-muted-foreground text-sm">
                          No
                        </span>
                  }
                    </TableCell>
                    <TableCell>
                      <Badge
                    variant={type.is_active ? 'default' : 'secondary'}
                    className={
                    type.is_active ?
                    'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                    ''
                    }>
                    
                        {type.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDialog(type)}>
                      
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(type.id)}>
                      
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
                  
                    No component types found.
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
              {editingType ? 'Edit Component Type' : 'Add Component Type'}
            </DialogTitle>
            <DialogDescription>
              {editingType ?
              'Update type details below.' :
              'Enter details for the new component type.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Type Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.type_name}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  type_name: e.target.value
                })
                }
                placeholder="e.g., RAM, SSD, Cable" />
              
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) =>
                setFormData({
                  ...formData,
                  category: val
                })
                }>
                
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hardware">Hardware</SelectItem>
                  <SelectItem value="Peripheral">Peripheral</SelectItem>
                  <SelectItem value="Accessory">Accessory</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
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
                placeholder="Brief description..."
                rows={2} />
              
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="req_spec">Requires Specification</Label>
                <p className="text-sm text-muted-foreground">
                  Force users to enter specs when adding this component
                </p>
              </div>
              <Switch
                id="req_spec"
                checked={formData.requires_specification}
                onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  requires_specification: checked
                })
                } />
              
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive types won't appear in dropdowns
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
            <Button onClick={handleSave}>Save Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}