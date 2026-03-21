import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter } from
'../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import { Avatar, AvatarFallback } from '../components/ui/Avatar';
import { getInitials } from '../lib/utils';
import { toast } from 'sonner';
export function SettingsPage() {
  const { currentUser, updateUser, getRegionName, getWarehouseName } =
  useStore();
  const [name, setName] = useState(currentUser?.full_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  if (!currentUser) return null;
  const handleUpdateProfile = () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    updateUser(currentUser.id, {
      full_name: name
    });
    toast.success('Profile updated successfully');
  };
  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    // In a real app, we'd verify current password and hash the new one
    toast.success('Password updated successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };
  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your personal information and system access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {getInitials(currentUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-lg">{currentUser.full_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentUser.email}
                </p>
                <Badge className="mt-1" variant="secondary">
                  {currentUser.role}
                </Badge>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)} />
                
              </div>

              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={currentUser.username} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Assigned Region</p>
                  <p className="text-sm text-muted-foreground">
                    {currentUser.assigned_region_id ?
                    getRegionName(currentUser.assigned_region_id) :
                    'All Regions'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Assigned Warehouse</p>
                  <p className="text-sm text-muted-foreground">
                    {currentUser.assigned_warehouse_id ?
                    getWarehouseName(currentUser.assigned_warehouse_id) :
                    'All Warehouses'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpdateProfile}>Save Changes</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current Password</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} />
              
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New Password</Label>
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} />
              
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm New Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} />
              
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" onClick={handleUpdatePassword}>
              Update Password
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>);

}