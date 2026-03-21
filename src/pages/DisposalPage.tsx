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
import { RadioGroup, RadioGroupItem } from '../components/ui/RadioGroup';
import { Plus, Trash } from 'lucide-react';
import { formatDate, generateRequestNumber } from '../lib/utils';
import { toast } from 'sonner';
export function DisposalPage() {
  const {
    disposalRecords,
    inventory,
    components,
    currentUser,
    addDisposalRecord
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Form state
  const [itemType, setItemType] = useState('inventory');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [reason, setReason] = useState('');
  const [disposalMethod, setDisposalMethod] = useState(
    'Certified E-Waste Recycling'
  );
  const [quantity, setQuantity] = useState(1);
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
    if (!selectedItemId || !reason || !disposalMethod) {
      toast.error('Please fill out all required fields');
      return;
    }
    let itemName = '';
    if (itemType === 'inventory') {
      itemName = inventory.find((i) => i.id === selectedItemId)?.item_name || '';
    } else {
      itemName =
      components.find((c) => c.id === selectedItemId)?.item_name || '';
    }
    addDisposalRecord({
      disposal_number: generateRequestNumber('DISP'),
      inventory_id: itemType === 'inventory' ? selectedItemId : null,
      component_id: itemType === 'component' ? selectedItemId : null,
      item_name: itemName,
      reason,
      disposal_method: disposalMethod,
      quantity,
      status: 'Pending',
      approved_by: null,
      disposed_date: null,
      certificate_number: '',
      notes,
      created_by: currentUser.id
    });
    toast.success('Disposal request created successfully');
    setIsDialogOpen(false);
    resetForm();
  };
  const resetForm = () => {
    setItemType('inventory');
    setSelectedItemId('');
    setReason('');
    setDisposalMethod('Certified E-Waste Recycling');
    setQuantity(1);
    setNotes('');
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'Approved':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Approved
          </Badge>);

      case 'Disposed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Disposed
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
            Asset Disposal
          </h1>
          <p className="text-muted-foreground">
            Manage end-of-life hardware and secure disposal
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Disposal
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disposal #</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Certificate #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disposalRecords.length > 0 ?
              disposalRecords.map((disp) =>
              <TableRow key={disp.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Trash className="h-4 w-4 mr-2 text-muted-foreground" />
                        {disp.disposal_number}
                      </div>
                    </TableCell>
                    <TableCell>{disp.item_name}</TableCell>
                    <TableCell
                  className="max-w-xs truncate"
                  title={disp.reason}>
                  
                      {disp.reason}
                    </TableCell>
                    <TableCell>{disp.disposal_method}</TableCell>
                    <TableCell>{disp.quantity}</TableCell>
                    <TableCell>{getStatusBadge(disp.status)}</TableCell>
                    <TableCell>{disp.certificate_number || '—'}</TableCell>
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground">
                  
                    No disposal records found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Asset Disposal</DialogTitle>
            <DialogDescription>
              Submit hardware for secure destruction or recycling.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6 py-4">
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <Label>Item to Dispose *</Label>
                <RadioGroup
                  value={itemType}
                  onValueChange={setItemType}
                  className="flex gap-4">
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inventory" id="d-inv" />
                    <Label htmlFor="d-inv">Inventory Device</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="component" id="d-comp" />
                    <Label htmlFor="d-comp">Component</Label>
                  </div>
                </RadioGroup>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-2">
                    <Select
                      value={selectedItemId}
                      onValueChange={setSelectedItemId}>
                      
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
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
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      placeholder="Qty" />
                    
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Disposal Method *</Label>
                  <Select
                    value={disposalMethod}
                    onValueChange={setDisposalMethod}>
                    
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Certified E-Waste Recycling">
                        Certified E-Waste Recycling
                      </SelectItem>
                      <SelectItem value="Destruction">
                        Physical Destruction
                      </SelectItem>
                      <SelectItem value="Donation">Donation</SelectItem>
                      <SelectItem value="Resale">Resale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason for Disposal *</Label>
                <Textarea
                  placeholder="Why is this item being disposed?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3} />
                
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Any special handling instructions?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2} />
                
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}