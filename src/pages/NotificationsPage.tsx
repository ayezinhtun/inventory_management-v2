import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import {
  useNotificationsStore,
  type AppNotification,
  type SendNotificationParams,
} from '../store/useNotificationsStore';
import { useRegionStore } from '../store/useRegionStore';
import { useUsersStore } from '../store/useUsersStore';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '../components/ui/Tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/Table';
import {
  Bell, BellOff, CheckCircle2, Send, Inbox, Mail, MailCheck,
  MailX, RefreshCw, Users, Globe, Radio, FileText,
  AlertTriangle, Info, CheckCircle, AlertCircle, Clock,
  Settings2, ChevronRight, Eye,
} from 'lucide-react';
import { formatDateTime } from '../lib/utils';

// ── Type helpers ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  info:    { icon: Info,         class: 'bg-blue-100 text-blue-700 border-blue-200',    dot: 'bg-blue-500'    },
  warning: { icon: AlertTriangle,class: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500'   },
  alert:   { icon: AlertCircle,  class: 'bg-red-100 text-red-700 border-red-200',       dot: 'bg-red-500'     },
  success: { icon: CheckCircle,  class: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
} as const;

const EMAIL_STATUS_CONFIG = {
  pending: { class: 'bg-gray-100 text-gray-600 border-gray-200',       icon: Clock       },
  sent:    { class: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: MailCheck  },
  failed:  { class: 'bg-red-100 text-red-700 border-red-200',           icon: MailX       },
} as const;

// ── Notification Card ─────────────────────────────────────────────────────────

function NotificationCard({
  notif, onRead,
}: {
  notif: AppNotification;
  onRead: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all cursor-pointer group ${
        notif.is_read
          ? 'bg-card border-border'
          : 'bg-primary/5 border-primary/20 hover:border-primary/40'
      }`}
      onClick={() => !notif.is_read && onRead(notif.id)}
    >
      {/* Unread dot */}
      {!notif.is_read && (
        <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.class}`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold leading-tight ${notif.is_read ? 'text-foreground' : 'text-foreground'}`}>
              {notif.title}
            </p>
            <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${cfg.class}`}>
              {notif.type}
            </Badge>
          </div>
          <p className={`text-xs mt-1 leading-relaxed ${notif.is_read ? 'text-muted-foreground' : 'text-foreground/80'}`}>
            {notif.message}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDateTime(notif.created_at)}
            </span>
            {notif.sender_name && (
              <span className="text-[10px] text-muted-foreground">
                From <span className="font-medium">{notif.sender_name}</span>
              </span>
            )}
            <Badge variant="outline" className="text-[10px] ml-auto capitalize">
              {notif.category}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compose Form ──────────────────────────────────────────────────────────────

interface ComposeState {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  category: string;
  targetType: 'broadcast' | 'region' | 'role' | 'users';
  regionId: string;
  role: string;
  sendEmail: boolean;
  emailSubject: string;
}

function ComposePanel({ onSent }: { onSent: () => void }) {
  const { regions } = useRegionStore();
  const { sendNotification } = useNotificationsStore();
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState<ComposeState>({
    title: '', message: '', type: 'info', category: 'system',
    targetType: 'broadcast', regionId: '', role: '',
    sendEmail: false, emailSubject: '',
  });

  const update = <K extends keyof ComposeState>(k: K, v: ComposeState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      setErrorMsg('Title and message are required.');
      return;
    }
    setIsSending(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const params: SendNotificationParams = {
        title:    form.title,
        message:  form.message,
        type:     form.type,
        category: form.category as any,
      };

      if (form.targetType === 'broadcast') params.broadcast = true;
      else if (form.targetType === 'region' && form.regionId) params.region_id = form.regionId;
      else if (form.targetType === 'role' && form.role) params.role = form.role;

      if (form.sendEmail && form.emailSubject) {
        params.send_email    = true;
        params.email_subject = form.emailSubject;
        params.email_html    = `<h2>${form.title}</h2><p>${form.message}</p>`;
      }

      await sendNotification(params);
      setSuccessMsg('Notification sent successfully!');
      setForm((f) => ({ ...f, title: '', message: '', emailSubject: '' }));
      onSent();
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {successMsg && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Notification Type</label>
          <Select value={form.type} onValueChange={(v) => update('type', v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">ℹ️ Info</SelectItem>
              <SelectItem value="success">✅ Success</SelectItem>
              <SelectItem value="warning">⚠️ Warning</SelectItem>
              <SelectItem value="alert">🚨 Alert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <Select value={form.category} onValueChange={(v) => update('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
              <SelectItem value="component">Component</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Target */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Send To</label>
        <div className="flex flex-wrap gap-2">
          {([
            { v: 'broadcast', label: 'All Users',     icon: Radio     },
            { v: 'region',    label: 'By Region',     icon: Globe     },
            { v: 'role',      label: 'By Role',       icon: Users     },
          ] as const).map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => update('targetType', v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                form.targetType === v
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted text-muted-foreground border-transparent hover:border-border'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Region picker */}
        {form.targetType === 'region' && (
          <Select value={form.regionId} onValueChange={(v) => update('regionId', v)}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Select region…" /></SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Role picker */}
        {form.targetType === 'role' && (
          <Select value={form.role} onValueChange={(v) => update('role', v)}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Select role…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Engineer">Engineer</SelectItem>
              <SelectItem value="PM">Project Manager</SelectItem>
              <SelectItem value="User">User</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Title <span className="text-red-500">*</span></label>
        <Input
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Notification title…"
        />
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Message <span className="text-red-500">*</span></label>
        <Textarea
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          placeholder="Write your notification message…"
          className="min-h-[100px] resize-y"
        />
      </div>

      {/* Email toggle */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Also send as email</span>
          </div>
          <button
            onClick={() => update('sendEmail', !form.sendEmail)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              form.sendEmail ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              form.sendEmail ? 'left-4' : 'left-0.5'
            }`} />
          </button>
        </div>
        {form.sendEmail && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email Subject</label>
            <Input
              value={form.emailSubject}
              onChange={(e) => update('emailSubject', e.target.value)}
              placeholder="Email subject line…"
            />
            <p className="text-[10px] text-muted-foreground">
              Requires RESEND_API_KEY to be configured in your Supabase Edge Function secrets.
            </p>
          </div>
        )}
      </div>

      <Button onClick={handleSend} disabled={isSending} className="w-full sm:w-auto">
        {isSending ? (
          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Sending…</>
        ) : (
          <><Send className="h-4 w-4 mr-2" />Send Notification</>
        )}
      </Button>
    </div>
  );
}

// ── Email Logs Panel ──────────────────────────────────────────────────────────

function EmailLogsPanel() {
  const { emailLogs, isEmailLoading, fetchEmailLogs } = useNotificationsStore();

  useEffect(() => { fetchEmailLogs(); }, [fetchEmailLogs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{emailLogs.length} email records</p>
        <Button variant="outline" size="sm" onClick={fetchEmailLogs} disabled={isEmailLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isEmailLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isEmailLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : emailLogs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No emails sent yet</p>
              <p className="text-xs mt-1">Email logs will appear here after notifications are sent.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 text-xs">Recipient</TableHead>
                  <TableHead className="text-xs">Subject</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Provider</TableHead>
                  <TableHead className="text-right pr-6 text-xs">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log) => {
                  const cfg = EMAIL_STATUS_CONFIG[log.status] ?? EMAIL_STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="pl-6 py-2.5 text-sm font-medium">
                        {log.to_email}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.subject}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={`text-xs gap-1 ${cfg.class}`}>
                          <StatusIcon className="h-3 w-3" />
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground capitalize">
                        {log.provider}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {log.sent_at ? formatDateTime(log.sent_at) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Error details for failed emails */}
      {emailLogs.some((l) => l.status === 'failed') && (
        <Card className="border-red-200 bg-red-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-700">Failed Emails</CardTitle>
            <CardDescription className="text-xs">Delivery errors for investigation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {emailLogs.filter((l) => l.status === 'failed').map((log) => (
              <div key={log.id} className="text-xs rounded border border-red-200 bg-white p-2">
                <span className="font-medium">{log.to_email}</span>
                {' — '}
                <span className="text-red-600">{log.error_message ?? 'Unknown error'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { profile } = useAuthStore();
  const { regions, fetchRegions } = useRegionStore();
  const {
    notifications, unreadCount, isLoading,
    fetchNotifications, fetchAllNotifications,
    markRead, markAllRead, subscribeToRealtime,
  } = useNotificationsStore();

  const isAdmin = profile?.role === 'Admin';
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [adminTab, setAdminTab] = useState('inbox');

  const load = useCallback(() => {
    if (isAdmin) {
      fetchAllNotifications();
    } else {
      fetchNotifications();
    }
  }, [isAdmin, fetchAllNotifications, fetchNotifications]);

  useEffect(() => {
    load();
    if (regions.length === 0) fetchRegions();
    const unsub = subscribeToRealtime();
    return unsub;
  }, [load, fetchRegions, regions.length, subscribeToRealtime]);

  const filtered = notifications.filter((n) => filter === 'all' || !n.is_read);

  // ── Regular user view ──────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-[900px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {unreadCount > 0
                ? <><span className="text-primary font-semibold">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}</>
                : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Mark all read
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg border bg-muted p-0.5 w-fit text-xs">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${
                filter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              {f === 'unread' ? `Unread (${unreadCount})` : `All (${notifications.length})`}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BellOff className="h-14 w-14 mb-4 opacity-15" />
            <p className="text-lg font-semibold text-foreground">
              {filter === 'unread' ? 'No unread notifications' : 'All caught up!'}
            </p>
            <p className="text-sm mt-1">
              {filter === 'unread' ? 'Switch to "All" to see your history.' : 'You have no notifications at this time.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <NotificationCard key={n.id} notif={n} onRead={markRead} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Admin view ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Notification Center</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage and send notifications to users across all regions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Total',   value: notifications.length,                          icon: Bell,          class: '' },
          { label: 'Unread',  value: notifications.filter((n) => !n.is_read).length, icon: Bell,         class: 'text-primary' },
          { label: 'Alerts',  value: notifications.filter((n) => n.type === 'alert' || n.type === 'warning').length, icon: AlertTriangle, class: 'text-amber-600' },
          { label: 'Today',   value: notifications.filter((n) => isToday(n.created_at)).length, icon: Clock, class: '' },
        ].map(({ label, value, icon: Icon, class: cls }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 flex-shrink-0 ${cls || 'text-muted-foreground'}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold leading-none">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={adminTab} onValueChange={setAdminTab}>
        <TabsList variant="line" className="w-full justify-start border-b rounded-none h-auto pb-0">
          <TabsTrigger value="inbox"   className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2">
            <Inbox className="h-3.5 w-3.5 mr-1.5" /> Inbox
            {notifications.filter((n) => !n.is_read).length > 0 && (
              <span className="ml-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {Math.min(notifications.filter((n) => !n.is_read).length, 9)}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="compose" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2">
            <Send className="h-3.5 w-3.5 mr-1.5" /> Compose
          </TabsTrigger>
          <TabsTrigger value="email-logs" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2">
            <Mail className="h-3.5 w-3.5 mr-1.5" /> Email Logs
          </TabsTrigger>
        </TabsList>

        {/* ── Inbox ── */}
        <TabsContent value="inbox" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 rounded-lg border bg-muted p-0.5 text-xs">
                {(['all', 'unread'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${
                      filter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {f === 'unread' ? `Unread (${notifications.filter((n) => !n.is_read).length})` : `All (${notifications.length})`}
                  </button>
                ))}
              </div>
              {notifications.some((n) => !n.is_read) && (
                <Button variant="outline" size="sm" onClick={markAllRead}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Mark all read
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <BellOff className="h-14 w-14 mb-4 opacity-15" />
                <p className="text-lg font-semibold text-foreground">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications found'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((n) => (
                  <NotificationCard key={n.id} notif={n} onRead={markRead} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Compose ── */}
        <TabsContent value="compose" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send Notification</CardTitle>
              <CardDescription>
                Send in-app notifications and optional emails to users based on region, role, or broadcast to everyone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComposePanel onSent={() => { load(); setAdminTab('inbox'); }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email Logs ── */}
        <TabsContent value="email-logs" className="mt-4">
          <EmailLogsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── helper ────────────────────────────────────────────────────────────────────
function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear()
    && d.getMonth() === n.getMonth()
    && d.getDate() === n.getDate();
}
