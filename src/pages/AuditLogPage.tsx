import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/Select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/Dialog';
import { Separator } from '../components/ui/Separator';
import { Search, FileSearch } from 'lucide-react';
import { formatDateTime } from '../lib/utils';

// ── types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  record_id: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  ip_address: string | null;
  timestamp: string;
  user_name?: string; // joined
}

// ── helpers ───────────────────────────────────────────────────────────────────

function actionColor(action: string) {
  if (action === 'CREATE') return 'bg-emerald-100 text-emerald-800';
  if (action === 'UPDATE') return 'bg-blue-100 text-blue-800';
  if (action === 'DELETE') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

function summarize(log: AuditEntry): string {
  if (log.action === 'CREATE') return `Created new record in ${log.module}`;
  if (log.action === 'DELETE') return `Deleted record from ${log.module}`;
  if (log.old_value && log.new_value) {
    const changed = Object.keys(log.new_value).filter(
      (k) => JSON.stringify(log.old_value![k]) !== JSON.stringify(log.new_value![k])
    );
    if (changed.length === 0) return 'Updated record';
    if (changed.includes('status')) return `Status → ${log.new_value.status}`;
    if (changed.includes('quantity')) return `Quantity → ${log.new_value.quantity}`;
    return `Changed: ${changed.slice(0, 3).join(', ')}${changed.length > 3 ? ` +${changed.length - 3} more` : ''}`;
  }
  if (log.new_value) return `Updated: ${Object.keys(log.new_value).join(', ')}`;
  return 'Updated record';
}

// ── main ──────────────────────────────────────────────────────────────────────

export function AuditLogPage() {
  const { currentUser, auditLogs, getUserName } = useStore();

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [modules, setModules] = useState<string[]>([]);

  const [detailLog, setDetailLog] = useState<AuditEntry | null>(null);

  if (!currentUser) return null;
  const isAdmin = currentUser.role === 'Admin';

  // Data is already fetched by fetchAppData() in useStore.ts during app initialization

  // Extract unique modules from pre-fetched audit logs
  useEffect(() => {
    const unique = Array.from(new Set(auditLogs.map((r: any) => r.module))).sort();
    setModules(unique as string[]);
  }, [auditLogs]);

  // ── client-side filter ──────────────────────────────────────────────────────

  const filteredLogs = auditLogs.filter((log: any) => {
    // Non-admins only see their own logs; admins see all logs
    if (!isAdmin && currentUser?.user_id && log.user_id !== currentUser.user_id) {
      return false;
    }
    if (actionFilter !== 'all' && log.action !== actionFilter) {
      return false;
    }
    if (moduleFilter !== 'all' && log.module !== moduleFilter) {
      return false;
    }
    return true;
  });

  const visible = search.trim()
    ? filteredLogs.filter((l: any) => {
      const q = search.toLowerCase();
      const userName = l.user_id ? getUserName(l.user_id) : '';
      return (
        l.module.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        userName.toLowerCase().includes(q) ||
        (l.record_id ?? '').toLowerCase().includes(q) ||
        summarize(l).toLowerCase().includes(q)
      );
    })
    : filteredLogs;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Audit Log</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Complete record of all system actions' : 'Your recent activity'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs…"
              className="pl-9 w-48"
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                {isAdmin && <TableHead>User</TableHead>}
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="h-32 text-center text-muted-foreground">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setDetailLog(log)}
                  >
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="font-medium text-sm">
                        {log.user_id ? getUserName(log.user_id) : <span className="text-muted-foreground italic">system</span>}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className={actionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{log.module}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {summarize(log)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(log.old_value || log.new_value || log.record_id) && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 px-2 text-xs text-primary"
                          onClick={(e) => { e.stopPropagation(); setDetailLog(log); }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!detailLog} onOpenChange={(o) => !o && setDetailLog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-muted-foreground" />
              Audit Entry Detail
            </DialogTitle>
            <DialogDescription>
              {detailLog && (
                <span>
                  {detailLog.action} · {detailLog.module} · {formatDateTime(detailLog.timestamp)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {detailLog && (
            <div className="space-y-4 text-sm mt-2">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="font-medium">{detailLog.user_id ? getUserName(detailLog.user_id) : 'system'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Action</p>
                  <Badge variant="outline" className={actionColor(detailLog.action)}>
                    {detailLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Module</p>
                  <p className="font-medium">{detailLog.module}</p>
                </div>
                {detailLog.record_id && (
                  <div>
                    <p className="text-xs text-muted-foreground">Record ID</p>
                    <p className="font-mono text-xs truncate" title={detailLog.record_id}>
                      {detailLog.record_id}
                    </p>
                  </div>
                )}
              </div>

              {/* Changes */}
              {(detailLog.old_value || detailLog.new_value) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {detailLog.action === 'UPDATE' && detailLog.old_value && detailLog.new_value ? (
                      <>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Changes
                        </p>
                        <div className="rounded-lg border overflow-hidden text-xs">
                          <div className="grid grid-cols-3 bg-muted px-3 py-1.5 font-medium text-muted-foreground">
                            <span>Field</span>
                            <span>Before</span>
                            <span>After</span>
                          </div>
                          {Object.keys({ ...detailLog.old_value, ...detailLog.new_value }).map((key) => {
                            const before = detailLog.old_value?.[key];
                            const after = detailLog.new_value?.[key];
                            const changed = JSON.stringify(before) !== JSON.stringify(after);
                            return (
                              <div
                                key={key}
                                className={`grid grid-cols-3 px-3 py-1.5 border-t ${changed ? 'bg-amber-50/50' : ''}`}
                              >
                                <span className="font-medium">{key}</span>
                                <span className={`truncate ${changed ? 'text-red-600 line-through opacity-70' : 'text-muted-foreground'}`}>
                                  {before !== undefined ? String(before) : '—'}
                                </span>
                                <span className={`truncate ${changed ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>
                                  {after !== undefined ? String(after) : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {detailLog.action === 'CREATE' ? 'Created Data' : 'Deleted Data'}
                        </p>
                        <pre className="rounded-lg border bg-muted/50 p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(detailLog.new_value ?? detailLog.old_value, null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
