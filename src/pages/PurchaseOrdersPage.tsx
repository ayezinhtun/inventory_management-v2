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
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { formatDate, formatCurrency, generateRequestNumber } from '../lib/utils';
import { toast } from 'sonner';
export function PurchaseOrdersPage() {
  const {
    purchaseOrders,
    vendors,
    currentUser,
    getVendorName,
    addPurchaseOrder
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Form state
  const [vendorId, setVendorId] = useState('');
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([
  {
    item_name: '',
    quantity: 1,
    unit_price: 0,
    total: 0
  }]
  );
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">
          You do not have permission to view this page.
        </p>
      </div>);

  }
  const handleAddLineItem = () => {
    setLineItems([
    ...lineItems,
    {
      item_name: '',
      quantity: 1,
      unit_price: 0,
      total: 0
    }]
    );
  };
  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };
  const handleLineItemChange = (
  index: number,
  field: string,
  value: string | number) =>
  {
    const newItems = [...lineItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total =
      Number(newItems[index].quantity) * Number(newItems[index].unit_price);
    }
    setLineItems(newItems);
  };
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.1; // 10% tax
  const shippingCost = 0; // simplified
  const totalAmount = subtotal + tax + shippingCost;
  const handleSave = () => {
    if (!vendorId) {
      toast.error('Please select a vendor');
      return;
    }
    if (lineItems.some((item) => !item.item_name || item.quantity <= 0)) {
      toast.error('Please fill out all line items correctly');
      return;
    }
    addPurchaseOrder({
      po_number: generateRequestNumber('PO'),
      vendor_id: vendorId,
      order_date: new Date(orderDate).toISOString(),
      expected_delivery_date: expectedDeliveryDate ?
      new Date(expectedDeliveryDate).toISOString() :
      null,
      status: 'Draft',
      line_items: lineItems,
      subtotal,
      tax,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      payment_terms: paymentTerms,
      notes,
      requested_by: currentUser.id,
      approved_by: null
    });
    toast.success('Purchase order created successfully');
    setIsDialogOpen(false);
    resetForm();
  };
  const resetForm = () => {
    setVendorId('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setExpectedDeliveryDate('');
    setPaymentTerms('Net 30');
    setNotes('');
    setLineItems([
    {
      item_name: '',
      quantity: 1,
      unit_price: 0,
      total: 0
    }]
    );
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'Submitted':
        return <Badge>Submitted</Badge>;
      case 'Approved':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-100">
            Approved
          </Badge>);

      case 'Ordered':
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 hover:bg-purple-100">
            Ordered
          </Badge>);

      case 'Partially Received':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:bg-yellow-100">
            Partially Received
          </Badge>);

      case 'Fully Received':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100">
            Fully Received
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
            Purchase Orders
          </h1>
          <p className="text-muted-foreground">
            Manage hardware and component procurement
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.length > 0 ?
              purchaseOrders.map((po) =>
              <TableRow key={po.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <ShoppingCart className="h-4 w-4 mr-2 text-muted-foreground" />
                        {po.po_number}
                      </div>
                    </TableCell>
                    <TableCell>{getVendorName(po.vendor_id)}</TableCell>
                    <TableCell>{formatDate(po.order_date)}</TableCell>
                    <TableCell>
                      {formatDate(po.expected_delivery_date)}
                    </TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(po.total_amount)}
                    </TableCell>
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground">
                  
                    No purchase orders found.
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
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new purchase order for hardware procurement.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
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
                  <Label>Order Date</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)} />
                  
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery Date</Label>
                  <Input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
                  
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Due on Receipt">
                        Due on Receipt
                      </SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 45">Net 45</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Line Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLineItem}>
                    
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {lineItems.map((item, index) =>
                  <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1 space-y-2">
                        <Input
                        placeholder="Item description"
                        value={item.item_name}
                        onChange={(e) =>
                        handleLineItemChange(
                          index,
                          'item_name',
                          e.target.value
                        )
                        } />
                      
                      </div>
                      <div className="w-24 space-y-2">
                        <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                        handleLineItemChange(
                          index,
                          'quantity',
                          e.target.value
                        )
                        } />
                      
                      </div>
                      <div className="w-32 space-y-2">
                        <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                        handleLineItemChange(
                          index,
                          'unit_price',
                          e.target.value
                        )
                        } />
                      
                      </div>
                      <div className="w-32 pt-2 text-right font-medium">
                        {formatCurrency(item.total)}
                      </div>
                      <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleRemoveLineItem(index)}
                      disabled={lineItems.length === 1}>
                      
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (10%):</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional instructions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)} />
                
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Create Purchase Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}