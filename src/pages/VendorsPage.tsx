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
import { Textarea } from '../components/ui/Textarea';
import { Switch } from '../components/ui/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import { Plus, Store, Edit, Trash2, Star, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
export function VendorsPage() {
  const { vendors, currentUser, addVendor } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_code: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    vendor_type: 'Hardware',
    payment_terms: '',
    lead_time_days: 0,
    is_preferred: false,
    products_services: '',
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
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) =>
        <Star
          key={star}
          className={`h-3 w-3 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />

        )}
      </div>);

  };
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSave = async () => {
    if (!formData.vendor_name || !formData.vendor_type) {
      toast.error('Vendor Name and Type are required');
      return;
    }
    setSaveLoading(true);
    try {
      await addVendor({
        ...formData,
        rating: 0,
        is_active: true
      });
      toast.success('Vendor added successfully');
      setIsAddOpen(false);
      setFormData({
        vendor_name: '',
        vendor_code: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        vendor_type: 'Hardware',
        payment_terms: '',
        lead_time_days: 0,
        is_preferred: false,
        products_services: '',
        notes: ''
      });
    } catch (error) {
      toast.error('Failed to add vendor');
      console.error('Error adding vendor:', error);
    } finally {
      setSaveLoading(false);
    }
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Vendors
          </h1>
          <p className="text-muted-foreground">
            Manage hardware suppliers and service providers
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>
                  Vendor Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => handleChange('vendor_name', e.target.value)}
                  placeholder="e.g. Dell EMC" />
                
              </div>
              <div className="space-y-2">
                <Label>Vendor Code</Label>
                <Input
                  value={formData.vendor_code}
                  onChange={(e) => handleChange('vendor_code', e.target.value)}
                  placeholder="e.g. V-DELL-01" />
                
              </div>
              <div className="space-y-2">
                <Label>
                  Vendor Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.vendor_type}
                  onValueChange={(v) => handleChange('vendor_type', v)}>
                  
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Services">Services</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
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
                  placeholder="contact@vendor.com" />
                
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 234 567 8900" />
                
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://vendor.com" />
                
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) =>
                  handleChange('payment_terms', e.target.value)
                  }
                  placeholder="e.g. Net 30" />
                
              </div>
              <div className="space-y-2">
                <Label>Lead Time (Days)</Label>
                <Input
                  type="number"
                  value={formData.lead_time_days}
                  onChange={(e) =>
                  handleChange('lead_time_days', Number(e.target.value))
                  } />
                
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="preferred"
                  checked={formData.is_preferred}
                  onCheckedChange={(c) => handleChange('is_preferred', c)} />
                
                <Label htmlFor="preferred">Preferred Vendor</Label>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Products / Services</Label>
                <Input
                  value={formData.products_services}
                  onChange={(e) =>
                  handleChange('products_services', e.target.value)
                  }
                  placeholder="e.g. Servers, Storage, Networking" />
                
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Additional details..." />
                
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={saveLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveLoading}>
                {saveLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Vendor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length > 0 ?
              vendors.map((vendor) =>
              <TableRow key={vendor.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center font-medium">
                          <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                          {vendor.vendor_name}
                          {vendor.is_preferred &&
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        
                              Preferred
                            </Badge>
                      }
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center">
                          {vendor.website &&
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center hover:underline">
                        
                              {vendor.website.replace(/^https?:\/\//, '')}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                      }
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{vendor.vendor_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{vendor.contact_person || '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {vendor.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{renderStars(vendor.rating)}</TableCell>
                    <TableCell>
                      {vendor.is_active ?
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
                          Active
                        </Badge> :

                  <Badge variant="secondary">Inactive</Badge>
                  }
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
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground">
                  
                    No vendors found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);

}