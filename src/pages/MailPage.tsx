/**
 * Mail — Administration → Mail
 * Email client UI showing sent emails (email_logs) and in-app notifications.
 * Layout: left folders sidebar | center message list | right detail pane
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationsStore, type AppNotification, type EmailLog } from '../store/useNotificationsStore';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { Separator } from '../components/ui/Separator';
import {
  Inbox, Send, Archive, Trash2, Clock, Search, RefreshCw,
  Mail, MailCheck, MailX, MailOpen, AlertCircle, CheckCircle,
  AlertTriangle, Info, Star, Bell, ChevronRight,
  User, Globe, Building2, CircleDot,
} from 'lucide-react';
import { formatDateTime } from '../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type FolderKey = 'inbox' | 'sent' | 'failed' | 'pending' | 'notifications';

interface MailItem {
  id: string;
  kind: 'email' | 'notification';
  from: string;
  to: string;
  subject: string;
  preview: string;
  body?: string;
  status?: string;
  type?: string;
  category?: string;
  isRead: boolean;
  tags: string[];
  date: string;
  // raw refs
  emailLog?: EmailLog;
  notification?: AppNotification;
}

// ── Folder config ─────────────────────────────────────────────────────────────

const FOLDERS: { key: FolderKey; label: string; icon: React.ElementType }[] = [
  { key: 'inbox',          label: 'Inbox',         icon: Inbox     },
  { key: 'notifications',  label: 'Notifications', icon: Bell      },
  { key: 'sent',           label: 'Sent',          icon: Send      },
  { key: 'pending',        label: 'Pending',       icon: Clock     },
  { key: 'failed',         label: 'Failed',        icon: MailX     },
];

const TYPE_ICON: Record<string, React.ElementType> = {
  info:    Info,
  warning: AlertTriangle,
  alert:   AlertCircle,
  success: CheckCircle,
};

const TYPE_COLOR: Record<string, string> = {
  info:    'text-blue-500',
  warning: 'text-amber-500',
  alert:   'text-red-500',
  success: 'text-emerald-500',
};

const STATUS_CONFIG = {
  sent:    { label: 'Sent',    class: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: MailCheck   },
  failed:  { label: 'Failed',  class: 'bg-red-100    text-red-700    border-red-200',       icon: MailX       },
  pending: { label: 'Pending', class: 'bg-gray-100   text-gray-600   border-gray-200',      icon: Clock       },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildItemsFromNotifications(notifs: AppNotification[]): MailItem[] {
  return notifs.map((n) => ({
    id:           `n-${n.id}`,
    kind:         'notification' as const,
    from:         n.sender_name ?? 'System',
    to:           'You',
    subject:      n.title,
    preview:      n.message,
    body:         n.message,
    type:         n.type,
    category:     n.category,
    isRead:       n.is_read,
    tags:         [n.category, n.type].filter(Boolean),
    date:         n.created_at,
    notification: n,
  }));
}

function buildItemsFromEmailLogs(logs: EmailLog[]): MailItem[] {
  return logs.map((l) => ({
    id:       `e-${l.id}`,
    kind:     'email' as const,
    from:     'System <noreply@ims>',
    to:       l.to_email,
    subject:  l.subject,
    preview:  l.html_body ? stripHtml(l.html_body).slice(0, 120) : '(no body)',
    body:     l.html_body ?? undefined,
    status:   l.status,
    isRead:   l.status === 'sent',
    tags:     [l.status, l.provider].filter(Boolean),
    date:     l.created_at,
    emailLog: l,
  }));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7)   return `${days} day${days !== 1 ? 's' : ''} ago`;
  return formatDateTime(dateStr);
}

// ── Message Row ───────────────────────────────────────────────────────────────

function MessageRow({
  item, selected, onClick,
}: {
  item: MailItem; selected: boolean; onClick: () => void;
}) {
  const TypeIcon = item.type ? (TYPE_ICON[item.type] ?? Mail) : Mail;
  const typeColor = item.type ? (TYPE_COLOR[item.type] ?? 'text-muted-foreground') : 'text-muted-foreground';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50 ${
        selected ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
      }`}
    >
      {/* Row header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <TypeIcon className={`h-3.5 w-3.5 flex-shrink-0 ${typeColor}`} />
          <span className={`text-sm truncate ${!item.isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
            {item.from}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!item.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(item.date)}</span>
        </div>
      </div>

      {/* Subject */}
      <p className={`text-xs truncate mb-1 ${!item.isRead ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
        {item.subject}
      </p>

      {/* Preview */}
      <p className="text-[11px] text-muted-foreground truncate leading-relaxed">
        {item.preview}
      </p>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {item.tags.slice(0, 3).map((tag) => {
            const sc = STATUS_CONFIG[tag as keyof typeof STATUS_CONFIG];
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                  sc ? sc.class : 'bg-muted text-muted-foreground border-transparent'
                }`}
              >
                {sc && <sc.icon className="h-2.5 w-2.5" />}
                {tag}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}

// ── Detail Pane ───────────────────────────────────────────────────────────────

function DetailPane({ item, onMarkRead }: { item: MailItem; onMarkRead: (id: string) => void }) {
  const sc  = item.status ? STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] : null;
  const TypeIcon = item.type ? (TYPE_ICON[item.type] ?? Mail) : Mail;

  useEffect(() => {
    if (!item.isRead && item.kind === 'notification') {
      onMarkRead(item.id);
    }
  }, [item.id]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold leading-tight">{item.subject}</h2>
          {sc && (
            <Badge variant="outline" className={`text-xs flex-shrink-0 gap-1 ${sc.class}`}>
              <sc.icon className="h-3 w-3" />
              {sc.label}
            </Badge>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <strong className="text-foreground">From:</strong> {item.from}
          </span>
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            <strong className="text-foreground">To:</strong> {item.to}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(item.date)}
          </span>
        </div>

        {/* Type + Category badges */}
        <div className="flex gap-2 flex-wrap">
          {item.type && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${TYPE_COLOR[item.type] ?? ''}`}>
              <TypeIcon className="h-3.5 w-3.5" />
              {item.type}
            </span>
          )}
          {item.category && (
            <Badge variant="outline" className="text-xs capitalize">{item.category}</Badge>
          )}
          {item.emailLog?.provider && (
            <Badge variant="outline" className="text-xs capitalize">via {item.emailLog.provider}</Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {item.kind === 'email' && item.body ? (
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: item.body }}
          />
        ) : (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.preview}</p>
        )}

        {/* Email technical details */}
        {item.emailLog && (
          <div className="mt-6 rounded-lg border bg-muted/30 p-4 space-y-1.5 text-xs">
            <p className="font-semibold text-foreground mb-2">Delivery Details</p>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium capitalize">{item.emailLog.provider}</span>
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{item.emailLog.status}</span>
              {item.emailLog.provider_id && (
                <>
                  <span className="text-muted-foreground">Provider ID</span>
                  <span className="font-mono text-[10px] truncate">{item.emailLog.provider_id}</span>
                </>
              )}
              {item.emailLog.sent_at && (
                <>
                  <span className="text-muted-foreground">Sent at</span>
                  <span>{formatDateTime(item.emailLog.sent_at)}</span>
                </>
              )}
              {item.emailLog.error_message && (
                <>
                  <span className="text-muted-foreground">Error</span>
                  <span className="text-red-600">{item.emailLog.error_message}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function MailPage() {
  const { profile } = useAuthStore();
  const {
    notifications, emailLogs, isLoading, isEmailLoading,
    fetchAllNotifications, fetchEmailLogs, markRead,
  } = useNotificationsStore();

  const [folder, setFolder]     = useState<FolderKey>('inbox');
  const [selected, setSelected] = useState<MailItem | null>(null);
  const [search, setSearch]     = useState('');

  const loading = isLoading || isEmailLoading;

  const load = useCallback(() => {
    fetchAllNotifications();
    fetchEmailLogs();
  }, [fetchAllNotifications, fetchEmailLogs]);

  useEffect(() => { load(); }, [load]);

  // Build folder items
  const allNotifItems = buildItemsFromNotifications(notifications);
  const allEmailItems = buildItemsFromEmailLogs(emailLogs);

  const folderItems: MailItem[] = (() => {
    switch (folder) {
      case 'inbox':
        return allNotifItems.filter((i) => !i.isRead);
      case 'notifications':
        return allNotifItems;
      case 'sent':
        return allEmailItems.filter((i) => i.status === 'sent');
      case 'pending':
        return allEmailItems.filter((i) => i.status === 'pending');
      case 'failed':
        return allEmailItems.filter((i) => i.status === 'failed');
      default:
        return [];
    }
  })();

  // Apply search
  const filtered = search.trim()
    ? folderItems.filter((i) =>
        [i.from, i.to, i.subject, i.preview].some((f) =>
          f.toLowerCase().includes(search.toLowerCase())
        )
      )
    : folderItems;

  // Folder unread counts
  const counts: Record<FolderKey, number> = {
    inbox:         allNotifItems.filter((i) => !i.isRead).length,
    notifications: allNotifItems.filter((i) => !i.isRead).length,
    sent:          allEmailItems.filter((i) => i.status === 'sent').length,
    pending:       allEmailItems.filter((i) => i.status === 'pending').length,
    failed:        allEmailItems.filter((i) => i.status === 'failed').length,
  };

  const handleMarkRead = (mailId: string) => {
    if (mailId.startsWith('n-')) {
      const notifId = mailId.replace('n-', '');
      markRead(notifId);
      setSelected((prev) => prev?.id === mailId ? { ...prev, isRead: true } : prev);
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── LEFT: Folder sidebar ── */}
      <aside className="w-52 flex-shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{profile?.name?.split(' ')[0] ?? 'Admin'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[110px]">{profile?.email ?? ''}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {FOLDERS.map(({ key, label, icon: Icon }) => {
            const cnt = counts[key];
            const isActive = folder === key;
            return (
              <button
                key={key}
                onClick={() => { setFolder(key); setSelected(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 mx-1 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-foreground hover:bg-muted'
                }`}
                style={{ width: 'calc(100% - 8px)' }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {label}
                </div>
                {cnt > 0 && (
                  <span className={`text-[10px] font-bold tabular-nums rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {cnt > 99 ? '99+' : cnt}
                  </span>
                )}
              </button>
            );
          })}

          <Separator className="my-2 mx-3" />

          {/* Summary labels */}
          <div className="px-3 py-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
            {[
              { label: 'Total Notifications', value: allNotifItems.length,                       color: 'text-blue-600'    },
              { label: 'Emails Sent',         value: allEmailItems.filter((i) => i.status === 'sent').length,    color: 'text-emerald-600' },
              { label: 'Emails Failed',       value: allEmailItems.filter((i) => i.status === 'failed').length, color: 'text-red-600'     },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-1 text-[11px]">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-bold tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t">
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </aside>

      {/* ── CENTER: Message list ── */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col">
        {/* Search + header */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold capitalize">
              {FOLDERS.find((f) => f.key === folder)?.label}
            </h2>
            <span className="text-[10px] text-muted-foreground">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1 px-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-52" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
              <MailOpen className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm font-medium text-foreground">
                {search ? 'No results' : 'Empty folder'}
              </p>
              <p className="text-xs mt-1">
                {search ? 'Try a different search term' : 'Nothing here yet'}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <MessageRow
                key={item.id}
                item={item}
                selected={selected?.id === item.id}
                onClick={() => setSelected(item)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Detail pane ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {selected ? (
          <DetailPane item={selected} onMarkRead={handleMarkRead} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Mail className="h-10 w-10 opacity-30" />
            </div>
            <p className="text-base font-semibold text-foreground">No message selected</p>
            <p className="text-sm mt-1">Select an item from the list to read it</p>
          </div>
        )}
      </main>
    </div>
  );
}
