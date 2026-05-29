import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { useRegionStore } from '../store/useRegionStore';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { validatePassword } from '../lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import { Avatar, AvatarFallback } from '../components/ui/Avatar';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Separator } from '../components/ui/Separator';
import { getInitials } from '../lib/utils';
import { toast } from 'sonner';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  MapPin,
  Warehouse,
  AlertTriangle,
  QrCode,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

type TwoFAStep = 'idle' | 'enrolling' | 'verifying';

export function SettingsPage() {
  const { currentUser } = useStore();
  const {
    profile,
    mfaFactors,
    isLoading,
    updateProfile,
    updatePassword,
    deactivateAccount,
    enrollTOTP,
    verifyTOTP,
    unenrollTOTP,
  } = useAuthStore();
  const { regions, fetchRegions } = useRegionStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();

  // ── Profile form ──────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  // Sync form fields when profile loads (avoids stale initial state)
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setUsername(profile.username || '');
    }
  }, [profile?.user_id]);

  // Load region/warehouse data for label display
  // Data is already fetched by fetchAppData() in useStore.ts during app initialization

  const [profileSaving, setProfileSaving] = useState(false);

  // ── Password form ─────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  // ── 2FA ───────────────────────────────────────────────────────────────────
  const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>('idle');
  const [totpEnrollData, setTotpEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
    uri: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpSaving, setTotpSaving] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  // ── Danger zone ───────────────────────────────────────────────────────────
  const [deactivateConfirm, setDeactivateConfirm] = useState('');
  const [deactivateSaving, setDeactivateSaving] = useState(false);

  if (!currentUser) return null;

  const activeTOTP = mfaFactors.find((f) => f.status === 'verified');
  const regionLabel = currentUser.assigned_region_id
    ? (regions.find((r) => r.id === currentUser.assigned_region_id)?.name ?? currentUser.assigned_region_id)
    : 'All Regions';
  const warehouseLabel = currentUser.assigned_warehouse_id
    ? (warehouses.find((w) => w.id === currentUser.assigned_warehouse_id)?.name ?? currentUser.assigned_warehouse_id)
    : 'All Warehouses';

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (!profile) { toast.error('Profile not loaded yet, please wait'); return; }
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    setProfileSaving(true);
    try {
      const updates: { name?: string; username?: string } = { name: name.trim() };
      if (username.trim()) updates.username = username.trim();
      await updateProfile(updates);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleUpdatePassword() {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error('All password fields are required');
      return;
    }
    if (newPwd !== confirmPwd) { toast.error('New passwords do not match'); return; }
    const passwordValidation = validatePassword(newPwd);
    if (!passwordValidation.isValid) { toast.error(passwordValidation.error); return; }
    setPwdSaving(true);
    try {
      await updatePassword(currentPwd, newPwd);
      toast.success('Password updated');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password');
    } finally {
      setPwdSaving(false);
    }
  }

  async function handleEnrollTOTP() {
    setTotpSaving(true);
    try {
      const data = await enrollTOTP();
      setTotpEnrollData(data);
      setTwoFAStep('verifying');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start 2FA enrollment');
    } finally {
      setTotpSaving(false);
    }
  }

  async function handleVerifyTOTP() {
    if (!totpEnrollData) return;
    if (totpCode.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setTotpSaving(true);
    try {
      await verifyTOTP(totpEnrollData.factorId, totpCode);
      toast.success('Two-factor authentication enabled');
      setTwoFAStep('idle');
      setTotpEnrollData(null);
      setTotpCode('');
    } catch (err: any) {
      toast.error(err?.message || 'Invalid code. Try again.');
    } finally {
      setTotpSaving(false);
    }
  }

  async function handleUnenrollTOTP() {
    if (!activeTOTP) return;
    setTotpSaving(true);
    try {
      await unenrollTOTP(activeTOTP.id);
      toast.success('Two-factor authentication disabled');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to disable 2FA');
    } finally {
      setTotpSaving(false);
    }
  }

  function handleCopySecret() {
    if (!totpEnrollData) return;
    navigator.clipboard.writeText(totpEnrollData.secret).then(() => {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    });
  }

  async function handleDeactivate() {
    setDeactivateSaving(true);
    try {
      await deactivateAccount();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deactivate account');
      setDeactivateSaving(false);
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and security</p>
      </div>

      {/* ── Profile ── */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name and username</CardDescription>
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
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              <Badge className="mt-1" variant="secondary">{currentUser.role}</Badge>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveProfile} disabled={profileSaving || isLoading || !profile}>
            {profileSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>

      {/* ── Assigned Locations (read-only) ── */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Locations</CardTitle>
          <CardDescription>Your region and warehouse assignment — contact Admin to change</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
              <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Region</p>
                <p className="font-medium">{regionLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
              <Warehouse className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Warehouse</p>
                <p className="font-medium">{warehouseLabel}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Password ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Change Password
          </CardTitle>
          <CardDescription>Re-enter your current password to update</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pwd">Current Password</Label>
            <div className="relative">
              <Input
                id="current-pwd"
                type={showCurrentPwd ? 'text' : 'password'}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                tabIndex={-1}
              >
                {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pwd">New Password</Label>
            <div className="relative">
              <Input
                id="new-pwd"
                type={showNewPwd ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewPwd(!showNewPwd)}
                tabIndex={-1}
              >
                {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">8+ chars, uppercase, lowercase, number, special char</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pwd">Confirm New Password</Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" onClick={handleUpdatePassword} disabled={pwdSaving || isLoading}>
            {pwdSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</> : 'Update Password'}
          </Button>
        </CardFooter>
      </Card>

      {/* ── Two-Factor Authentication ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {activeTOTP ? (
              <ShieldCheck className="h-4 w-4 text-green-500" />
            ) : (
              <Shield className="h-4 w-4 text-muted-foreground" />
            )}
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using an authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTOTP ? (
            /* ── 2FA Enabled ── */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50/50 dark:bg-green-950/20">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">2FA is active</p>
                  <p className="text-xs text-muted-foreground">
                    Enrolled {new Date(activeTOTP.created_at).toLocaleDateString()}
                    {activeTOTP.friendly_name ? ` — ${activeTOTP.friendly_name}` : ''}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300">
                  Enabled
                </Badge>
              </div>
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={handleUnenrollTOTP}
                disabled={totpSaving}
              >
                {totpSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Disabling…</>
                ) : (
                  <><ShieldOff className="mr-2 h-4 w-4" />Disable 2FA</>
                )}
              </Button>
            </div>
          ) : twoFAStep === 'idle' ? (
            /* ── 2FA Disabled ── */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">2FA is not enabled</p>
                  <p className="text-xs text-muted-foreground">
                    Protect your account with Google Authenticator or any TOTP app
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto">Disabled</Badge>
              </div>
              <Button onClick={handleEnrollTOTP} disabled={totpSaving}>
                {totpSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting…</>
                ) : (
                  <><QrCode className="mr-2 h-4 w-4" />Enable 2FA</>
                )}
              </Button>
            </div>
          ) : (
            /* ── Verify step ── */
            <div className="space-y-6">
              <Alert className="border-primary/20 bg-primary/5">
                <AlertDescription>
                  Scan the QR code with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code below.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* QR Code */}
                {totpEnrollData?.qrCode && (
                  <div className="flex-shrink-0">
                    <div className="p-3 border rounded-lg bg-white inline-block">
                      <img
                        src={totpEnrollData.qrCode}
                        alt="2FA QR Code"
                        className="w-40 h-40 block"
                      />
                    </div>
                  </div>
                )}

                <div className="flex-1 space-y-4">
                  {/* Manual secret */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Can't scan? Enter this key manually
                    </Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 text-xs bg-muted rounded border font-mono break-all">
                        {totpEnrollData?.secret}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={handleCopySecret}
                      >
                        {secretCopied ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Verification code */}
                  <div className="space-y-2">
                    <Label htmlFor="totp-code">Verification Code</Label>
                    <Input
                      id="totp-code"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="font-mono text-lg tracking-widest w-40"
                      autoComplete="one-time-code"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleVerifyTOTP} disabled={totpSaving || totpCode.length !== 6}>
                      {totpSaving ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</>
                      ) : (
                        'Verify & Enable'
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setTwoFAStep('idle');
                        setTotpEnrollData(null);
                        setTotpCode('');
                      }}
                      disabled={totpSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Danger Zone (Admin only) ── */}
      {currentUser.role === 'Admin' && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions — proceed with caution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-3">
              <div>
                <p className="font-medium text-sm">Deactivate Account</p>
                <p className="text-xs text-muted-foreground">
                  Your account will be marked inactive and you will be signed out immediately.
                  Another Admin must reactivate it.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deactivate-confirm" className="text-xs text-muted-foreground">
                  Type <strong>DEACTIVATE</strong> to confirm
                </Label>
                <Input
                  id="deactivate-confirm"
                  value={deactivateConfirm}
                  onChange={(e) => setDeactivateConfirm(e.target.value)}
                  placeholder="DEACTIVATE"
                  className="max-w-xs border-destructive/40 focus-visible:ring-destructive/40"
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeactivate}
                disabled={deactivateConfirm !== 'DEACTIVATE' || deactivateSaving}
              >
                {deactivateSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deactivating…</>
                ) : (
                  'Deactivate My Account'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
