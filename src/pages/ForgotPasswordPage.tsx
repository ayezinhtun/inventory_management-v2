import React, { useState } from 'react';

import { supabase } from '../lib/supabase';

import logo from '../assets/image/logo.png';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';

import { Input } from '../components/ui/Input';

import { Button } from '../components/ui/Button';

import { Label } from '../components/ui/Label';

import { Alert, AlertDescription } from '../components/ui/Alert';

import { Loader2, Mail, ArrowLeft, AlertCircle } from 'lucide-react';

import { useStore } from '../store/useStore';



export function ForgotPasswordPage() {

  const { navigate } = useStore();

  

  const [email, setEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState('');

  const [sent, setSent] = useState(false);



  // Email validation

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());



  async function handleSubmit(e: React.FormEvent) {

    e.preventDefault();

    if (!isValidEmail) return;

    

    setIsLoading(true);

    setError('');

    

    try {

      // Use Supabase built-in password reset

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {

        redirectTo: `${window.location.origin}/password-recovery`,

      });

      

      if (resetError) throw resetError;

      

      setSent(true);

    } catch (err: any) {

      setError(err?.message || 'Failed to send reset email. Please try again.');

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

            {sent ? (

              <div className="text-center space-y-4 py-4">

                <div className="flex justify-center">

                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">

                    <Mail className="h-6 w-6 text-green-600" />

                  </div>

                </div>

                <CardTitle className="text-xl font-heading">Email Sent!</CardTitle>

                <p className="text-sm text-muted-foreground">

                  We've sent a password reset link to your email. Please check your inbox and click the link to reset your password.

                </p>

              </div>

            ) : (

              <>

                <CardHeader className="space-y-2 text-center mb-6 p-0">

                  <div className="flex justify-center mb-3">

                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">

                      <Mail className="h-6 w-6 text-primary" />

                    </div>

                  </div>

                  <CardTitle className="text-2xl font-heading">Forgot Password?</CardTitle>

                  <CardDescription>

                    Enter your email and we'll send you a password reset link

                  </CardDescription>

                </CardHeader>



                <form onSubmit={handleSubmit} className="space-y-4">

                  {error && (

                    <Alert variant="destructive" className="py-2">

                      <AlertCircle className="h-4 w-4" />

                      <AlertDescription className="ml-2">{error}</AlertDescription>

                    </Alert>

                  )}



                  <div className="space-y-2">

                    <Label htmlFor="email">Email Address</Label>

                    <Input

                      id="email"

                      type="email"

                      value={email}

                      onChange={(e) => setEmail(e.target.value)}

                      placeholder="you@example.com"

                      autoFocus

                      required

                    />

                  </div>



                  <Button 

                    type="submit" 

                    className="w-full" 

                    disabled={!isValidEmail || isLoading}

                  >

                    {isLoading ? (

                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>

                    ) : (

                      'Send Verification Code'

                    )}

                  </Button>



                  <Button

                    type="button"

                    variant="ghost"

                    className="w-full"

                    onClick={() => navigate('login')}

                  >

                    <ArrowLeft className="mr-2 h-4 w-4" />

                    Back to Login

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