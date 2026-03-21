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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter } from
'../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import { Plus, Users, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
export function CustomersPage() {
  const { customers, currentUser, addCustomer } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    customer_type: 'Enterprise'
  });
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">
          You do not have permission to view this page.
        </p>
      </div>);

  }
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSave = () => {
    if (!formData.customer_name || !formData.customer_type) {
      toast.error('Customer Name and Type are required');
      return;
    }
    addCustomer(formData);
    toast.success('Customer added successfully');
    setIsAddOpen(false);
    setFormData({
      customer_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      customer_type: 'Enterprise'
    });
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Customers
          </h1>
          <p className="text-muted-foreground">
            Manage customers and their assigned inventory
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) =>
                  handleChange('customer_name', e.target.value)
                  }
                  placeholder="e.g. Acme Corp" />
                
              </div>
              <div className="space-y-2">
                <Label>
                  Customer Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.customer_type}
                  onValueChange={(v) => handleChange('customer_type', v)}>
                  
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                    <SelectItem value="SMB">SMB</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) =>
                  handleChange('contact_person', e.target.value)
                  }
                  placeholder="Name" />
                
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@customer.com" />
                
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 234 567 8900" />
                
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Full address" />
                
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Customer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length > 0 ?
              customers.map((customer) =>
              <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                        {customer.customer_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.customer_type}</Badge>
                    </TableCell>
                    <TableCell>{customer.contact_person || '—'}</TableCell>
                    <TableCell>{customer.email || '—'}</TableCell>
                    <TableCell>{customer.phone || '—'}</TableCell>
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
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground">
                  
                    No customers found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);

}