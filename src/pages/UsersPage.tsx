import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUsersStore, type UserRecord, type UserActivityLog } from '../store/useUsersStore';
import { useRegionStore } from '../store/useRegionStore';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Switch } from '../components/ui/Switch';
import { Avatar, AvatarFallback } from '../components/ui/Avatar';
import { Separator } from '../components/ui/Separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/Dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '../components/ui/Sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/DropdownMenu';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { ScrollArea } from '../components/ui/ScrollArea';
import { Skeleton } from '../components/ui/Skeleton';
import { toast } from 'sonner';
import {
  Plus, MoreVertical, KeyRound, Mail, Trash2, User, History,
  Loader2, Copy, CheckCircle2, AlertTriangle, RefreshCw, Search,
  Shield, ShieldCheck, Clock, Users,
} from 'lucide-react';
import { getInitials, formatDate } from '../lib/utils';
import type { UserRole } from '../lib/types';
import { MultiSelect } from '../components/ui/MultiSelect';

// ── Helpers ────────────────────────────────────────────────────────────────

function isOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-green-500' : 'bg-muted-foreground/30'
        }`}
      title={online ? 'Online' : 'Offline'}
    />
  );
}

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'Admin') return 'default';
  if (role === 'PM') return 'secondary';
  return 'outline';
}

const ACTION_LABELS: Record<string, string> = {
  ACCOUNT_CREATED: 'Account Created',
  ACCOUNT_DELETED: 'Account Deleted',
  PASSWORD_RESET: 'Password Reset by Admin',
  PROFILE_UPDATED: 'Profile Updated',
  LOGIN: 'Signed In',
  LOGOUT: 'Signed Out',
  '2FA_ENABLED': '2FA Enabled',
  '2FA_DISABLED': '2FA Disabled',
};

function ActivityBadge({ action }: { action: string }) {
  const label = ACTION_LABELS[action] ?? action;
  let cls = 'bg-muted text-muted-foreground';
  if (action === 'ACCOUNT_CREATED') cls = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  if (action === 'ACCOUNT_DELETED') cls = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  if (action === 'PASSWORD_RESET') cls = 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
  if (action === 'LOGIN') cls = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function UsersPage() {
  const { currentUser } = useStore();
  const { profile: myProfile } = useAuthStore();
  const { regions, fetchRegions } = useRegionStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();

  const {
    users, isLoading,
    fetchUsers, updateUserRecord, createUser, deleteUser,
    resetUserPassword, sendPasswordResetEmail, fetchUserActivity,
    subscribeToPresence, fetchUserAssignments, updateUserAssignments,
  } = useUsersStore();

  const [search, setSearch] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', email: '', role: 'Engineer' as UserRole,
    region_ids: [] as string[], warehouse_ids: [] as string[],
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [pwdCopied, setPwdCopied] = useState(false);

  // User detail sheet
  const [sheetUser, setSheetUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', username: '', role: '', region_ids: [] as string[], warehouse_ids: [] as string[], status: 'active',
  });
  const [editSaving, setEditSaving] = useState(false);

  // Activity log
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserActivityLog | null>(null);

  // Password result (reset)
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [resetPwdCopied, setResetPwdCopied] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load on mount
  useEffect(() => {
    // Data is already fetched by fetchAppData() in useStore.ts during app initialization
    const unsubscribe = subscribeToPresence();
    return unsubscribe;
  }, []);

  // Sync edit form when sheet user changes
  useEffect(() => {
    if (sheetUser) {
      // Load user's assignments
      fetchUserAssignments(sheetUser.user_id).then(({ regions, warehouses }) => {
        setEditForm({
          name: sheetUser.name,
          username: sheetUser.username ?? '',
          role: sheetUser.role,
          region_ids: regions,
          warehouse_ids: warehouses,
          status: sheetUser.status,
        });
      });
      loadActivity(sheetUser.user_id);
    }
  }, [sheetUser, fetchUserAssignments]);

  async function loadActivity(userId: string) {
    setActivityLoading(true);
    try {
      const logs = await fetchUserActivity(userId);
      setActivityLogs(logs);
    } catch {
      setActivityLogs([]);
    } finally {
      setActivityLoading(false);
    }
  }

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">You do not have permission to view this page.</p>
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const onlineCount = users.filter((u) => isOnline(u.last_seen_at)).length;

  // ── Create handler ────────────────────────────────────────────────────────
  async function handleCreate() {
    console.log('[UsersPage] handleCreate called');
    if (!createForm.name.trim() || !createForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    console.log('[UsersPage] Validation passed, setting loading to true');
    setCreateLoading(true);
    try {
      console.log('[UsersPage] About to call createUser with data:', createForm);
      const generatedPwd = await createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
        region_ids: createForm.region_ids,  // Now an array
        warehouse_ids: createForm.warehouse_ids,  // Now an array
      });
      console.log('[UsersPage] createUser returned successfully');
      setCreatedPassword(generatedPwd);
      setCreateForm({ name: '', email: '', role: 'Engineer', region_ids: [], warehouse_ids: [] });
    } catch (err: any) {
      console.error('[UsersPage] Create failed:', err);
      toast.error(err?.message || 'Failed to create user');
      setCreateLoading(false);
    } finally {
      console.log('[UsersPage] handleCreate finally block, setting loading to false');
      setCreateLoading(false);
    }
  }

  function handleCopyCreatedPwd() {
    if (!createdPassword) return;
    navigator.clipboard.writeText(createdPassword).then(() => {
      setPwdCopied(true);
      setTimeout(() => setPwdCopied(false), 2000);
    });
  }

  // ── Edit handler ──────────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!sheetUser) return;
    if (!editForm.name.trim()) { toast.error('Name cannot be empty'); return; }
    setEditSaving(true);
    try {
      // Update profile
      await updateUserRecord(sheetUser.user_id, {
        name: editForm.name.trim(),
        username: editForm.username.trim() || null,
        role: editForm.role,
        status: editForm.status,
      });
      // Update assignments
      await updateUserAssignments(
        sheetUser.user_id,
        editForm.region_ids,
        editForm.warehouse_ids
      );
      
      await fetchUsers();

      toast.success(`${editForm.name.trim()} updated successfully`);
      setSheetUser(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user');
    } finally {
      setEditSaving(false);
    }
  }

  // ── Reset password ────────────────────────────────────────────────────────
  async function handleResetPassword() {
    if (!sheetUser) return;
    setResetLoading(true);
    try {
      const pwd = await resetUserPassword(sheetUser.user_id);
      setResetPassword(pwd);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSendResetEmail() {
    if (!sheetUser) return;
    try {
      await sendPasswordResetEmail(sheetUser.email);
      toast.success(`Reset link sent to ${sheetUser.email}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset email');
    }
  }

  // ── Delete handler ────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    console.log('=== DELETE DEBUG ===');
    console.log('deleteTarget:', deleteTarget);
    console.log('deleteTarget.user_id:', deleteTarget?.user_id);
    console.log('deleteTarget.id:', deleteTarget?.id);
    try {
      await deleteUser(deleteTarget.user_id);
      toast.success(`${deleteTarget.name} has been deleted`);
      setDeleteTarget(null);
      setDeleteInput('');
      if (sheetUser?.user_id === deleteTarget.user_id) setSheetUser(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">User Management</h1>
          <p className="text-muted-foreground">Manage system access, roles, and permissions</p>
        </div>
        <Button onClick={() => { setCreatedPassword(null); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, icon: Users },
          { label: 'Online Now', value: onlineCount, icon: Shield },
          { label: 'Admins', value: users.filter((u) => u.role === 'Admin').length, icon: ShieldCheck },
          { label: 'Active', value: users.filter((u) => u.status === 'active').length, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {search ? 'No users match your search.' : 'No users found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => {
                  const online = isOnline(user.last_seen_at);
                  return (
                    <TableRow
                      key={user.user_id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => setSheetUser(user)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <OnlineDot online={online} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.assigned_region_ids && user.assigned_region_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.assigned_region_ids.map(id => {
                              const region = regions.find(r => r.id === id);
                              return (
                                <Badge key={id} variant="outline" className="text-xs">
                                  {region?.name || 'Unknown'}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.assigned_warehouse_ids && user.assigned_warehouse_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.assigned_warehouse_ids.map(id => {
                              const warehouse = warehouses.find(w => w.id === id);
                              return (
                                <Badge key={id} variant="outline" className="text-xs">
                                  {warehouse?.name || 'Unknown'}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}
                          className={user.status === 'active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <OnlineDot online={online} />
                          <span className={online ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(user.last_login_at)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSheetUser(user)}>
                              <User className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              setSheetUser(user);
                              // will show reset in sheet
                            }}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              try {
                                await sendPasswordResetEmail(user.email);
                                toast.success(`Reset link sent to ${user.email}`);
                              } catch (e: any) { toast.error(e.message); }
                            }}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Reset Email
                            </DropdownMenuItem>
                            {user.user_id !== myProfile?.user_id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => { setDeleteTarget(user); setDeleteInput(''); }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Create User Dialog ── */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreatedPassword(null); } setCreateOpen(o); }}>
        <DialogContent className="max-w-md">
          {createdPassword ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  User Created
                </DialogTitle>
                <DialogDescription>
                  Share this temporary password with the user. They will be required to change it on first login.
                </DialogDescription>
              </DialogHeader>
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="ml-2 text-amber-800 text-xs">
                  This password will not be shown again. Copy it now.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded border font-mono text-lg tracking-wider">
                  {createdPassword}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyCreatedPwd}>
                  {pwdCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreateOpen(false); setCreatedPassword(null); }}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
                <DialogDescription>
                  A temporary password will be auto-generated. The user must change it on first login.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Jane Smith" />
                </div>
                <div className="space-y-2">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="jane@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v as UserRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="PM">Project Manager (PM)</SelectItem>
                      <SelectItem value="Engineer">Engineer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {createForm.role !== 'Admin' && (
                  <>
                    <div className="space-y-2">
                      <Label>Assigned Regions</Label>
                      <MultiSelect
                        options={regions.filter((r) => r.status === 'active').map(r => ({ id: r.id, name: r.name }))}
                        selected={createForm.region_ids}
                        onChange={(ids) => setCreateForm({ ...createForm, region_ids: ids })}
                        placeholder="Select regions..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Assigned Warehouses</Label>
                      <MultiSelect
                        options={warehouses
                          .filter((w) => w.status === 'active')
                          .filter((w) => createForm.region_ids.length === 0 || createForm.region_ids.includes(w.region_id))
                          .map(w => ({ id: w.id, name: w.name }))}
                        selected={createForm.warehouse_ids}
                        onChange={(ids) => setCreateForm({ ...createForm, warehouse_ids: ids })}
                        placeholder="Select warehouses..."
                      />
                      {createForm.region_ids.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Showing warehouses from selected regions
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createLoading}>
                  {createLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : 'Create User'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── User Details Sheet ── */}
      <Sheet open={!!sheetUser} onOpenChange={(o) => { if (!o) { setSheetUser(null); setResetPassword(null); setSelectedLog(null); } }}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
          {sheetUser && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary text-base">
                        {getInitials(sheetUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${isOnline(sheetUser.last_seen_at) ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-base truncate">{sheetUser.name}</SheetTitle>
                    <SheetDescription className="text-xs truncate">{sheetUser.email}</SheetDescription>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge variant={roleBadgeVariant(sheetUser.role)}>{sheetUser.role}</Badge>
                    <Badge variant={sheetUser.status === 'active' ? 'default' : 'secondary'}
                      className={sheetUser.status === 'active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                      {sheetUser.status}
                    </Badge>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-6 mt-4 w-auto justify-start">
                  <TabsTrigger value="details"><User className="mr-2 h-3.5 w-3.5" />Details</TabsTrigger>
                  <TabsTrigger value="activity"><History className="mr-2 h-3.5 w-3.5" />Activity</TabsTrigger>
                </TabsList>

                {/* ── Details Tab ── */}
                <TabsContent value="details" className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 mt-4">

                  {/* Reset password result */}
                  {resetPassword && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="ml-2 text-amber-800 text-xs space-y-2">
                        <p>New temporary password — share securely and store now:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-2 py-1 bg-white rounded border font-mono text-sm">
                            {resetPassword}
                          </code>
                          <Button variant="outline" size="icon" className="h-7 w-7 flex-shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(resetPassword!);
                              setResetPwdCopied(true);
                              setTimeout(() => setResetPwdCopied(false), 2000);
                            }}>
                            {resetPwdCopied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Profile fields */}
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Full Name</Label>
                        <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Username <span className="text-xs text-muted-foreground">(optional)</span></Label>
                        <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input value={sheetUser.email} disabled className="bg-muted/50" />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Role</Label>
                      <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="PM">Project Manager (PM)</SelectItem>
                          <SelectItem value="Engineer">Engineer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editForm.role !== 'Admin' && (
                      <>
                        <div className="space-y-2">
                          <Label>Assigned Regions</Label>
                          <MultiSelect
                            options={regions.filter((r) => r.status === 'active').map(r => ({ id: r.id, name: r.name }))}
                            selected={editForm.region_ids}
                            onChange={(ids) => setEditForm({ ...editForm, region_ids: ids })}
                            placeholder="Select regions..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Assigned Warehouses</Label>
                          <MultiSelect
                            options={warehouses
                              .filter((w) => w.status === 'active')
                              .filter((w) => editForm.region_ids.length === 0 || editForm.region_ids.includes(w.region_id))
                              .map(w => ({ id: w.id, name: w.name }))}
                            selected={editForm.warehouse_ids}
                            onChange={(ids) => setEditForm({ ...editForm, warehouse_ids: ids })}
                            placeholder="Select warehouses..."
                          />
                          {editForm.region_ids.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Showing warehouses from selected regions
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Account Active</p>
                        <p className="text-xs text-muted-foreground">Inactive users cannot sign in</p>
                      </div>
                      <Switch
                        checked={editForm.status === 'active'}
                        onCheckedChange={(c) => setEditForm({ ...editForm, status: c ? 'active' : 'inactive' })}
                        disabled={sheetUser.user_id === myProfile?.user_id}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Info row */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">Created</p>
                      <p>{formatDate(sheetUser.created_at)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Last Login</p>
                      <p>{formatDate(sheetUser.last_login_at) || '—'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Last Seen</p>
                      <p>{isOnline(sheetUser.last_seen_at) ? '🟢 Online now' : formatDate(sheetUser.last_seen_at) || '—'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Force Pwd Change</p>
                      <p>{sheetUser.force_password_change ? 'Yes (pending)' : 'No'}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Password actions */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Password Actions</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm" variant="outline"
                        onClick={handleResetPassword}
                        disabled={resetLoading}
                      >
                        {resetLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                        Reset Password
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={handleSendResetEmail}
                      >
                        <Mail className="mr-2 h-3.5 w-3.5" />
                        Send Reset Email
                      </Button>
                    </div>
                  </div>

                  {/* Save + Delete */}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveEdit} disabled={editSaving} className="flex-1">
                      {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
                    </Button>
                    {sheetUser.user_id !== myProfile?.user_id && (
                      <Button
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => { setDeleteTarget(sheetUser); setDeleteInput(''); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {/* ── Activity Tab ── */}
                <TabsContent value="activity" className="flex-1 overflow-hidden flex flex-col mt-4">
                  <ScrollArea className="flex-1 px-6 pb-6">
                    {activityLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : activityLogs.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground text-sm">
                        <Clock className="h-8 w-8 mx-auto mb-3 opacity-30" />
                        No activity recorded yet.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead className="w-8" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activityLogs.map((log) => (
                            <TableRow
                              key={log.id}
                              className="cursor-pointer hover:bg-muted/30"
                              onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                            >
                              <TableCell>
                                <ActivityBadge action={log.action} />
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <span className="text-xs text-primary">›</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    {/* Log detail expand */}
                    {selectedLog?.details && Object.keys(selectedLog.details).length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-xs font-mono space-y-1">
                        {Object.entries(selectedLog.details).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-muted-foreground min-w-[100px]">{k}:</span>
                            <span>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteInput(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{deleteTarget?.name}</strong> and all associated data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs text-muted-foreground">
              Type <strong>DELETE</strong> to confirm
            </Label>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="border-destructive/40 focus-visible:ring-destructive/40"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteInput(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInput !== 'DELETE' || deleteLoading}
            >
              {deleteLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
