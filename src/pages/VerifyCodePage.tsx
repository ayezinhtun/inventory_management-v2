import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Loader2, KeyRound, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import logo from '../assets/image/logo.png';
import { useStore } from '../store/useStore';

export function VerifyCodePage() {
    const { navigate } = useStore();
    const { resetCode, resetEmail, clearResetCode } = useAuthStore();

    const [digits, setDigits] = useState(['', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Redirect if no code stored
    useEffect(() => {
        if (!resetCode || !resetEmail) {
            navigate('forgot-password');
        }
    }, [resetCode, resetEmail, navigate]);

    function handleDigitChange(index: number, value: string) {
        // Only allow numbers
        if (!/^\d*$/.test(value)) return;

        const newDigits = [...digits];
        newDigits[index] = value.slice(-1); // Only take last character
        setDigits(newDigits);

        // Auto-focus next input
        if (value && index < 4) {
            inputRefs.current[index + 1]?.focus();
        }
    }

    function handleKeyDown(index: number, e: React.KeyboardEvent) {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const enteredCode = digits.join('');
        if (enteredCode.length !== 5) return;

        setIsLoading(true);
        setError('');

        // Verify code
        if (enteredCode === resetCode) {
            // Code correct, navigate to reset password
            setTimeout(() => {
                navigate('reset-password');
                setIsLoading(false);
            }, 500);
        } else {
            setAttempts(prev => prev + 1);
            setError(`Invalid code. ${3 - attempts - 1} attempts remaining.`);
            setIsLoading(false);

            // Clear inputs on wrong code
            setDigits(['', '', '', '', '']);
            inputRefs.current[0]?.focus();

            // Max attempts reached
            if (attempts >= 2) {
                clearResetCode();
                setTimeout(() => {
                    navigate('forgot-password');
                }, 1500);
            }
        }
    }

    const isComplete = digits.every(d => d !== '');

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center justify-center text-center">
                    <img src={logo} alt="1CNG" className="w-40 object-contain mb-6" />
                </div>

                <Card className="border-border/50 shadow-lg">
                    <CardContent className="p-6">
                        <CardHeader className="space-y-2 text-center mb-6 p-0">
                            <div className="flex justify-center mb-3">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <KeyRound className="h-6 w-6 text-primary" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-heading">Verify Code</CardTitle>
                            <CardDescription>
                                Enter the 5-digit code sent to {resetEmail}
                            </CardDescription>
                        </CardHeader>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <Alert variant="destructive" className="py-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="ml-2">{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label>5-Digit Verification Code</Label>
                                <div className="flex justify-center gap-2">
                                    {digits.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={el => inputRefs.current[index] = el}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleDigitChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-14 h-14 text-center text-2xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    ))}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={!isComplete || isLoading}
                            >
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
                                ) : (
                                    'Verify Code'
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full"
                                onClick={() => {
                                    clearResetCode();
                                    navigate('forgot-password');
                                }}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Send New Code
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}