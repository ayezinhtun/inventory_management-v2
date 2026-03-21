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
import { Plus, PackageCheck } from 'lucide-react';
import { formatDate, generateRequestNumber } from '../lib/utils';
import { toast } from 'sonner';
import type { ItemCondition } from '../lib/types';
export function GoodsReceiptPage() {
  const {
    goodsReceipts,
    purchaseOrders,
    currentUser,
    getUserName,
    addGoodsReceipt,
    updatePurchaseOrder
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Form state
  const [poId, setPoId] = useState('');
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<
    {
      item_name: string;
      expected_qty: number;
      received_qty: number;
      condition: ItemCondition;
      notes: string;
    }[]>(
    []);
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">
          You do not have permission to view this page.
        </p>
      </div>);

  }
  const availablePOs = purchaseOrders.filter(
    (po) => po.status === 'Ordered' || po.status === 'Partially Received'
  );
  const handlePoSelect = (id: string) => {
    setPoId(id);
    const po = purchaseOrders.find((p) => p.id === id);
    if (po) {
      setLineItems(
        po.line_items.map((item) => ({
          item_name: item.item_name,
          expected_qty: item.quantity,
          received_qty: item.quantity,
          condition: 'New' as ItemCondition,
          notes: ''
        }))
      );
    }
  };
  const handleLineItemChange = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    setLineItems(newItems);
  };
  const handleSave = () => {
    if (!poId) {
      toast.error('Please select a Purchase Order');
      return;
    }
    const isFullyReceived = lineItems.every(
      (item) => item.received_qty >= item.expected_qty
    );
    const status = isFullyReceived ? 'Fully Received' : 'Partially Received';
    addGoodsReceipt({
      receipt_number: generateRequestNumber('GR'),
      po_id: poId,
      received_by: currentUser.id,
      received_date: new Date(receivedDate).toISOString(),
      line_items: lineItems,
      status,
      notes
    });
    // Update PO status
    updatePurchaseOrder(poId, {
      status
    });
    toast.success('Goods receipt created successfully');
    setIsDialogOpen(false);
    resetForm();
  };
  const resetForm = () => {
    setPoId('');
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setLineItems([]);
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'Partially Received':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Partially Received
          </Badge>);

      case 'Fully Received':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Fully Received
          </Badge>);

      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Goods Receipts
          </h1>
          <p className="text-muted-foreground">
            Receive and inspect incoming hardware shipments
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Receipt
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>PO #</TableHead>
                <TableHead>Received By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goodsReceipts.length > 0 ?
              goodsReceipts.map((gr) => {
                const po = purchaseOrders.find((p) => p.id === gr.po_id);
                return (
                  <TableRow key={gr.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <PackageCheck className="h-4 w-4 mr-2 text-muted-foreground" />
                          {gr.receipt_number}
                        </div>
                      </TableCell>
                      <TableCell>{po?.po_number || 'Unknown'}</TableCell>
                      <TableCell>{getUserName(gr.received_by)}</TableCell>
                      <TableCell>{formatDate(gr.received_date)}</TableCell>
                      <TableCell>{getStatusBadge(gr.status)}</TableCell>
                    </TableRow>);

              }) :

              <TableRow>
                  <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground">
                  
                    No goods receipts found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Receive Goods</DialogTitle>
            <DialogDescription>
              Record incoming items against a purchase order.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Order *</Label>
                  <Select value={poId} onValueChange={handlePoSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select PO" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePOs.map((po) =>
                      <SelectItem key={po.id} value={po.id}>
                          {po.po_number}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Received Date</Label>
                  <Input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)} />
                  
                </div>
              </div>

              {lineItems.length > 0 &&
              <div className="space-y-4">
                  <h3 className="text-sm font-medium">Items Received</h3>
                  <div className="space-y-4">
                    {lineItems.map((item, index) =>
                  <div
                    key={index}
                    className="p-4 border rounded-lg space-y-4 bg-muted/30">
                    
                        <div className="font-medium">{item.item_name}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Expected Qty</Label>
                            <Input value={item.expected_qty} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Received Qty</Label>
                            <Input
                          type="number"
                          min="0"
                          max={item.expected_qty}
                          value={item.received_qty}
                          onChange={(e) =>
                          handleLineItemChange(
                            index,
                            'received_qty',
                            Number(e.target.value)
                          )
                          } />
                        
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Condition</Label>
                            <Select
                          value={item.condition}
                          onValueChange={(v) =>
                          handleLineItemChange(index, 'condition', v)
                          }>
                          
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Used">Used</SelectItem>
                                <SelectItem value="Refurbished">
                                  Refurbished
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Notes</Label>
                            <Input
                          placeholder="Any damage?"
                          value={item.notes}
                          onChange={(e) =>
                          handleLineItemChange(
                            index,
                            'notes',
                            e.target.value
                          )
                          } />
                        
                          </div>
                        </div>
                      </div>
                  )}
                  </div>
                </div>
              }

              <div className="space-y-2">
                <Label>General Notes</Label>
                <Textarea
                  placeholder="Additional observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)} />
                
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!poId}>
              Save Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}