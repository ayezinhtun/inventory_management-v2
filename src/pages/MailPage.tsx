/**
 * Administration → Mail
 * Modern email client: Inbox | Sent | Compose | Pending | Failed | Mail Logs
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
import { Avatar, AvatarFallback } from '../components/ui/Avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/Table';
import {
  Inbox, Send, PenSquare, Clock, MailX, BarChart2,
  RefreshCw, Search, Trash2, Reply, Forward,
  RotateCcw, X, Bold, Italic,
  Underline, List, ListOrdered, Mail, AlertCircle,
  CheckCircle2, MailCheck, MailOpen,
  Star, Archive, MoreHorizontal, ChevronRight,
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
  draft:     { cls: 'bg-muted text-muted-foreground border-border',       label: 'Draft'     },
};

const ACTION_COLOR: Record<string, string> = {
  sent:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed:      'bg-red-50 text-red-600 border-red-200',
  retried:     'bg-amber-50 text-amber-700 border-amber-200',
  read:        'bg-blue-50 text-blue-700 border-blue-200',
  deleted:     'bg-muted text-muted-foreground border-border',
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
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// Avatar color pool (deterministic based on name)
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <Badge variant="outline" className={`text-[10px] font-medium px-1.5 py-0.5 ${cfg.cls}`}>
      {cfg.label}
    </Badge>
  );
}

// ── Message Row ───────────────────────────────────────────────────────────────

function MessageRow({
  name, email, subject, preview, date, status, unread, selected, onClick,
}: {
  name: string; email?: string; subject: string; preview: string;
  date: string; status?: string; unread?: boolean; selected: boolean;
  onClick: () => void;
}) {
  const color = avatarColor(name || email || '?');
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border/40 transition-all duration-200 ${
        selected
          ? 'bg-blue-50/80 border-l-2 border-l-blue-500'
          : unread
            ? 'bg-white hover:bg-slate-50'
            : 'bg-slate-50/50 hover:bg-slate-50'
      }`}
    >
      {/* Avatar */}
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5 ${color}`}>
        {initials(name || email || '?') || '?'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`text-sm truncate ${unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
            {name || email}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {status && <StatusBadge status={status} />}
            <span className={`text-[11px] tabular-nums ${unread ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
              {timeAgo(date)}
            </span>
          </div>
        </div>
        <p className={`text-sm truncate leading-snug ${unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
          {subject || '(no subject)'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {unread && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
          <p className="text-xs text-slate-500 truncate leading-relaxed flex-1">
            {preview || '—'}
          </p>
        </div>
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
  placeholder?: string;
}

function RecipientChipInput({ label, recipients, type, onChange, placeholder }: RecipientChipInputProps) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open,    setOpen]    = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

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
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const add = (r: { user_id?: string; name: string; email: string }) => {
    if (recipients.some((x) => x.email === r.email)) return;
    onChange([...recipients, { user_id: r.user_id, email: r.email, name: r.name, type }]);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const addRaw = () => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)) add({ name: query, email: query });
  };

  const remove = (email: string) => onChange(recipients.filter((r) => r.email !== email));

  return (
    <div
      ref={containerRef}
      className="relative flex items-start gap-0 min-h-[48px] border-b border-slate-200 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Label */}
      <span className="flex-shrink-0 w-16 text-sm font-medium text-slate-600 self-center pl-4 pr-2">
        {label}
      </span>

      {/* Chips + input */}
      <div className="flex flex-wrap items-center gap-1.5 flex-1 py-2.5 pr-3">
        {recipients.map((r) => (
          <span
            key={r.email}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 text-xs px-2.5 py-1 font-medium border border-blue-100"
          >
            {r.name && r.name !== r.email ? r.name : r.email}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(r.email); }}
              className="text-blue-500 hover:text-blue-800 transition-colors ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-slate-400 py-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addRaw(); }
            if (e.key === 'Backspace' && !query && recipients.length) {
              remove(recipients[recipients.length - 1].email);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={recipients.length === 0 ? (placeholder ?? 'Add people…') : ''}
        />
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Suggestions</p>
          </div>
          {results.map((r) => {
            const color = avatarColor(r.name || r.email);
            return (
              <button
                key={r.user_id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(r); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${color}`}>
                  {initials(r.name || r.email)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 truncate">{r.email}</p>
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
  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const Btn = ({ icon: Icon, cmd, title }: { icon: React.ElementType; cmd: string; title: string }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-50">
      <Btn icon={Bold}        cmd="bold"               title="Bold (⌘B)"       />
      <Btn icon={Italic}      cmd="italic"             title="Italic (⌘I)"     />
      <Btn icon={Underline}   cmd="underline"          title="Underline (⌘U)"  />
      <div className="w-px h-5 bg-slate-300 mx-2" />
      <Btn icon={List}        cmd="insertUnorderedList" title="Bullet list"    />
      <Btn icon={ListOrdered} cmd="insertOrderedList"   title="Numbered list"  />
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

  const getBodyHtml = () => editorRef.current?.innerHTML ?? '';
  const getBodyText = () => editorRef.current?.innerText  ?? '';

  const params = (): ComposeParams => ({
    to, cc: showCc ? cc : [], bcc: showBcc ? bcc : [], subject,
    body_html: getBodyHtml(), body_text: getBodyText(),
  });

  const validate = () => {
    if (!to.length)            return 'Add at least one recipient.';
    if (!subject.trim())       return 'Subject is required.';
    if (!getBodyText().trim()) return 'Message body is empty.';
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
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send');
    }
  };

  const handleDraft = async () => {
    try {
      await saveDraft(params());
      setSuccess('Draft saved.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save draft');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 flex-shrink-0 bg-slate-50">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">New Message</h2>
          <p className="text-sm text-slate-500 mt-0.5">Compose and send a message</p>
        </div>
        <div className="flex items-center gap-2">
          {!showCc && (
            <button onClick={() => setShowCc(true)} className="text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-white hover:shadow-sm">
              + Cc
            </button>
          )}
          {!showBcc && (
            <button onClick={() => setShowBcc(true)} className="text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-white hover:shadow-sm">
              + Bcc
            </button>
          )}
          <button onClick={onCancel} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-900 transition-colors ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable form area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Recipients */}
        <div className="flex-shrink-0">
          <RecipientChipInput label="To"  recipients={to}  type="to"  onChange={setTo}  placeholder="Recipients…" />
          {showCc  && <RecipientChipInput label="Cc"  recipients={cc}  type="cc"  onChange={setCc}  />}
          {showBcc && <RecipientChipInput label="Bcc" recipients={bcc} type="bcc" onChange={setBcc} />}

          {/* Subject */}
          <div className="flex items-center gap-0 border-b border-slate-200 min-h-[48px]">
            <span className="flex-shrink-0 w-16 text-sm font-medium text-slate-600 pl-4 pr-2">
              Subject
            </span>
            <input
              className="flex-1 text-sm bg-transparent outline-none py-3 pr-4 font-medium placeholder:text-slate-400 placeholder:font-normal"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject…"
            />
          </div>
        </div>

        {/* Toolbar */}
        <RichToolbar editorRef={editorRef as React.RefObject<HTMLDivElement>} />

        {/* Body */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Write your message here…"
          className={`
            flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed outline-none text-slate-700
            [&:empty]:before:content-[attr(data-placeholder)]
            [&:empty]:before:text-slate-400
            [&:empty]:before:pointer-events-none
          `}
          style={{ minHeight: '280px' }}
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 flex items-center gap-3 bg-slate-50">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={isSending}
          className="gap-2 h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
        >
          {isSending ? (
            <><RefreshCw className="h-4 w-4 animate-spin" />Sending…</>
          ) : (
            <><Send className="h-4 w-4" />Send message</>
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={handleDraft} disabled={isSending} className="h-9 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300">
          Save draft
        </Button>
        <div className="flex-1" />
        {error   && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
          </p>
        )}
        {success && (
          <p className="text-sm text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Message Detail ────────────────────────────────────────────────────────────

function MessageDetail({
  message, onReply, onDelete,
}: {
  message: EmailMessage;
  onReply: () => void;
  onDelete: () => void;
}) {
  const toList  = (message.recipients ?? []).filter((r) => r.type === 'to');
  const color   = avatarColor(message.sender_name || message.sender_email || '?');
  const initStr = initials(message.sender_name || message.sender_email || '?');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-6 border-b border-slate-200 space-y-5">
        {/* Subject + status */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold leading-tight flex-1 tracking-tight text-slate-900">
            {message.subject || '(no subject)'}
          </h2>
          <StatusBadge status={message.status} />
        </div>

        {/* Sender row */}
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${color}`}>
            {initStr || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold text-slate-900">{message.sender_name || 'Unknown'}</span>
              {message.sender_email && (
                <span className="text-sm text-slate-500">
                  &lt;{message.sender_email}&gt;
                </span>
              )}
            </div>
            {toList.length > 0 && (
              <p className="text-sm text-slate-500 mt-1">
                To: {toList.map((r) => r.name || r.email).join(', ')}
              </p>
            )}
          </div>
          <span className="text-sm text-slate-500 flex-shrink-0 self-start mt-1">
            {formatDateTime(message.sent_at ?? message.created_at)}
          </span>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onReply} className="gap-2 h-9 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300">
            <Reply className="h-4 w-4" />Reply
          </Button>
          <Button size="sm" variant="outline" className="gap-2 h-9 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300">
            <Forward className="h-4 w-4" />Forward
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="gap-2 h-9 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 border-slate-200"
          >
            <Trash2 className="h-4 w-4" />Delete
          </Button>
        </div>

        {/* Error banner */}
        {message.error_message && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
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
            className="prose prose-sm max-w-none text-slate-800 [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-700"
            dangerouslySetInnerHTML={{ __html: message.body_html }}
          />
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {message.body_text || <span className="text-slate-400 italic">(no message body)</span>}
          </p>
        )}
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
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200 flex-shrink-0 bg-slate-50">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Mail Logs</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Full audit trail of all users' email activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs…"
              className="pl-10 h-9 text-sm bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100 w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchMailLogs} disabled={isLogLoading} className="gap-2 h-9 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300">
            <RefreshCw className={`h-4 w-4 ${isLogLoading ? 'animate-spin' : ''}`} />
            Refresh
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
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
            <div className="h-16 w-16 rounded-2xl bg-slate-200 flex items-center justify-center mb-4">
              <BarChart2 className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-sm font-semibold text-slate-600">
              {search ? 'No matching logs' : 'No activity yet'}
            </p>
            <p className="text-xs mt-1">
              {search ? 'Try a different search term' : 'Mail activity will appear here'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50">
                <TableHead className="pl-6 text-xs font-semibold text-slate-600 w-[180px]">User</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 w-[110px]">Action</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Subject</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 w-[150px]">Sender</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right pr-6 w-[150px]">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => {
                const color = avatarColor(log.user_name ?? '');
                return (
                  <TableRow key={log.id} className="text-sm hover:bg-slate-50 border-b border-slate-100">
                    <TableCell className="pl-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${color}`}>
                          {initials(log.user_name ?? '?')}
                        </div>
                        <span className="text-xs font-medium truncate text-slate-700">{log.user_name ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold capitalize ${ACTION_COLOR[log.action] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {log.action.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600 max-w-[200px] truncate">
                      {log.message?.subject ?? <span className="italic">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600 truncate">
                      {log.message?.sender_name ?? '—'}
                    </TableCell>
                    <TableCell className="py-3 text-right pr-6 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </TableCell>
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

const EMPTY_MSG: Record<Folder, { icon: React.ElementType; title: string; sub: string }> = {
  inbox:   { icon: Inbox,    title: 'Inbox is empty',        sub: 'No messages to display' },
  sent:    { icon: Send,     title: 'No sent mail',           sub: 'Sent messages appear here' },
  compose: { icon: PenSquare,title: '',                       sub: '' },
  pending: { icon: Clock,    title: 'Nothing pending',        sub: 'Pending messages appear here' },
  failed:  { icon: MailX,    title: 'No failed deliveries',   sub: 'Failed messages appear here' },
  logs:    { icon: BarChart2, title: '',                      sub: '' },
};

function MessageListPanel({ messages, folder, selected, onSelect, onRetry, isLoading }: MessageListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? messages.filter((m) =>
          [m.subject, m.sender_name, m.sender_email,
           (m.recipients ?? []).map((r) => r.email).join(' ')]
            .some((f) => f?.toLowerCase().includes(q))
        )
      : messages;
  }, [messages, search]);

  const empty = EMPTY_MSG[folder];
  const EmptyIcon = empty.icon;

  return (
    <div className="flex flex-col h-full border-r border-slate-200 bg-white">
      {/* Search */}
      <div className="p-3 border-b border-slate-200 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="pl-10 h-9 text-sm bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Count row */}
      <div className="px-4 py-2 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          {filtered.length} {filtered.length === 1 ? 'message' : 'messages'}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-1 py-1">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <EmptyIcon className="h-6 w-6 opacity-40" />
            </div>
            <p className="text-sm font-semibold text-foreground">{empty.title}</p>
            <p className="text-xs mt-1 text-center px-6">{empty.sub}</p>
          </div>
        ) : (
          filtered.map((m) => {
            const isInbox = folder === 'inbox';
            const name    = isInbox ? m.sender_name : (
              (m.recipients ?? []).filter((r) => r.type === 'to').map((r) => r.name || r.email).join(', ')
              || m.sender_email
            );
            return (
              <div key={m.id} className="relative group">
                <MessageRow
                  name={name}
                  email={isInbox ? m.sender_email : undefined}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 flex items-center justify-center shadow-sm"
                  >
                    <RotateCcw className="h-4 w-4" />
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
    isLoading, fetchAll, fetchMailLogs,
    markRead, deleteMail, retrySend, fetchSent,
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
    if (folder === 'inbox' && !m.is_read && m.recipient_id) {
      markRead(m.recipient_id);
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMail(selected.id, folder === 'inbox' ? 'inbox' : 'sent');
    setSelected(null);
  };

  const handleRetry = async (id: string) => {
    try { await retrySend(id); } catch {}
  };

  // Badge counts
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

  const isFullWidth = folder === 'compose' || folder === 'logs';

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-white">

      {/* ── SIDEBAR ── */}
      <aside className="w-56 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        {/* User account */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(profile?.name ?? 'Admin')}`}>
              {initials(profile?.name ?? 'Admin') || 'AU'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-slate-900">{profile?.name ?? 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{profile?.email ?? ''}</p>
            </div>
          </div>
        </div>

        {/* Compose */}
        <div className="px-3 pt-4 pb-2">
          <Button
            size="sm"
            className="w-full justify-center gap-2 h-10 shadow-md bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
            onClick={() => switchFolder('compose')}
          >
            <PenSquare className="h-4 w-4" />
            Compose
          </Button>
        </div>

        {/* Folder nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {visibleFolders.map(({ key, label, icon: Icon }) => {
            const cnt      = counts[key] ?? 0;
            const isActive = folder === key;
            return (
              <button
                key={key}
                onClick={() => switchFolder(key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-700 hover:bg-white hover:shadow-sm font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{label}</span>
                </div>
                {cnt > 0 && (
                  <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center leading-none ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {cnt > 99 ? '99+' : cnt}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Refresh */}
        <div className="p-3 border-t border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-slate-600 hover:text-slate-900 hover:bg-white gap-1.5 h-9 rounded-lg"
            onClick={load}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      {folder === 'compose' ? (
        /* Compose: full width */
        <div className="flex-1 overflow-hidden">
          <ComposePanel
            onSent={() => { switchFolder('sent'); fetchSent(); }}
            onCancel={() => switchFolder('inbox')}
          />
        </div>
      ) : folder === 'logs' ? (
        /* Logs: full width */
        <div className="flex-1 overflow-hidden">
          <MailLogsPanel />
        </div>
      ) : (
        <>
          {/* CENTER: Message list */}
          <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden">
            <MessageListPanel
              messages={currentMessages}
              folder={folder}
              selected={selected}
              onSelect={handleSelect}
              onRetry={folder === 'failed' ? handleRetry : undefined}
              isLoading={isLoading}
            />
          </div>

          {/* RIGHT: Detail pane */}
          <main className="flex-1 overflow-hidden bg-slate-50">
            {selected ? (
              <MessageDetail
                message={selected}
                onReply={() => switchFolder('compose')}
                onDelete={handleDelete}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50">
                <div className="h-24 w-24 rounded-3xl bg-slate-200 flex items-center justify-center mb-6">
                  <Mail className="h-10 w-10 opacity-40" />
                </div>
                <p className="text-lg font-semibold text-slate-600">Select a message</p>
                <p className="text-sm mt-2 text-slate-500">
                  Choose a message from the list to read it
                </p>
                {folder === 'inbox' && unreadCount > 0 && (
                  <div className="mt-5 flex items-center gap-2 text-sm bg-blue-50 border border-blue-100 text-blue-700 rounded-full px-4 py-2 font-medium">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
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
