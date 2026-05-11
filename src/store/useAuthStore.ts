import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  username?: string | null;
  assigned_region_ids?: string[];
  assigned_warehouse_ids?: string[];
  status: string;
  force_password_change?: boolean;
  last_login_at?: string | null;
  last_seen_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MFAFactor {
  id: string;
  status: "verified" | "unverified";
  friendly_name: string | null;
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  mfaFactors: MFAFactor[];
  isLoading: boolean;
  isInitializing: boolean;
  mfaRequired: boolean;
  isPasswordRecovery: boolean; // true when user clicked a password-reset email link
  resetCode: string | null;
  resetEmail: string | null;

  initializeAuth: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  completeMFALogin: (code: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<UserProfile | null>;
  clearPasswordRecovery: () => void;
  setResetCode: (code: string, email: string) => void;
  clearResetCode: () => void;

  // Profile self-service
  updateProfile: (updates: { name?: string; username?: string }) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deactivateAccount: () => Promise<void>;

  // 2FA / TOTP
  enrollTOTP: () => Promise<{ factorId: string; qrCode: string; secret: string; uri: string }>;
  verifyTOTP: (factorId: string, code: string) => Promise<void>;
  unenrollTOTP: (factorId: string) => Promise<void>;
  refreshMFAFactors: () => Promise<void>;

}

// ─── Session expiry (1 hour hard limit) ───────────────────────────────────
const SESSION_DURATION_MS = 60 * 60 * 1000;
const SESSION_START_KEY = "ims-session-start";
let sessionExpiryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSessionExpiry(logoutFn: () => Promise<void>, durationMs: number) {
  if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer);
  sessionExpiryTimer = setTimeout(async () => {
    await logoutFn();
  }, Math.max(durationMs, 0));
}

function clearSessionExpiry() {
  if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer);
  sessionExpiryTimer = null;
  localStorage.removeItem(SESSION_START_KEY);
}

function recordSessionStart() {
  localStorage.setItem(SESSION_START_KEY, Date.now().toString());
}

// ─── Online presence heartbeat ────────────────────────────────────────────
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

async function updatePresence(userId: string) {
  try {
    await supabase.from('user_profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('user_id', userId);
  } catch {
    // ignore — heartbeat failures are non-critical
  }
}

function startHeartbeat(userId: string) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  updatePresence(userId);
  heartbeatTimer = setInterval(() => updatePresence(userId), 2 * 60 * 1000);
  document.addEventListener('visibilitychange', function onVisible() {
    if (!document.hidden) updatePresence(userId);
  }, { once: false });
}

function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

// ─── Bridge to useStore ───────────────────────────────────────────────────
// Dynamic import avoids circular dependency.
const SESSION_PAGE_KEY = "ims-current-page";

async function syncToAppStore(profile: UserProfile | null, isPasswordRecovery: boolean = false) {
  const { useStore } = await import("./useStore");
  if (profile) {
    // Fetch user assignments from user_regions and user_warehouses tables
    const [regionsRes, warehousesRes] = await Promise.all([
      supabase.from('user_regions').select('region_id').eq('user_id', profile.user_id),
      supabase.from('user_warehouses').select('warehouse_id').eq('user_id', profile.user_id),
    ]);

    const assigned_region_ids = (regionsRes.data ?? []).map(r => r.region_id);
    const assigned_warehouse_ids = (warehousesRes.data ?? []).map(w => w.warehouse_id);

    const currentPage = useStore.getState().currentPage;
    const shouldNavigate = currentPage === "login" || currentPage === "signup";
    const savedPage = sessionStorage.getItem(SESSION_PAGE_KEY) as any | null;
    const savedSelectedId = sessionStorage.getItem('ims-selected-id');

    useStore.setState({
      isAuthenticated: true,
      currentUser: {
        id: profile.user_id,
        username: profile.username || profile.email,
        email: profile.email,
        password_hash: "",
        full_name: profile.name,
        role: profile.role as any,
        assigned_region_ids,      //using arrays from assignments
        assigned_warehouse_ids,   //using arrays from assignments
        is_active: profile.status === "active",
        last_login: profile.last_login_at ?? null,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      // Only navigate if not in password recovery mode
      ...(shouldNavigate && !isPasswordRecovery ? { 
        currentPage: savedPage || "dashboard",
        selectedId: savedSelectedId
      } : {
        selectedId: savedSelectedId
      }),
    });
    await useStore.getState().fetchAppData();
  } else {
    sessionStorage.removeItem(SESSION_PAGE_KEY);
    sessionStorage.removeItem('ims-selected-id');
    useStore.setState({
      isAuthenticated: false,
      currentUser: null,
      currentPage: "login",
      selectedId: null,
    });
  }
}

// ─── Audit helper ─────────────────────────────────────────────────────────
async function writeAuditLog(
  userId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  module: string,
  recordId: string,
  oldValue: Record<string, any> | null,
  newValue: Record<string, any> | null
) {
  const { useStore } = await import("./useStore");
  useStore.getState().addAuditLog({
    user_id: userId,
    action,
    module,
    record_id: recordId,
    old_value: oldValue,
    new_value: newValue,
    ip_address: "—",
  });
}

// ─── Store ────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  mfaFactors: [],
  isLoading: false,
  isInitializing: true,
  mfaRequired: false,
  isPasswordRecovery: false,
  resetCode: null,
  resetEmail: null,

  initializeAuth: async () => {
    set({ isInitializing: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Check if this is a password recovery flow (URL contains /password-recovery)
      const isPasswordRecoveryFlow = window.location.pathname === '/password-recovery';
      if (isPasswordRecoveryFlow) {
        set({ isPasswordRecovery: true });
      }

      if (session?.user) {
        // Enforce 1-hour session limit
        const storedStart = parseInt(localStorage.getItem(SESSION_START_KEY) || "0");
        if (storedStart) {
          const elapsed = Date.now() - storedStart;
          if (elapsed >= SESSION_DURATION_MS) {
            await supabase.auth.signOut();
            set({ isInitializing: false });
            return;
          }
          scheduleSessionExpiry(get().logout, SESSION_DURATION_MS - elapsed);
        }

        set({ user: session.user, session });
        const profile = await get().fetchProfile();
        await syncToAppStore(profile, get().isPasswordRecovery);
        await get().refreshMFAFactors();
        startHeartbeat(session.user.id);

        // Real-time: re-sync when this user's own profile changes (role, region, warehouse)
        // This makes the sidebar react immediately when an admin changes the user's role.
        supabase
          .channel(`profile-${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_profiles',
              filter: `user_id=eq.${session.user.id}`,
            },
            async () => {
              const fresh = await get().fetchProfile();
              await syncToAppStore(fresh, get().isPasswordRecovery);
            }
          )
          .subscribe();
      }
    } finally {
      set({ isInitializing: false });
    }

    // Persistent listener for token refresh / OAuth callbacks / sign-out
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        set({ isPasswordRecovery: true });
        // Don't return - let it process the session that comes with password recovery
      }

      if (session?.user) {
        set({ user: session.user, session });
        if (event === "SIGNED_IN") {
          const profile = await get().fetchProfile();
          await syncToAppStore(profile, get().isPasswordRecovery);
          await get().refreshMFAFactors();
          startHeartbeat(session.user.id);
          (async () => {
            await supabase.from("user_activity_logs").insert({
              user_id: session.user.id,
              actor_id: session.user.id,
              action: "LOGIN",
              details: { method: "oauth" },
            });
          })().catch(() => { });
        } else if (event === "TOKEN_REFRESHED") {
          const profile = await get().fetchProfile();
          await syncToAppStore(profile, get().isPasswordRecovery);
        }
      } else if (event === "SIGNED_OUT") {
        stopHeartbeat();
        set({ user: null, session: null, profile: null, mfaFactors: [], mfaRequired: false, isPasswordRecovery: false });
        await syncToAppStore(null);
      }
    });
  },

  setResetCode: (code, email) => {
    set({ resetCode: code, resetEmail: email });
  },

  clearResetCode: () => {
    set({ resetCode: null, resetEmail: null });
  },

  signup: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      set({ user: data.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, mfaRequired: false });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      set({ user: data.user, session: data.session });

      // Check if MFA step is needed
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
        set({ isLoading: false, mfaRequired: true });
        return;
      }

      // No MFA required — complete login
      recordSessionStart();
      scheduleSessionExpiry(get().logout, SESSION_DURATION_MS);

      await supabase.from("user_profiles").update({ last_login_at: new Date().toISOString() }).eq("user_id", data.user.id);

      const profile = await get().fetchProfile();
      await syncToAppStore(profile, false);
      await get().refreshMFAFactors();
      startHeartbeat(data.user.id);
      (async () => {
        await supabase.from("user_activity_logs").insert({
          user_id: data.user.id,
          actor_id: data.user.id,
          action: "LOGIN",
          details: { method: "password" },
        });
      })().catch(() => { });
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  completeMFALogin: async (code) => {
    set({ isLoading: true });
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (!totpFactor) throw new Error("No TOTP factor found.");

      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (cErr) throw cErr;

      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      });
      if (vErr) throw vErr;

      set({ mfaRequired: false });

      recordSessionStart();
      scheduleSessionExpiry(get().logout, SESSION_DURATION_MS);

      const userId = get().user?.id;
      if (userId) {
        await supabase.from("user_profiles").update({ last_login_at: new Date().toISOString() }).eq("user_id", userId);
      }

      const profile = await get().fetchProfile();
      await syncToAppStore(profile, false);
      await get().refreshMFAFactors();
      const uid = get().user?.id;
      if (uid) {
        startHeartbeat(uid);
        (async () => {
          await supabase.from("user_activity_logs").insert({
            user_id: uid,
            actor_id: uid,
            action: "LOGIN",
            details: { method: "totp_mfa" },
          });
        })().catch(() => { });
      }
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) throw error;
    // Session start is recorded in onAuthStateChange → SIGNED_IN
  },

  clearPasswordRecovery: () => {
    set({ isPasswordRecovery: false });
  },

  logout: async () => {
    stopHeartbeat();
    clearSessionExpiry();
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null, mfaFactors: [], mfaRequired: false, isPasswordRecovery: false, isLoading: false });
      await syncToAppStore(null);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  fetchProfile: async () => {
    const userId = get().user?.id;
    if (!userId) { set({ profile: null }); return null; }
    try {
      const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single();
      if (error) throw error;
      set({ profile: data });
      return data as UserProfile;
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      set({ profile: null });
      return null;
    }
  },

  // ── Profile self-service ──────────────────────────────────────────────

  updateProfile: async (updates) => {
    const profile = get().profile;
    if (!profile) throw new Error("Not authenticated");
    set({ isLoading: true });
    try {
      const { error } = await supabase.from("user_profiles").update({ ...updates, updated_at: new Date().toISOString() }).eq("user_id", profile.user_id);
      if (error) throw error;

      const fresh = await get().fetchProfile();
      await syncToAppStore(fresh, get().isPasswordRecovery);

      await writeAuditLog(profile.user_id, "UPDATE", "Settings — Profile", profile.user_id,
        { name: profile.name, username: profile.username ?? null },
        updates
      );
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    const profile = get().profile;
    if (!profile) throw new Error("Not authenticated");
    // Use email from profile; fall back to the auth user's email
    const email = profile.email || get().user?.email || '';
    if (!email) throw new Error("Cannot determine account email. Please contact an administrator.");
    set({ isLoading: true });
    try {
      // Re-authenticate to verify current password
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (authErr) throw new Error("Current password is incorrect.");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Clear force_password_change if it was set (admin-created or admin-reset account)
      if (profile.force_password_change) {
        await supabase.from("user_profiles")
          .update({ force_password_change: false, updated_at: new Date().toISOString() })
          .eq("user_id", profile.user_id);
        const fresh = await get().fetchProfile();
        await syncToAppStore(fresh, get().isPasswordRecovery);
      }

      await writeAuditLog(profile.user_id, "UPDATE", "Settings — Password", profile.user_id, null, { changed: true });
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  deactivateAccount: async () => {
    const profile = get().profile;
    if (!profile) throw new Error("Not authenticated");
    set({ isLoading: true });
    try {
      const { error } = await supabase.from("user_profiles").update({ status: "inactive", updated_at: new Date().toISOString() }).eq("user_id", profile.user_id);
      if (error) throw error;

      await writeAuditLog(profile.user_id, "UPDATE", "Settings — Account", profile.user_id, { status: "active" }, { status: "inactive" });
      await get().logout();
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── 2FA / TOTP ────────────────────────────────────────────────────────

  enrollTOTP: async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator App",
    });
    if (error) throw error;
    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  },

  verifyTOTP: async (factorId, code) => {
    const profile = get().profile;
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
    if (cErr) throw cErr;

    const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (vErr) throw vErr;

    await get().refreshMFAFactors();
    if (profile) await writeAuditLog(profile.user_id, "UPDATE", "Settings — 2FA", profile.user_id, { mfa: "disabled" }, { mfa: "enabled" });
  },

  unenrollTOTP: async (factorId) => {
    const profile = get().profile;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;

    await get().refreshMFAFactors();
    if (profile) await writeAuditLog(profile.user_id, "UPDATE", "Settings — 2FA", profile.user_id, { mfa: "enabled" }, { mfa: "disabled" });
  },

  refreshMFAFactors: async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = (data?.totp ?? []).map((f: any) => ({
      id: f.id,
      status: f.status,
      friendly_name: f.friendly_name ?? null,
      created_at: f.created_at,
    }));
    set({ mfaFactors: totp });
  },
}));
