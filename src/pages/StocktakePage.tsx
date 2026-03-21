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
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { ScrollArea } from '../components/ui/ScrollArea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
'../components/ui/Dialog';
import { Plus, ClipboardCheck } from 'lucide-react';
import { formatDate, generateRequestNumber } from '../lib/utils';
import { toast } from 'sonner';
export function StocktakePage() {
  const {
    stocktakeRecords,
    warehouses,
    users,
    inventory,
    currentUser,
    getWarehouseName,
    getUserName,
    addStocktakeRecord
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Form state
  const [warehouseId, setWarehouseId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">
          You do not have permission to view this page.
        </p>
      </div>);

  }
  const handleSave = () => {
    if (!warehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    // Auto-populate items from inventory for this warehouse
    const warehouseInventory = inventory.filter(
      (i) => i.warehouse_id === warehouseId && !i.is_deleted
    );
    const items = warehouseInventory.map((i) => ({
      item_id: i.id,
      item_name: i.item_name,
      expected_qty: i.quantity,
      actual_qty: 0,
      discrepancy: 0,
      notes: ''
    }));
    addStocktakeRecord({
      stocktake_number: generateRequestNumber('ST'),
      warehouse_id: warehouseId,
      scheduled_date: new Date(scheduledDate).toISOString(),
      completed_date: null,
      assigned_to: assignedTo || null,
      status: 'Planned',
      items,
      notes,
      created_by: currentUser.id
    });
    toast.success('Stocktake scheduled successfully');
    setIsDialogOpen(false);
    resetForm();
  };
  const resetForm = () => {
    setWarehouseId('');
    setScheduledDate(new Date().toISOString().split('T')[0]);
    setAssignedTo('');
    setNotes('');
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Planned':
        return <Badge variant="secondary">Planned</Badge>;
      case 'In Progress':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            In Progress
          </Badge>);

      case 'Completed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Completed
          </Badge>);

      case 'Cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Stocktake & Audits
          </h1>
          <p className="text-muted-foreground">
            Schedule and manage physical inventory counts
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Stocktake
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stocktake #</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Items Count</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocktakeRecords.length > 0 ?
              stocktakeRecords.map((st) =>
              <TableRow key={st.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <ClipboardCheck className="h-4 w-4 mr-2 text-muted-foreground" />
                        {st.stocktake_number}
                      </div>
                    </TableCell>
                    <TableCell>{getWarehouseName(st.warehouse_id)}</TableCell>
                    <TableCell>{formatDate(st.scheduled_date)}</TableCell>
                    <TableCell>
                      {st.assigned_to ?
                  getUserName(st.assigned_to) :
                  'Unassigned'}
                    </TableCell>
                    <TableCell>{st.items.length} items</TableCell>
                    <TableCell>{getStatusBadge(st.status)}</TableCell>
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground">
                  
                    No stocktake records found.
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
            <DialogTitle>Schedule Stocktake</DialogTitle>
            <DialogDescription>
              Create a new physical inventory count for a warehouse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Warehouse *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
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
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)} />
              
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) =>
                  <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Instructions for the auditor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3} />
              
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}