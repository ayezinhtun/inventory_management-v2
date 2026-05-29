import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useStore } from '../store/useStore';
import logo from '../assets/image/logo.png';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Separator } from '../components/ui/Separator';
import { AlertCircle, Loader2, Mail, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Inline Google icon (no extra dependency needed)
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginPage() {
  const { login, signInWithGoogle, completeMFALogin, mfaRequired, isLoading } = useAuthStore();
  const { navigate } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailUnconfirmed, setEmailUnconfirmed] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // TOTP step
  const [totpCode, setTotpCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailUnconfirmed(false);
    try {
      await login(email, password);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setEmailUnconfirmed(true);
      } else if (
        msg.toLowerCase().includes('invalid login') ||
        msg.toLowerCase().includes('invalid credentials')
      ) {
        toast.error('Invalid email or password.');
      } else {
        toast.error(msg || 'Sign in failed. Please try again.');
      }
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await completeMFALogin(totpCode);
    } catch (err: any) {
      toast.error(err?.message || 'Invalid code. Please try again.');
      setTotpCode('');
    }
  };

  // const handleForgotPassword = async () => {
  //   if (!email.trim()) { setError('Enter your email address first'); return; }
  //   setForgotLoading(true);
  //   setError('');
  //   try {
  //     // Step 1: Invalidate the old password via Edge Function (fire-and-forget — don't reveal if email exists)
  //     await supabase.functions.invoke('admin-user-actions', {
  //       body: { action: 'forgot_password', email: email.trim() },
  //     }).catch(() => { }); // Silent — user doesn't know if email exists

  //     // Step 2: Send Supabase's built-in password reset email
  //     const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
  //       redirectTo: `${window.location.origin}`,
  //     });
  //     if (error) throw error;
  //     setForgotSent(true);
  //   } catch (err: any) {
  //     setError(err?.message || 'Failed to send reset email');
  //   } finally {
  //     setForgotLoading(false);
  //   }
  // };

  const handleGoogleSSO = async () => {
    setSsoLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err?.message || 'Google sign-in failed. Please try again.');
      setSsoLoading(false);
    }
  };

  // ── TOTP screen ──────────────────────────────────────────────────────────
  if (mfaRequired) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center justify-center text-center">
            <img src={logo} alt="1CNG" className="w-40 object-contain" />
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardContent className="p-6">
              <CardHeader className="space-y-1 text-center mb-6 p-0">
                <div className="flex justify-center mb-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-heading">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleVerifyMFA} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="totp">Authentication Code</Label>
                  <Input
                    id="totp"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="font-mono text-2xl tracking-[0.4em] text-center h-14"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || totpCode.length !== 6}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</>
                  ) : (
                    'Verify'
                  )}
                </Button>

                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    // Reset mfaRequired state by clearing the auth session partially — go back to login
                    useAuthStore.setState({ mfaRequired: false });
                    setTotpCode('');
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Normal login screen ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <img src={logo} alt="1CNG" className="w-40 object-contain" />
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardContent className="p-6">
            <CardHeader className="space-y-1 text-center mb-6 p-0">
              <CardTitle className="text-2xl font-heading">Sign in</CardTitle>
              <CardDescription>
                Enter your credentials to access the system
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              {/* Google SSO */}
              {/* <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2"
                onClick={handleGoogleSSO}
                disabled={isLoading || ssoLoading}
              >
                {ssoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </Button>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div> */}

              {/* Email confirmation notice */}
              {emailUnconfirmed && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                  <Mail className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="ml-2">
                    Please confirm your email address first. Check your inbox for
                    the confirmation link.
                  </AlertDescription>
                </Alert>
              )}

              {/* Forgot password success */}
              {forgotSent && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="ml-2">
                    Password reset link sent. Check your inbox.
                  </AlertDescription>
                </Alert>
              )}

              {/* Email / password form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || ssoLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => navigate('signup')}
                  >
                    Sign up
                  </button>
                </p>

                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    console.log('Forgot password clicked');
                    navigate('forgot-password');
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
