import React, { useEffect, useState } from 'react';
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
import { Switch } from '../components/ui/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import { Plus, UserCog, Edit } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';
import type { User, UserRole } from '../lib/types';
import { useAuthStore } from '../store/useAuthStore';
export function UsersPage() {
  const {
    users,
    fetchUsers,
    regions,
    warehouses,
    getRegionName,
    getWarehouseName,
    addUser,
    updateUser
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'Engineer' as UserRole,
    assigned_region_id: 'none',
    assigned_warehouse_id: 'none',
    is_active: true
  });
  const { profile } = useAuthStore();

useEffect(() => {
  fetchUsers();
}, [fetchUsers]);

if (profile?.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">
          You do not have permission to view this page.
        </p>
      </div>);

  }
  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        assigned_region_id: user.assigned_region_id || 'none',
        assigned_warehouse_id: user.assigned_warehouse_id || 'none',
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: '',
        username: '',
        email: '',
        password: '',
        role: 'Engineer',
        assigned_region_id: 'none',
        assigned_warehouse_id: 'none',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };
  const handleSave = () => {
    if (
    !formData.full_name.trim() ||
    !formData.username.trim() ||
    !formData.email.trim())
    {
      toast.error('Name, username, and email are required');
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }
    const userData = {
      full_name: formData.full_name,
      username: formData.username,
      email: formData.email,
      role: formData.role,
      assigned_region_id:
      formData.assigned_region_id === 'none' ?
      null :
      formData.assigned_region_id,
      assigned_warehouse_id:
      formData.assigned_warehouse_id === 'none' ?
      null :
      formData.assigned_warehouse_id,
      is_active: formData.is_active
    };
    if (editingUser) {
      updateUser(editingUser.id, userData);
      toast.success('User updated successfully');
    } else {
      addUser({
        ...userData,
        password_hash: formData.password,
        last_login: null
      });
      toast.success('User added successfully');
    }
    setIsDialogOpen(false);
  };
  const availableWarehouses =
  formData.assigned_region_id !== 'none' ?
  warehouses.filter((w) => w.region_id === formData.assigned_region_id) :
  warehouses;
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Users
          </h1>
          <p className="text-muted-foreground">
            Manage system access and roles
          </p>
        </div>

        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ?
              users.map((user) =>
              <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                    variant={
                    user.role === 'Admin' ?
                    'default' :
                    user.role === 'PM' ?
                    'secondary' :
                    'outline'
                    }>
                    
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.assigned_region_id ?
                  getRegionName(user.assigned_region_id) :
                  'All Regions'}
                    </TableCell>
                    <TableCell>
                      {user.assigned_warehouse_id ?
                  getWarehouseName(user.assigned_warehouse_id) :
                  'All Warehouses'}
                    </TableCell>
                    <TableCell>
                      <Badge
                    variant={user.is_active ? 'default' : 'secondary'}
                    className={
                    user.is_active ?
                    'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                    ''
                    }>
                    
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.last_login)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenDialog(user)}>
                    
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground">
                  
                    No users found.
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
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editingUser ?
              'Update user details and access.' :
              'Create a new user account.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullname">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullname"
                value={formData.full_name}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  full_name: e.target.value
                })
                } />
              
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value
                  })
                  }
                  disabled={!!editingUser} />
                
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value
                  })
                  } />
                
              </div>
            </div>

            {!editingUser &&
            <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  password: e.target.value
                })
                } />
              
              </div>
            }

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(val: UserRole) =>
                setFormData({
                  ...formData,
                  role: val
                })
                }>
                
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="PM">Project Manager (PM)</SelectItem>
                  <SelectItem value="Engineer">Engineer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role !== 'Admin' &&
            <>
                <div className="space-y-2">
                  <Label htmlFor="region">Assigned Region</Label>
                  <Select
                  value={formData.assigned_region_id}
                  onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    assigned_region_id: val,
                    assigned_warehouse_id: 'none'
                  })
                  }>
                  
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (No Access)</SelectItem>
                      {regions.
                    filter((r) => r.is_active).
                    map((r) =>
                    <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                    )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warehouse">Assigned Warehouse</Label>
                  <Select
                  value={formData.assigned_warehouse_id}
                  onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    assigned_warehouse_id: val
                  })
                  }

                  disabled={formData.assigned_region_id === 'none'}>
                  
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (No Access)</SelectItem>
                      {availableWarehouses.
                    filter((w) => w.is_active).
                    map((w) =>
                    <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                    )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            }

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="active">Account Active</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive users cannot log in
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
                }
                disabled={editingUser?.id === profile?.user_id} // Cannot deactivate self
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}