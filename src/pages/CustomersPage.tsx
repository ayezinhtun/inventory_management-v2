import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useCustomersStore, type Customer } from '../store/useCustomersStore';
import { useAuthStore } from '../store/useAuthStore';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../components/ui/Dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '../components/ui/Sheet';
import { Separator } from '../components/ui/Separator';
import {
  Plus, Users, Edit, Trash2, Search, Building2, Mail, Phone,
  MapPin, FileText, Loader2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../lib/utils';

const CUSTOMER_TYPES = ['Enterprise', 'SMB', 'Government', 'Education', 'Other'];

const BLANK_FORM = {
  customer_name: '',
  customer_type: 'Enterprise',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

function typeBadgeClass(type: string) {
  const map: Record<string, string> = {
    Enterprise: 'bg-purple-100 text-purple-800',
    SMB: 'bg-blue-100 text-blue-800',
    Government: 'bg-amber-100 text-amber-800',
    Education: 'bg-green-100 text-green-800',
    Other: 'bg-gray-100 text-gray-800',
  };
  return map[type] ?? 'bg-gray-100 text-gray-800';
}

export function CustomersPage() {
  const { currentUser } = useStore();
  const { profile } = useAuthStore();
  const { customers, isLoading, fetchCustomers, createCustomer, updateCustomer, deleteCustomer } = useCustomersStore();

  const [search, setSearch] = useState('');

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  // Detail sheet
  const [sheetCustomer, setSheetCustomer] = useState<Customer | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">You do not have permission to view this page.</p>
      </div>
    );
  }

  const filtered = search.trim()
    ? customers.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.customer_name.toLowerCase().includes(q) ||
          (c.contact_person ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          (c.phone ?? '').toLowerCase().includes(q) ||
          (c.address ?? '').toLowerCase().includes(q) ||
          c.customer_type.toLowerCase().includes(q)
        );
      })
    : customers;

  // ── open dialog ────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingCustomer(null);
    setForm(BLANK_FORM);
    setDialogOpen(true);
  }

  function openEdit(c: Customer) {
    setSheetCustomer(null);
    setEditingCustomer(c);
    setForm({
      customer_name: c.customer_name,
      customer_type: c.customer_type,
      contact_person: c.contact_person ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
    });
    setDialogOpen(true);
  }

  // ── save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.customer_name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_type: form.customer_type,
        contact_person: form.contact_person.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        status: 'active',
        created_by: profile?.user_id ?? null,
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        toast.success('Customer updated');
        // Refresh sheet if open
        const updated = useCustomersStore.getState().customers.find((c) => c.id === editingCustomer.id);
        if (updated && sheetCustomer?.id === editingCustomer.id) setSheetCustomer(updated);
      } else {
        await createCustomer(payload);
        toast.success('Customer created');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  }

  // ── delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteCustomer(deleteTarget.id);
      toast.success(`${deleteTarget.customer_name} deleted`);
      setDeleteTarget(null);
      if (sheetCustomer?.id === deleteTarget.id) setSheetCustomer(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete customer');
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Customers</h1>
          <p className="text-muted-foreground">Manage customers and their contact information</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {search ? 'No customers match your search.' : 'No customers yet. Click "Add Customer" to create one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSheetCustomer(c)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          {c.customer_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeBadgeClass(c.customer_type)}>
                          {c.customer_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.contact_person || '—'}</TableCell>
                      <TableCell>{c.email || '—'}</TableCell>
                      <TableCell>{c.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={c.status === 'active' ? 'default' : 'secondary'}
                          className={c.status === 'active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? 'Update customer details.' : 'Fill in the customer information below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div className="space-y-2">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  placeholder="Full name"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes…"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : (editingCustomer ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!sheetCustomer} onOpenChange={(o) => !o && setSheetCustomer(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {sheetCustomer && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <SheetTitle>{sheetCustomer.customer_name}</SheetTitle>
                    <SheetDescription>{sheetCustomer.customer_type}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { icon: Users, label: 'Contact', value: sheetCustomer.contact_person },
                    { icon: Mail, label: 'Email', value: sheetCustomer.email },
                    { icon: Phone, label: 'Phone', value: sheetCustomer.phone },
                    { icon: MapPin, label: 'Address', value: sheetCustomer.address },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </div>
                      <p className="font-medium">{value || '—'}</p>
                    </div>
                  ))}
                </div>

                {sheetCustomer.notes && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <FileText className="h-3.5 w-3.5" />
                        Notes
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{sheetCustomer.notes}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Created: {formatDate(sheetCustomer.created_at)}</p>
                  <p>Last updated: {formatDate(sheetCustomer.updated_at)}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={() => openEdit(sheetCustomer)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => { setDeleteTarget(sheetCustomer); setSheetCustomer(null); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Customer
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.customer_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
