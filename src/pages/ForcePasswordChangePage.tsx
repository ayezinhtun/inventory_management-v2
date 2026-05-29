import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { validatePassword } from '../lib/utils';
import logo from '../assets/image/logo.png';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { ShieldAlert, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function ForcePasswordChangePage() {
  const { updatePassword, logout, isLoading, profile } = useAuthStore();

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) { toast.error('All fields are required'); return; }
    if (newPwd !== confirmPwd) { toast.error('New passwords do not match'); return; }
    const passwordValidation = validatePassword(newPwd);
    if (!passwordValidation.isValid) { toast.error(passwordValidation.error); return; }
    if (newPwd === currentPwd) { toast.error('New password must differ from the current one'); return; }
    try {
      await updatePassword(currentPwd, newPwd);
      toast.success('Password changed successfully');
      // profile.force_password_change is now false, App.tsx will re-render to main app
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password. Check your current password.');
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <img src={logo} alt="1CNG" className="w-40 object-contain" />
        </div>

        <Card className="border-amber-200 shadow-lg">
          <CardContent className="p-6">
            <CardHeader className="space-y-2 text-center mb-6 p-0">
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <ShieldAlert className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-heading">Password Change Required</CardTitle>
              <CardDescription>
                Your account requires a password change before you can continue.
                Enter your temporary password and choose a new one.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Temporary / Current Password</Label>
                <div className="relative">
                  <Input
                    id="current"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCurrent(!showCurrent)}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

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
                <Label htmlFor="confirm">Confirm New Password</Label>
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Changing Password…</>
                ) : (
                  'Set New Password'
                )}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => logout()}
              >
                Sign out instead
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
