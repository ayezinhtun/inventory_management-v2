import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { validatePassword } from '../lib/utils';
import logo from '../assets/image/logo.png';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { CheckCircle2, Loader2, Eye, EyeOff, AlertCircle, KeyRound } from 'lucide-react';

export function PasswordRecoveryPage() {
  const { clearPasswordRecovery } = useAuthStore();

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!newPwd || !confirmPwd) { setError('Both fields are required'); return; }
    if (newPwd !== confirmPwd) { setError('Passwords do not match'); return; }
    const passwordValidation = validatePassword(newPwd);
    if (!passwordValidation.isValid) { setError(passwordValidation.error); return; }

    setIsLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPwd });
      if (updateErr) throw updateErr;
      setDone(true);
      // Sign out and return to login after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        clearPasswordRecovery();
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <img src={logo} alt="1CNG" className="w-40 object-contain" />
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardContent className="p-6">
            {done ? (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-heading">Password Reset!</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your password has been updated. Redirecting to sign in…
                </p>
              </div>
            ) : (
              <>
                <CardHeader className="space-y-2 text-center mb-6 p-0">
                  <div className="flex justify-center mb-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <KeyRound className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-heading">Set New Password</CardTitle>
                  <CardDescription>Choose a strong password for your account</CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="ml-2">{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="new">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new"
                        type={showNew ? 'text' : 'password'}
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                        autoFocus
                        required
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNew(!showNew)}
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">8+ chars, uppercase, lowercase, number, special char</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
