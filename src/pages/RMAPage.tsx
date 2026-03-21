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
import { Plus, RefreshCcw } from 'lucide-react';
import { formatDate, generateRequestNumber } from '../lib/utils';
import { toast } from 'sonner';
export function RMAPage() {
  const {
    rmaRecords,
    vendors,
    inventory,
    components,
    currentUser,
    getVendorName,
    addRMARecord
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Form state
  const [vendorId, setVendorId] = useState('');
  const [itemType, setItemType] = useState('inventory');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [trackingNumber, setTrackingNumber] = useState('');
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">
          You do not have permission to view this page.
        </p>
      </div>);

  }
  const handleSave = () => {
    if (!vendorId || !selectedItemId || !reason) {
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
    addRMARecord({
      rma_number: generateRequestNumber('RMA'),
      vendor_id: vendorId,
      inventory_id: itemType === 'inventory' ? selectedItemId : null,
      component_id: itemType === 'component' ? selectedItemId : null,
      item_name: itemName,
      reason,
      quantity,
      status: 'Initiated',
      shipped_date: null,
      received_date: null,
      resolution: '',
      tracking_number: trackingNumber,
      created_by: currentUser.id
    });
    toast.success('RMA created successfully');
    setIsDialogOpen(false);
    resetForm();
  };
  const resetForm = () => {
    setVendorId('');
    setItemType('inventory');
    setSelectedItemId('');
    setReason('');
    setQuantity(1);
    setTrackingNumber('');
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Initiated':
        return <Badge variant="secondary">Initiated</Badge>;
      case 'Shipped':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Shipped
          </Badge>);

      case 'Received by Vendor':
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Received by Vendor
          </Badge>);

      case 'In Process':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            In Process
          </Badge>);

      case 'Resolved':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Resolved
          </Badge>);

      case 'Closed':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Closed
          </Badge>);

      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            RMA Management
          </h1>
          <p className="text-muted-foreground">
            Return Merchandise Authorization for faulty hardware
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New RMA
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RMA #</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rmaRecords.length > 0 ?
              rmaRecords.map((rma) =>
              <TableRow key={rma.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <RefreshCcw className="h-4 w-4 mr-2 text-muted-foreground" />
                        {rma.rma_number}
                      </div>
                    </TableCell>
                    <TableCell>{rma.item_name}</TableCell>
                    <TableCell>{getVendorName(rma.vendor_id)}</TableCell>
                    <TableCell className="max-w-xs truncate" title={rma.reason}>
                      {rma.reason}
                    </TableCell>
                    <TableCell>{rma.quantity}</TableCell>
                    <TableCell>{getStatusBadge(rma.status)}</TableCell>
                    <TableCell>{rma.tracking_number || '—'}</TableCell>
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground">
                  
                    No RMA records found.
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
            <DialogTitle>Create RMA</DialogTitle>
            <DialogDescription>
              Initiate a return for faulty or incorrect hardware.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor *</Label>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) =>
                      <SelectItem key={v.id} value={v.id}>
                          {v.vendor_name}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tracking Number</Label>
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Optional" />
                  
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <Label>Item to Return *</Label>
                <RadioGroup
                  value={itemType}
                  onValueChange={setItemType}
                  className="flex gap-4">
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inventory" id="r-inv" />
                    <Label htmlFor="r-inv">Inventory Device</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="component" id="r-comp" />
                    <Label htmlFor="r-comp">Component</Label>
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

              <div className="space-y-2">
                <Label>Reason for Return *</Label>
                <Textarea
                  placeholder="Describe the issue or fault..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4} />
                
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Create RMA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}