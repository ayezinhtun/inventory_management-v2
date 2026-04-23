/**
 * Administration → Mail
 * Full email client: Inbox | Sent | Compose | Pending | Failed | Mail Logs
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
import { Separator } from '../components/ui/Separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/Table';
import {
  Inbox, Send, PenSquare, Clock, MailX, BarChart2,
  RefreshCw, Search, Trash2, Reply, Forward,
  RotateCcw, ChevronDown, X, Plus, Bold, Italic,
  Underline, List, ListOrdered, User, Mail, AlertCircle,
  CheckCircle2, MailCheck, MailOpen, Download,
  ArrowUpRight, Filter,
} from 'lucide-react';
import { formatDateTime } from '../lib/utils';

// ── Folder config ─────────────────────────────────────────────────────────────

type Folder = 'inbox' | 'sent' | 'compose' | 'pending' | 'failed' | 'logs';

interface FolderDef {
  key: Folder;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const FOLDERS: FolderDef[] = [
  { key: 'inbox',   label: 'Inbox',     icon: Inbox     },
  { key: 'sent',    label: 'Sent',      icon: Send      },
  { key: 'compose', label: 'Compose',   icon: PenSquare },
  { key: 'pending', label: 'Pending',   icon: Clock     },
  { key: 'failed',  label: 'Failed',    icon: MailX     },
  { key: 'logs',    label: 'Mail Logs', icon: BarChart2, adminOnly: true },
];

const STATUS_CFG: Record<string, { class: string; label: string; icon: React.ElementType }> = {
  sent:      { class: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Sent',      icon: MailCheck  },
  failed:    { class: 'bg-red-100    text-red-700    border-red-200',       label: 'Failed',    icon: MailX      },
  pending:   { class: 'bg-amber-100  text-amber-700  border-amber-200',     label: 'Pending',   icon: Clock      },
  sending:   { class: 'bg-blue-100   text-blue-700   border-blue-200',      label: 'Sending',   icon: Send       },
  scheduled: { class: 'bg-violet-100 text-violet-700 border-violet-200',    label: 'Scheduled', icon: Clock      },
  draft:     { class: 'bg-gray-100   text-gray-600   border-gray-200',      label: 'Draft',     icon: PenSquare  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.class}`}>
      <Icon className="h-2.5 w-2.5" />{cfg.label}
    </Badge>
  );
}

function timeAgo(d: string) {
  const diff  = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return formatDateTime(d);
}

// ── Message Row ───────────────────────────────────────────────────────────────

function MessageRow({
  label, sublabel, subject, preview, date, status, unread, selected, onClick,
}: {
  label: string; sublabel?: string; subject: string; preview: string;
  date: string; status?: string; unread?: boolean; selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b transition-all hover:bg-muted/40 ${
        selected
          ? 'bg-primary/5 border-l-2 border-l-primary pl-3.5'
          : 'border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {unread && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
          <span className={`text-sm truncate ${unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
            {label}
          </span>
          {sublabel && <span className="text-[10px] text-muted-foreground truncate hidden sm:block">&lt;{sublabel}&gt;</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {status && <StatusBadge status={status} />}
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(date)}</span>
        </div>
      </div>
      <p className={`text-xs truncate mb-0.5 ${unread ? 'font-semibold' : 'text-foreground/80'}`}>{subject}</p>
      <p className="text-[11px] text-muted-foreground truncate leading-relaxed">{preview}</p>
    </button>
  );
}

// ── Recipient Chip Input ──────────────────────────────────────────────────────

interface RecipientChipInputProps {
  label: string;
  recipients: MailRecipient[];
  type: 'to' | 'cc' | 'bcc';
  onChange: (recipients: MailRecipient[]) => void;
}

function RecipientChipInput({ label, recipients, type, onChange }: RecipientChipInputProps) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<any[]>([]);
  const [open, setOpen]         = useState(false);
  const containerRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('user_id, name, email')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(8);
      setResults(data ?? []);
      setOpen(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addRecipient = (r: { user_id?: string; name: string; email: string }) => {
    if (recipients.some((x) => x.email === r.email)) return;
    onChange([...recipients, { user_id: r.user_id, email: r.email, name: r.name, type }]);
    setQuery('');
    setOpen(false);
  };

  const addRaw = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(query)) return;
    addRecipient({ name: query, email: query });
  };

  const remove = (email: string) => onChange(recipients.filter((r) => r.email !== email));

  return (
    <div className="flex items-start gap-2 px-3 py-2 border-b" ref={containerRef}>
      <span className="text-xs text-muted-foreground font-medium pt-1.5 flex-shrink-0 w-7">{label}</span>
      <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-[28px] relative">
        {recipients.map((r) => (
          <span key={r.email} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">
            {r.name || r.email}
            <button onClick={() => remove(r.email)} className="hover:text-red-500 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[140px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addRaw(); }
            if (e.key === 'Backspace' && !query && recipients.length) {
              remove(recipients[recipients.length - 1].email);
            }
          }}
          placeholder={recipients.length === 0 ? 'Add recipients…' : ''}
        />

        {/* Dropdown */}
        {open && results.length > 0 && (
          <div className="absolute left-0 top-full mt-1 w-72 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
            {results.map((r) => (
              <button
                key={r.user_id}
                onMouseDown={(e) => { e.preventDefault(); addRecipient(r); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              >
                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {r.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Rich Text Toolbar ─────────────────────────────────────────────────────────

function RichToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement> }) {
  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const ToolBtn = ({ onClick, icon: Icon, title }: { onClick: () => void; icon: React.ElementType; title: string }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="h-7 w-7 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b bg-muted/20">
      <ToolBtn icon={Bold}         title="Bold"           onClick={() => exec('bold')}                 />
      <ToolBtn icon={Italic}       title="Italic"         onClick={() => exec('italic')}               />
      <ToolBtn icon={Underline}    title="Underline"      onClick={() => exec('underline')}            />
      <div className="w-px h-4 bg-border mx-1" />
      <ToolBtn icon={List}         title="Bullet List"    onClick={() => exec('insertUnorderedList')}  />
      <ToolBtn icon={ListOrdered}  title="Numbered List"  onClick={() => exec('insertOrderedList')}   />
    </div>
  );
}

// ── Compose Panel ─────────────────────────────────────────────────────────────

function ComposePanel({
  onSent, onDraft,
}: {
  onSent: () => void;
  onDraft: () => void;
}) {
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
  const getBodyText = () => editorRef.current?.innerText ?? '';

  const buildParams = (): ComposeParams => ({
    to, cc, bcc, subject,
    body_html: getBodyHtml(),
    body_text: getBodyText(),
  });

  const validate = () => {
    if (to.length === 0) return 'Please add at least one recipient.';
    if (!subject.trim()) return 'Subject is required.';
    if (!getBodyText().trim()) return 'Message body cannot be empty.';
    return '';
  };

  const handleSend = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    try {
      await sendMail(buildParams());
      setSuccess('Email sent successfully!');
      setTimeout(() => { setSuccess(''); onSent(); }, 1500);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send');
    }
  };

  const handleDraft = async () => {
    try {
      await saveDraft(buildParams());
      setSuccess('Draft saved.');
      setTimeout(() => { setSuccess(''); onDraft(); }, 1200);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save draft');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compose header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">New Message</h2>
        <div className="flex items-center gap-1.5">
          {!showCc  && <button onClick={() => setShowCc(true)}  className="text-xs text-primary hover:underline">+ Cc</button>}
          {!showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-primary hover:underline">+ Bcc</button>}
        </div>
      </div>

      {/* Recipients */}
      <RecipientChipInput label="To"  recipients={to}  type="to"  onChange={setTo}  />
      {showCc  && <RecipientChipInput label="Cc"  recipients={cc}  type="cc"  onChange={setCc}  />}
      {showBcc && <RecipientChipInput label="Bcc" recipients={bcc} type="bcc" onChange={setBcc} />}

      {/* Subject */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <span className="text-xs text-muted-foreground font-medium flex-shrink-0">Subject</span>
        <input
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground font-medium"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject…"
        />
      </div>

      {/* Rich text toolbar */}
      <RichToolbar editorRef={editorRef as React.RefObject<HTMLDivElement>} />

      {/* Body */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write your message here…"
        className="flex-1 p-4 text-sm outline-none overflow-y-auto leading-relaxed
          [&[contenteditable=true]:empty]:before:content-[attr(data-placeholder)]
          [&[contenteditable=true]:empty]:before:text-muted-foreground"
        style={{ minHeight: '200px' }}
      />

      {/* Footer */}
      <div className="border-t px-4 py-3 flex items-center gap-3">
        <Button size="sm" onClick={handleSend} disabled={isSending}>
          {isSending
            ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Sending…</>
            : <><Send className="h-3.5 w-3.5 mr-1.5" />Send</>}
        </Button>
        <Button size="sm" variant="outline" onClick={handleDraft} disabled={isSending}>
          Save Draft
        </Button>
        {error   && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
        {success && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{success}</p>}
      </div>
    </div>
  );
}

// ── Message Detail ────────────────────────────────────────────────────────────

function MessageDetail({
  message, onReply, onDelete, kind,
}: {
  message: EmailMessage;
  onReply: () => void;
  onDelete: () => void;
  kind: 'inbox' | 'sent';
}) {
  const toList = (message.recipients ?? []).filter((r) => r.type === 'to');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b space-y-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold leading-tight flex-1">{message.subject}</h2>
          <StatusBadge status={message.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="h-3 w-3" />
            <strong className="text-foreground">From:</strong> {message.sender_name}
            {message.sender_email && <span className="text-muted-foreground">&lt;{message.sender_email}&gt;</span>}
          </span>
          {toList.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              <strong className="text-foreground">To:</strong>{' '}
              {toList.map((r) => r.name || r.email).join(', ')}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {formatDateTime(message.sent_at ?? message.created_at)}
          </span>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onReply}>
            <Reply className="h-3.5 w-3.5 mr-1.5" />Reply
          </Button>
          <Button size="sm" variant="outline">
            <Forward className="h-3.5 w-3.5 mr-1.5" />Forward
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="ml-auto text-red-600 hover:text-red-700 hover:border-red-300">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
          </Button>
        </div>
        {/* Error message for failed */}
        {message.error_message && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {message.error_message}
          </div>
        )}
      </div>
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {message.body_html ? (
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: message.body_html }}
          />
        ) : (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {message.body_text || '(no message body)'}
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

  const filtered = search.trim()
    ? mailLogs.filter((l) =>
        [l.user_name, l.action, l.message?.subject, l.message?.sender_email]
          .some((f) => f?.toLowerCase().includes(search.toLowerCase()))
      )
    : mailLogs;

  const ACTION_COLOR: Record<string, string> = {
    sent:        'bg-emerald-100 text-emerald-700 border-emerald-200',
    failed:      'bg-red-100    text-red-700    border-red-200',
    retried:     'bg-amber-100  text-amber-700  border-amber-200',
    read:        'bg-blue-100   text-blue-700   border-blue-200',
    deleted:     'bg-gray-100   text-gray-600   border-gray-200',
    draft_saved: 'bg-violet-100 text-violet-700 border-violet-200',
    received:    'bg-sky-100    text-sky-700    border-sky-200',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold">Mail Logs</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Complete audit of all users' email activity</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs…"
              className="pl-8 h-8 text-xs w-52"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchMailLogs} disabled={isLogLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLogLoading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLogLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BarChart2 className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium text-foreground">No logs found</p>
            <p className="text-xs mt-1">{search ? 'Try a different search term' : 'Mail activity will appear here'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 text-xs">User</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Subject</TableHead>
                <TableHead className="text-xs">From</TableHead>
                <TableHead className="text-xs text-right pr-5 whitespace-nowrap">Date / Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id} className="text-sm">
                  <TableCell className="pl-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {(log.user_name ?? '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="text-xs font-medium truncate max-w-[100px]">{log.user_name ?? '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge variant="outline" className={`text-[10px] font-semibold px-1.5 py-0.5 capitalize ${ACTION_COLOR[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                      {log.action.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">
                    {log.message?.subject ?? '—'}
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground truncate max-w-[140px]">
                    {log.message?.sender_name ?? '—'}
                  </TableCell>
                  <TableCell className="py-2.5 text-right pr-5 text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                </TableRow>
              ))}
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

function MessageListPanel({ messages, folder, selected, onSelect, onRetry, isLoading }: MessageListProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? messages.filter((m) =>
        [m.subject, m.sender_name, m.sender_email,
         (m.recipients ?? []).map((r) => r.email).join(' ')]
          .some((f) => f?.toLowerCase().includes(search.toLowerCase()))
      )
    : messages;

  const emptyMsg: Record<Folder, string> = {
    inbox:   'Your inbox is empty',
    sent:    'No sent emails yet',
    compose: '',
    pending: 'No pending emails',
    failed:  'No failed emails',
    logs:    '',
  };

  return (
    <div className="flex flex-col h-full border-r">
      {/* Search */}
      <div className="p-3 border-b flex-shrink-0">
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
      <div className="px-3 py-1.5 border-b flex-shrink-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
          {filtered.length} message{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1 px-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-56" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <MailOpen className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium text-foreground">{emptyMsg[folder]}</p>
            {folder === 'failed' && (
              <p className="text-xs mt-1 text-center px-4">Failed emails will appear here with error details</p>
            )}
          </div>
        ) : (
          filtered.map((m) => {
            const isInbox = folder === 'inbox';
            const toNames = (m.recipients ?? []).filter((r) => r.type === 'to').map((r) => r.name || r.email).join(', ');

            return (
              <div key={m.id} className="relative group">
                <MessageRow
                  label={isInbox ? m.sender_name : (toNames || m.sender_email)}
                  sublabel={isInbox ? m.sender_email : undefined}
                  subject={m.subject}
                  preview={m.body_text || stripHtml(m.body_html)}
                  date={m.sent_at ?? m.created_at}
                  status={folder !== 'inbox' ? m.status : undefined}
                  unread={folder === 'inbox' && !m.is_read}
                  selected={selected?.id === m.id}
                  onClick={() => onSelect(m)}
                />
                {/* Retry button for failed */}
                {folder === 'failed' && onRetry && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRetry(m.id); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Retry sending"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-600 hover:text-amber-700" />
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
    inbox, sent, pending, failed, mailLogs,
    isLoading, fetchInbox, fetchSent, fetchPending,
    fetchFailed, fetchMailLogs, fetchAll,
    markRead, deleteMail, retrySend,
  } = useMailStore();

  const isAdmin = profile?.role === 'Admin';
  const [folder,   setFolder]   = useState<Folder>('inbox');
  const [selected, setSelected] = useState<EmailMessage | null>(null);

  const load = useCallback(() => {
    fetchAll();
    if (isAdmin) fetchMailLogs();
  }, [fetchAll, fetchMailLogs, isAdmin]);

  useEffect(() => { load(); }, [load]);

  // When switching folders, clear selection
  const switchFolder = (f: Folder) => {
    setFolder(f);
    setSelected(null);
  };

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

  // Counts for sidebar badges
  const unreadInbox = inbox.filter((m) => !m.is_read).length;
  const counts: Partial<Record<Folder, number>> = {
    inbox:   unreadInbox,
    pending: pending.length,
    failed:  failed.length,
  };

  const folders = FOLDERS.filter((f) => !f.adminOnly || isAdmin);

  // Current message list
  const currentMessages: EmailMessage[] = {
    inbox, sent, compose: [], pending, failed, logs: [],
  }[folder] ?? [];

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-background">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-52 flex-shrink-0 border-r bg-muted/20 flex flex-col">
        {/* Account header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-bold flex-shrink-0">
              {(profile?.name ?? 'A').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{profile?.name ?? 'Admin'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{profile?.email ?? ''}</p>
            </div>
          </div>
        </div>

        {/* Compose button */}
        <div className="px-3 pt-3 pb-1">
          <Button
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => switchFolder('compose')}
          >
            <PenSquare className="h-3.5 w-3.5" />
            Compose
          </Button>
        </div>

        {/* Folder nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {folders.filter((f) => f.key !== 'compose').map(({ key, label, icon: Icon }) => {
            const cnt     = counts[key] ?? 0;
            const isActive = folder === key;
            return (
              <button
                key={key}
                onClick={() => switchFolder(key)}
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
                  <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center ${
                    isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    {cnt > 99 ? '99+' : cnt}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Refresh */}
        <div className="p-3 border-t">
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={load} disabled={isLoading}>
            <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </aside>

      {/* ── COMPOSE (full width center+right) ── */}
      {folder === 'compose' ? (
        <div className="flex-1 overflow-hidden">
          <ComposePanel
            onSent={() => { switchFolder('sent'); fetchSent(); }}
            onDraft={() => {}}
          />
        </div>
      ) : folder === 'logs' ? (
        <div className="flex-1 overflow-hidden">
          <MailLogsPanel />
        </div>
      ) : (
        <>
          {/* ── CENTER: Message list ── */}
          <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden">
            <MessageListPanel
              messages={currentMessages}
              folder={folder}
              selected={selected}
              onSelect={handleSelect}
              onRetry={folder === 'failed' ? handleRetry : undefined}
              isLoading={isLoading}
            />
          </div>

          {/* ── RIGHT: Detail pane ── */}
          <main className="flex-1 overflow-hidden bg-background">
            {selected ? (
              <MessageDetail
                message={selected}
                kind={folder === 'inbox' ? 'inbox' : 'sent'}
                onReply={() => switchFolder('compose')}
                onDelete={handleDelete}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="h-20 w-20 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                  <Mail className="h-9 w-9 opacity-25" />
                </div>
                <p className="text-base font-semibold text-foreground">No message selected</p>
                <p className="text-sm mt-1.5">Select a message from the list to view it</p>
                {folder === 'inbox' && unreadInbox > 0 && (
                  <p className="text-xs text-primary mt-2 font-medium">
                    {unreadInbox} unread message{unreadInbox !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

