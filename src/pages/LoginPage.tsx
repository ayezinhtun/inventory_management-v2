import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import logo from '../assets/image/logo.png'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from
  '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Server, AlertCircle, Loader2 } from 'lucide-react';
import {toast} from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

export function LoginPage() {
  const {navigate} = useStore();

  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);


    try {
      await login(email, password);
      toast.success('Login successful');
      navigate('dashboard');
    } catch (error: any) {
      setError(error.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div>
            <img src={logo} alt="" className='w-40 object-contain' />
          </div>
        </div>

        <Card className="border-border/50 shadow-lg" >
          <CardContent className="p-6">
            <CardHeader className="space-y-1 text-center mb-6">
              <CardTitle className="text-2xl font-heading">Sign in</CardTitle>
              <CardDescription>
                Enter your credentials to access the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error &&
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2">{error}</AlertDescription>
                  </Alert>
                }

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required />

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
                    required />

                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ?
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </> :

                    'Sign in'
                  }
                </Button>
              </form>

              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button onClick={() => navigate('signup')} className="text-blue-600 hover:underline">
                    Sign Up
                  </button>
                </p>
              </div>
            </CardContent>
          </CardContent>
          {/* <CardFooter className="flex flex-col items-start border-t bg-muted/20 px-6 py-4 mt-2">
            <p className="text-sm font-medium mb-2 text-foreground">
              Demo Credentials:
            </p>
            <div className="text-xs text-muted-foreground space-y-1.5 w-full">
              <div className="flex justify-between items-center bg-background p-2 rounded border border-border/50">
                <span className="font-medium text-foreground">Admin:</span>
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  admin / admin123
                </code>
              </div>
              <div className="flex justify-between items-center bg-background p-2 rounded border border-border/50">
                <span className="font-medium text-foreground">PM:</span>
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  pm_yangon / pm123
                </code>
              </div>
              <div className="flex justify-between items-center bg-background p-2 rounded border border-border/50">
                <span className="font-medium text-foreground">Engineer:</span>
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  eng_kaung / eng123
                </code>
              </div>
            </div>
          </CardFooter> */}
        </Card>
      </div>
    </div>);

}