import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { validatePassword } from '../lib/utils';
import logo from '../assets/image/logo.png';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { CheckCircle2, Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';

export function ResetPasswordPage() {
  const { navigate } = useStore();
  const { clearResetCode } = useAuthStore();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validation
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';
  const passwordValidation = validatePassword(newPassword);
  const canSubmit = passwordsMatch && passwordValidation.isValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    
    setIsLoading(true);
    
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (updateErr) throw updateErr;
      
      // Clear stored reset data
      clearResetCode();
      setSuccess(true);
      toast.success('Password reset successfully');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('login');
      }, 2000);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <img src={logo} alt="1CNG" className="w-40 object-contain mb-6" />
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardContent className="p-6">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-xl font-heading">Password Reset!</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your password has been updated. Redirecting to login...
                </p>
              </div>
            ) : (
              <>
                <CardHeader className="space-y-2 text-center mb-6 p-0">
                  <div className="flex justify-center mb-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Lock className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-heading">Set New Password</CardTitle>
                  <CardDescription>Create a strong password for your account</CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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
                    <p className="text-xs text-muted-foreground">
                      8+ chars, uppercase, lowercase, number, special char
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirm(!showConfirm)}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={!canSubmit || isLoading}
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
                    ) : (
                      'Update Password'
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