/**
 * Administration → Mail
 * Modern email client matching reference design.
 * Folders: Inbox | Sent | Compose | Pending | Failed | Mail Logs
 */
import React, {
  useEffect, useState, useCallback, useRef, useMemo,
} from 'react';
import { useAuthStore } from '../store/useAuthStore';
import {
  useMailStore,
  type EmailMessage,
  type MailLog,
  type MailRecipient,
  type ComposeParams,
} from '../store/useMailStore';
import { supabase } from '../lib/supabase';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/Table';
import {
  Inbox, Send, PenSquare, Clock, MailX, BarChart2,
  RefreshCw, Search, Trash2, Reply, Forward,
  RotateCcw, X, Bold, Italic, Underline,
  List, ListOrdered, Mail, AlertCircle,
  CheckCircle2, MailCheck, MailOpen,
  ChevronDown, Archive, Star,
} from 'lucide-react';
import { formatDateTime } from '../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type Folder = 'inbox' | 'sent' | 'compose' | 'pending' | 'failed' | 'logs';

interface FolderDef {
  key:       Folder;
  label:     string;
  icon:      React.ElementType;
  adminOnly?: boolean;
}

const FOLDERS: FolderDef[] = [
  { key: 'inbox',   label: 'Inbox',     icon: Inbox     },
  { key: 'sent',    label: 'Sent',      icon: Send      },
  { key: 'pending', label: 'Pending',   icon: Clock     },
  { key: 'failed',  label: 'Failed',    icon: MailX     },
  { key: 'logs',    label: 'Mail Logs', icon: BarChart2, adminOnly: true },
];

const STATUS_CFG: Record<string, { cls: string; label: string }> = {
  sent:      { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  label: 'Sent'      },
  failed:    { cls: 'bg-red-50 text-red-600 border-red-200',              label: 'Failed'    },
  pending:   { cls: 'bg-amber-50 text-amber-700 border-amber-200',        label: 'Pending'   },
  sending:   { cls: 'bg-blue-50 text-blue-700 border-blue-200',           label: 'Sending'   },
  scheduled: { cls: 'bg-violet-50 text-violet-700 border-violet-200',     label: 'Scheduled' },
  draft:     { cls: 'bg-gray-100 text-gray-600 border-gray-200',          label: 'Draft'     },
};

const ACTION_COLOR: Record<string, string> = {
  sent:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed:      'bg-red-50 text-red-600 border-red-200',
  retried:     'bg-amber-50 text-amber-700 border-amber-200',
  read:        'bg-blue-50 text-blue-700 border-blue-200',
  deleted:     'bg-gray-100 text-gray-600 border-gray-200',
  draft_saved: 'bg-violet-50 text-violet-700 border-violet-200',
  received:    'bg-sky-50 text-sky-700 border-sky-200',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function timeAgo(d: string) {
  const diff  = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7)   return `${days}d`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initials(name: string) {
  return name
    .split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

// Deterministic avatar colour based on name
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',   'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',   'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700', 'bg-orange-100 text-orange-700',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <Badge variant="outline" className={`text-[10px] font-medium px-1.5 py-0 leading-5 ${cfg.cls}`}>
      {cfg.label}
    </Badge>
  );
}

// ── Message Row (Gmail-style) ─────────────────────────────────────────────────

function MessageRow({
  name, subject, preview, date, status, unread, selected, onClick,
}: {
  name: string; subject: string; preview: string;
  date: string; status?: string; unread?: boolean;
  selected: boolean; onClick: () => void;
}) {
  const color = avatarColor(name || '?');
  const ini   = initials(name || '?');

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/40 transition-colors ${
        selected ? 'bg-muted' : 'hover:bg-muted/50'
      }`}
    >
      {/* Avatar */}
      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${color}`}>
        {ini}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: name + date */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            {unread && (
              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            )}
            <span className={`text-sm truncate leading-snug ${unread ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
              {name || '(unknown)'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {status && <StatusBadge status={status} />}
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {timeAgo(date)}
            </span>
          </div>
        </div>

        {/* Row 2: subject */}
        <p className={`text-sm truncate leading-snug ${unread ? 'font-semibold text-foreground' : 'text-foreground/70'}`}>
          {subject || '(no subject)'}
        </p>

        {/* Row 3: preview */}
        <p className="text-xs text-muted-foreground truncate mt-0.5 leading-relaxed">
          {preview || '—'}
        </p>
      </div>
    </button>
  );
}

// ── Recipient Chip Input ──────────────────────────────────────────────────────

interface RecipientChipInputProps {
  label: string;
  recipients: MailRecipient[];
  type: 'to' | 'cc' | 'bcc';
  onChange: (r: MailRecipient[]) => void;
}

function RecipientChipInput({ label, recipients, type, onChange }: RecipientChipInputProps) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open,    setOpen]    = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('user_id, name, email')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(8);
      setResults(data ?? []);
      setOpen(true);
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const add = (r: { user_id?: string; name: string; email: string }) => {
    if (recipients.some((x) => x.email === r.email)) return;
    onChange([...recipients, { user_id: r.user_id, email: r.email, name: r.name, type }]);
    setQuery(''); setOpen(false);
    inputRef.current?.focus();
  };

  const addRaw = () => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)) add({ name: query, email: query });
  };

  const remove = (email: string) => onChange(recipients.filter((r) => r.email !== email));

  return (
    <div ref={ref} className="relative flex items-start border-b border-border/50 min-h-[40px]">
      <span className="flex-shrink-0 w-16 text-xs font-medium text-muted-foreground self-center pl-4">
        {label}
      </span>
      <div className="flex-1 flex flex-wrap items-center gap-1.5 py-2 pr-3">
        {recipients.map((r) => (
          <span key={r.email} className="inline-flex items-center gap-1 rounded-md bg-muted text-foreground text-xs px-2 py-0.5 border border-border/60">
            {r.name !== r.email ? r.name : r.email}
            <button type="button" onClick={() => remove(r.email)} className="text-muted-foreground hover:text-foreground">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 py-0.5"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addRaw(); }
            if (e.key === 'Backspace' && !query && recipients.length)
              remove(recipients[recipients.length - 1].email);
          }}
          placeholder={recipients.length === 0 ? 'Add recipients…' : ''}
        />
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute left-16 top-full mt-1 w-72 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map((r) => {
            const col = avatarColor(r.name || r.email);
            return (
              <button
                key={r.user_id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(r); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${col}`}>
                  {initials(r.name || r.email)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Rich Toolbar ──────────────────────────────────────────────────────────────

function RichToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement> }) {
  const exec = (cmd: string) => { editorRef.current?.focus(); document.execCommand(cmd, false); };
  const Btn = ({ icon: Icon, cmd, title }: { icon: React.ElementType; cmd: string; title: string }) => (
    <button
      type="button" title={title}
      onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
      className="h-7 w-7 rounded flex items-center justify-center hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border/50 bg-muted/10">
      <Btn icon={Bold}        cmd="bold"               title="Bold"         />
      <Btn icon={Italic}      cmd="italic"             title="Italic"       />
      <Btn icon={Underline}   cmd="underline"          title="Underline"    />
      <div className="w-px h-4 bg-border/60 mx-1.5" />
      <Btn icon={List}        cmd="insertUnorderedList" title="Bullet list" />
      <Btn icon={ListOrdered} cmd="insertOrderedList"   title="Numbered list" />
    </div>
  );
}

// ── Compose Panel ─────────────────────────────────────────────────────────────

function ComposePanel({ onSent, onCancel }: { onSent: () => void; onCancel: () => void }) {
  const { sendMail, saveDraft, isSending } = useMailStore();
  const editorRef = useRef<HTMLDivElement>(null);

  const [to,      setTo]      = useState<MailRecipient[]>([]);
  const [cc,      setCc]      = useState<MailRecipient[]>([]);
  const [bcc,     setBcc]     = useState<MailRecipient[]>([]);
  const [subject, setSubject] = useState('');
  const [showCc,  setShowCc]  = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const getHtml = () => editorRef.current?.innerHTML ?? '';
  const getText = () => editorRef.current?.innerText  ?? '';

  const params = (): ComposeParams => ({
    to, cc: showCc ? cc : [], bcc: showBcc ? bcc : [],
    subject, body_html: getHtml(), body_text: getText(),
  });

  const validate = () => {
    if (!to.length)     return 'Add at least one recipient.';
    if (!subject.trim()) return 'Subject is required.';
    if (!getText().trim()) return 'Message cannot be empty.';
    return '';
  };

  const handleSend = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    try {
      await sendMail(params());
      setSuccess('Message sent!');
      setTimeout(() => { setSuccess(''); onSent(); }, 1200);
    } catch (e: any) { setError(e?.message ?? 'Send failed'); }
  };

  const handleDraft = async () => {
    try {
      await saveDraft(params());
      setSuccess('Draft saved.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e: any) { setError(e?.message ?? 'Failed to save draft'); }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold">New Message</h2>
        </div>
        <div className="flex items-center gap-2">
          {!showCc  && <button onClick={() => setShowCc(true)}  className="text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded px-2 py-0.5 hover:bg-muted transition-colors">+ Cc</button>}
          {!showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded px-2 py-0.5 hover:bg-muted transition-colors">+ Bcc</button>}
          <button onClick={onCancel} className="h-7 w-7 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-shrink-0">
        <RecipientChipInput label="To"  recipients={to}  type="to"  onChange={setTo}  />
        {showCc  && <RecipientChipInput label="Cc"  recipients={cc}  type="cc"  onChange={setCc}  />}
        {showBcc && <RecipientChipInput label="Bcc" recipients={bcc} type="bcc" onChange={setBcc} />}

        {/* Subject */}
        <div className="flex items-center border-b border-border/50 min-h-[42px]">
          <span className="flex-shrink-0 w-16 text-xs font-medium text-muted-foreground pl-4">Subject</span>
          <input
            className="flex-1 text-sm bg-transparent outline-none py-2.5 pr-4 placeholder:text-muted-foreground/50"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject…"
          />
        </div>
      </div>

      <RichToolbar editorRef={editorRef as React.RefObject<HTMLDivElement>} />

      {/* Body */}
      <div
        ref={editorRef}
        contentEditable suppressContentEditableWarning
        data-placeholder="Write your message here…"
        className="flex-1 overflow-y-auto px-6 py-4 text-sm leading-relaxed outline-none
          [&:empty]:before:content-[attr(data-placeholder)]
          [&:empty]:before:text-muted-foreground/40
          [&:empty]:before:pointer-events-none"
        style={{ minHeight: '220px' }}
      />

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border/50 px-6 py-3 flex items-center gap-3 bg-muted/10">
        <Button size="sm" onClick={handleSend} disabled={isSending} className="gap-1.5">
          {isSending
            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Sending…</>
            : <><Send className="h-3.5 w-3.5" />Send</>}
        </Button>
        <Button size="sm" variant="outline" onClick={handleDraft} disabled={isSending}>
          Save Draft
        </Button>
        <div className="flex-1" />
        {error   && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{error}</p>}
        {success && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />{success}</p>}
      </div>
    </div>
  );
}

// ── Message Detail ────────────────────────────────────────────────────────────

function MessageDetail({
  message, onReply, onDelete,
}: {
  message: EmailMessage; onReply: () => void; onDelete: () => void;
}) {
  const toList  = (message.recipients ?? []).filter((r) => r.type === 'to');
  const color   = avatarColor(message.sender_name || message.sender_email || '?');
  const ini     = initials(message.sender_name || message.sender_email || '?');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-5 py-3 border-b border-border/50 flex-shrink-0">
        <Button size="sm" variant="ghost" onClick={onReply} className="gap-1.5 h-8 text-xs">
          <Reply className="h-3.5 w-3.5" />Reply
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-xs">
          <Forward className="h-3.5 w-3.5" />Forward
        </Button>
        <div className="flex-1" />
        <StatusBadge status={message.status} />
        <Button
          size="sm" variant="ghost"
          onClick={onDelete}
          className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
        >
          <Trash2 className="h-3.5 w-3.5" />Delete
        </Button>
      </div>

      {/* Header */}
      <div className="px-6 py-5 border-b border-border/40 flex-shrink-0 space-y-3">
        <h2 className="text-lg font-bold leading-tight tracking-tight">
          {message.subject || '(no subject)'}
        </h2>

        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${color}`}>
            {ini}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{message.sender_name || 'Unknown'}</span>
              {message.sender_email && (
                <span className="text-xs text-muted-foreground">&lt;{message.sender_email}&gt;</span>
              )}
            </div>
            {toList.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                To: {toList.map((r) => r.name || r.email).join(', ')}
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 mt-1">
            {formatDateTime(message.sent_at ?? message.created_at)}
          </span>
        </div>

        {/* Error banner */}
        {message.error_message && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700">Delivery failed</p>
              <p className="text-xs text-red-600 mt-0.5">{message.error_message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {message.body_html ? (
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: message.body_html }}
          />
        ) : (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {message.body_text || <span className="text-muted-foreground italic">(empty message)</span>}
          </p>
        )}
      </div>

      {/* Quick reply box (matches screenshot) */}
      <div className="flex-shrink-0 border-t border-border/40 px-6 py-4">
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground/50 cursor-pointer hover:bg-muted/40 transition-colors" onClick={onReply}>
          Reply {message.sender_name || ''}…
        </div>
      </div>
    </div>
  );
}

// ── Mail Logs Panel ───────────────────────────────────────────────────────────

function MailLogsPanel() {
  const { mailLogs, isLogLoading, fetchMailLogs } = useMailStore();
  const [search, setSearch] = useState('');

  useEffect(() => { fetchMailLogs(); }, [fetchMailLogs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? mailLogs.filter((l) =>
          [l.user_name, l.action, l.message?.subject, l.message?.sender_email]
            .some((f) => f?.toLowerCase().includes(q))
        )
      : mailLogs;
  }, [mailLogs, search]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold">Mail Logs</h3>
          <p className="text-xs text-muted-foreground mt-0.5">All users' email activity</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs w-52" />
          </div>
          <Button variant="outline" size="sm" onClick={fetchMailLogs} disabled={isLogLoading} className="gap-1.5 h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isLogLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLogLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
            <BarChart2 className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-semibold text-foreground">{search ? 'No results' : 'No activity yet'}</p>
            <p className="text-xs mt-1">{search ? 'Try a different term' : 'Mail activity appears here'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-xs">User</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Subject</TableHead>
                <TableHead className="text-xs">From</TableHead>
                <TableHead className="text-right pr-6 text-xs">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => {
                const col = avatarColor(log.user_name ?? '');
                return (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="pl-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${col}`}>
                          {initials(log.user_name ?? '?')}
                        </div>
                        <span className="text-xs font-medium truncate max-w-[120px]">{log.user_name ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className={`text-[10px] font-semibold capitalize ${ACTION_COLOR[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                        {log.action.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground max-w-[180px] truncate">{log.message?.subject ?? '—'}</TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground truncate max-w-[130px]">{log.message?.sender_name ?? '—'}</TableCell>
                    <TableCell className="py-3 text-right pr-6 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ── Message List Panel ────────────────────────────────────────────────────────

interface MessageListProps {
  messages: EmailMessage[];
  folder: Folder;
  selected: EmailMessage | null;
  onSelect: (m: EmailMessage) => void;
  onRetry?: (id: string) => void;
  isLoading: boolean;
}

const EMPTY: Record<Folder, { icon: React.ElementType; title: string }> = {
  inbox:   { icon: Inbox,    title: 'Your inbox is empty' },
  sent:    { icon: Send,     title: 'No sent emails yet'  },
  compose: { icon: PenSquare,title: ''                    },
  pending: { icon: Clock,    title: 'Nothing pending'     },
  failed:  { icon: MailX,    title: 'No failed emails'    },
  logs:    { icon: BarChart2,title: ''                    },
};

function MessageListPanel({ messages, folder, selected, onSelect, onRetry, isLoading }: MessageListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = useMemo(() => {
    let list = messages;
    if (filter === 'unread' && folder === 'inbox') list = list.filter((m) => !m.is_read);
    const q = search.toLowerCase();
    if (q) list = list.filter((m) =>
      [m.subject, m.sender_name, m.sender_email]
        .some((f) => f?.toLowerCase().includes(q))
    );
    return list;
  }, [messages, search, filter, folder]);

  const empty = EMPTY[folder];

  return (
    <div className="flex flex-col h-full border-r border-border bg-background">
      {/* Folder title + All/Unread tabs */}
      <div className="px-4 pt-4 pb-0 flex-shrink-0">
        <h3 className="text-base font-bold mb-3 capitalize">{folder === 'logs' ? 'Mail Logs' : folder}</h3>
        {folder === 'inbox' && (
          <div className="flex gap-1 border-b border-border/50 -mx-4 px-4">
            {(['all', 'unread'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`text-sm pb-2 font-medium border-b-2 -mb-px mr-4 transition-colors capitalize ${
                  filter === t ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-border/50 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 h-8 text-xs bg-muted/30 border-border/50" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-10" /></div>
                  <Skeleton className="h-3 w-40" /><Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
            {React.createElement(empty.icon, { className: 'h-10 w-10 mb-3 opacity-20' })}
            <p className="text-sm font-medium text-foreground">{empty.title}</p>
            {search && <p className="text-xs mt-1">Try a different search</p>}
          </div>
        ) : (
          filtered.map((m) => {
            const isInbox = folder === 'inbox';
            const name = isInbox
              ? m.sender_name
              : (m.recipients ?? []).filter((r) => r.type === 'to').map((r) => r.name || r.email).join(', ') || m.sender_email;
            return (
              <div key={m.id} className="relative group">
                <MessageRow
                  name={name}
                  subject={m.subject}
                  preview={m.body_text || stripHtml(m.body_html)}
                  date={m.sent_at ?? m.created_at}
                  status={folder !== 'inbox' ? m.status : undefined}
                  unread={folder === 'inbox' && !m.is_read}
                  selected={selected?.id === m.id}
                  onClick={() => onSelect(m)}
                />
                {folder === 'failed' && onRetry && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRetry(m.id); }}
                    title="Retry sending"
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 flex items-center justify-center"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function MailPage() {
  const { profile } = useAuthStore();
  const {
    inbox, sent, pending, failed,
    isLoading, fetchAll, fetchMailLogs, fetchSent,
    markRead, deleteMail, retrySend,
  } = useMailStore();

  const isAdmin  = profile?.role === 'Admin';
  const [folder,   setFolder]   = useState<Folder>('inbox');
  const [selected, setSelected] = useState<EmailMessage | null>(null);

  const load = useCallback(() => {
    fetchAll();
    if (isAdmin) fetchMailLogs();
  }, [fetchAll, fetchMailLogs, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const switchFolder = (f: Folder) => { setFolder(f); setSelected(null); };

  const handleSelect = (m: EmailMessage) => {
    setSelected(m);
    if (folder === 'inbox' && !m.is_read && m.recipient_id) markRead(m.recipient_id);
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMail(selected.id, folder === 'inbox' ? 'inbox' : 'sent');
    setSelected(null);
  };

  const handleRetry = async (id: string) => {
    try { await retrySend(id); } catch {}
  };

  const unreadCount = inbox.filter((m) => !m.is_read).length;
  const counts: Partial<Record<Folder, number>> = {
    inbox:   unreadCount,
    pending: pending.length,
    failed:  failed.length,
  };

  const visibleFolders = FOLDERS.filter((f) => !f.adminOnly || isAdmin);
  const currentMessages: EmailMessage[] = (
    { inbox, sent, compose: [], pending, failed, logs: [] } as Record<Folder, EmailMessage[]>
  )[folder] ?? [];

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-background">

      {/* ── SIDEBAR ── */}
      <aside className="w-48 flex-shrink-0 border-r border-border flex flex-col bg-muted/10">
        {/* Account */}
        <div className="p-3 border-b border-border/60">
          <button className="w-full flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60 transition-colors text-left">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(profile?.name ?? 'A')}`}>
              {initials(profile?.name ?? 'Admin')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{profile?.name ?? 'Admin'}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        </div>

        {/* Compose button */}
        <div className="px-3 pt-3 pb-2">
          <Button size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={() => switchFolder('compose')}>
            <PenSquare className="h-3.5 w-3.5" />
            Compose
          </Button>
        </div>

        {/* Folder nav */}
        <nav className="flex-1 overflow-y-auto px-1.5 pb-2">
          {visibleFolders.map(({ key, label, icon: Icon }) => {
            const cnt      = counts[key] ?? 0;
            const isActive = folder === key;
            return (
              <button
                key={key}
                onClick={() => switchFolder(key)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-foreground text-background font-medium'
                    : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{label}</span>
                </div>
                {cnt > 0 && (
                  <span className={`text-[11px] font-bold min-w-[20px] text-center ${isActive ? 'text-background/80' : 'text-muted-foreground'}`}>
                    {cnt > 99 ? '99+' : cnt}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Refresh */}
        <div className="p-2 border-t border-border/50">
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-1.5 h-7" onClick={load} disabled={isLoading}>
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      {folder === 'compose' ? (
        <div className="flex-1 overflow-hidden">
          <ComposePanel
            onSent={() => { switchFolder('sent'); fetchSent(); }}
            onCancel={() => switchFolder('inbox')}
          />
        </div>
      ) : folder === 'logs' ? (
        <div className="flex-1 overflow-hidden">
          <MailLogsPanel />
        </div>
      ) : (
        <>
          {/* Message list — matches screenshot width */}
          <div className="w-[380px] flex-shrink-0 flex flex-col overflow-hidden">
            <MessageListPanel
              messages={currentMessages}
              folder={folder}
              selected={selected}
              onSelect={handleSelect}
              onRetry={folder === 'failed' ? handleRetry : undefined}
              isLoading={isLoading}
            />
          </div>

          {/* Detail pane */}
          <main className="flex-1 overflow-hidden border-l border-border/50">
            {selected ? (
              <MessageDetail
                message={selected}
                onReply={() => switchFolder('compose')}
                onDelete={handleDelete}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/5">
                <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                  <Mail className="h-7 w-7 opacity-30" />
                </div>
                <p className="text-sm font-semibold text-foreground">No message selected</p>
                <p className="text-xs mt-1.5">Select a message from the list to read it</p>
                {folder === 'inbox' && unreadCount > 0 && (
                  <div className="mt-3 text-xs bg-primary/5 border border-primary/10 text-primary rounded-full px-3 py-1 font-medium">
                    {unreadCount} unread {unreadCount === 1 ? 'message' : 'messages'}
                  </div>
                )}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}
