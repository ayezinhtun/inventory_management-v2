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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter } from
'../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Plus, BoxIcon, Edit, Trash2 } from 'lucide-react';
import { formatDate, getStatusColor } from '../lib/utils';
import { toast } from 'sonner';
import type { ReservedStockStatus } from '../lib/types';
export function ReservedStockPage() {
  const {
    reservedStock,
    inventory,
    components,
    getUserName,
    currentUser,
    addReservedStock
  } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [itemType, setItemType] = useState<'inventory' | 'component'>(
    'inventory'
  );
  const [formData, setFormData] = useState({
    selected_id: '',
    quantity_reserved: 1,
    reserved_for: '',
    expected_release_date: '',
    notes: ''
  });
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">
          You do not have permission to view this page.
        </p>
      </div>);

  }
  const getItemName = (rs: any) => {
    if (rs.inventory_id) {
      return (
        inventory.find((i) => i.id === rs.inventory_id)?.item_name ||
        'Unknown Item');

    }
    return (
      components.find((c) => c.id === rs.component_id)?.item_name ||
      'Unknown Component');

  };
  const getItemType = (rs: any) => {
    return rs.inventory_id ? 'Inventory' : 'Component';
  };
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSave = () => {
    if (!formData.selected_id || !formData.reserved_for) {
      toast.error('Item and Reserved For fields are required');
      return;
    }
    addReservedStock({
      inventory_id: itemType === 'inventory' ? formData.selected_id : null,
      component_id: itemType === 'component' ? formData.selected_id : null,
      quantity_reserved: Number(formData.quantity_reserved),
      reserved_for: formData.reserved_for,
      reserved_by: currentUser?.id || '',
      reservation_date: new Date().toISOString(),
      expected_release_date: formData.expected_release_date || null,
      status: 'Active' as ReservedStockStatus,
      notes: formData.notes
    });
    toast.success('Stock reserved successfully');
    setIsAddOpen(false);
    setFormData({
      selected_id: '',
      quantity_reserved: 1,
      reserved_for: '',
      expected_release_date: '',
      notes: ''
    });
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Reserved Stock
          </h1>
          <p className="text-muted-foreground">
            Manage items reserved for specific projects or requests
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reserve Stock</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Tabs
                value={itemType}
                onValueChange={(v) => {
                  setItemType(v as 'inventory' | 'component');
                  handleChange('selected_id', '');
                }}>
                
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  <TabsTrigger value="component">Component</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <Label>
                  Select Item <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.selected_id}
                  onValueChange={(v) => handleChange('selected_id', v)}>
                  
                  <SelectTrigger>
                    <SelectValue placeholder="Select item to reserve" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemType === 'inventory' ?
                    inventory.
                    filter((i) => !i.is_deleted).
                    map((i) =>
                    <SelectItem key={i.id} value={i.id}>
                              {i.item_name} ({i.serial_number})
                            </SelectItem>
                    ) :
                    components.
                    filter((c) => !c.is_deleted).
                    map((c) =>
                    <SelectItem key={c.id} value={c.id}>
                              {c.item_name} ({c.part_number})
                            </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity_reserved}
                  onChange={(e) =>
                  handleChange('quantity_reserved', e.target.value)
                  } />
                
              </div>

              <div className="space-y-2">
                <Label>
                  Reserved For (Project/User){' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.reserved_for}
                  onChange={(e) => handleChange('reserved_for', e.target.value)}
                  placeholder="e.g. Project Phoenix" />
                
              </div>

              <div className="space-y-2">
                <Label>Expected Release Date</Label>
                <Input
                  type="date"
                  value={formData.expected_release_date}
                  onChange={(e) =>
                  handleChange('expected_release_date', e.target.value)
                  } />
                
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Reason for reservation..." />
                
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Reserve Stock</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Reserved For</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Reserved By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservedStock.length > 0 ?
              reservedStock.map((rs) =>
              <TableRow key={rs.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center font-medium">
                          <BoxIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                          {getItemName(rs)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {getItemType(rs)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{rs.reserved_for}</TableCell>
                    <TableCell>{rs.quantity_reserved}</TableCell>
                    <TableCell>{getUserName(rs.reserved_by)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(rs.reservation_date)}</div>
                        {rs.expected_release_date &&
                    <div className="text-xs text-muted-foreground">
                            Until: {formatDate(rs.expected_release_date)}
                          </div>
                    }
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                    variant="outline"
                    className={getStatusColor(rs.status)}>
                    
                        {rs.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toast.info('Edit feature coming soon')}>
                      
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() =>
                      toast.info('Delete feature coming soon')
                      }>
                      
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground">
                  
                    No reserved stock found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);

}