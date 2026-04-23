/**
 * Centralized audit log writer.
 *
 * Writes a single row to public.audit_logs.  Always fire-and-forget:
 * any DB error is silently swallowed so it can never crash a main operation.
 *
 * Usage:
 *   import { auditLog } from '../lib/auditLog';
 *   auditLog({ action: 'CREATE', module: 'Regions', record_id: region.id, new_value: region });
 */

import { supabase } from './supabase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any> | null | undefined;

interface AuditParams {
  action: AuditAction;
  module: string;
  record_id?: string | null;
  old_value?: JsonObject;
  new_value?: JsonObject;
}

export function auditLog(params: AuditParams): void {
  // Fire-and-forget — never awaited by the caller
  (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await supabase.from('audit_logs').insert({
        user_id:    session.user.id,
        action:     params.action,
        module:     params.module,
        record_id:  params.record_id  ?? null,
        old_value:  params.old_value  ?? null,
        new_value:  params.new_value  ?? null,
        ip_address: '—',
      });
    } catch {
      // Silent — audit log must never break the main operation
    }
  })();
}
