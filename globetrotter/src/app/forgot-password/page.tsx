'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Please enter your email address.');
            return;
        }

        setLoading(true);
        const { error } = await resetPassword(email);
        setLoading(false);

        if (error) {
            setError('We could not send the reset email right now. Please try again shortly.');
        } else {
            setSuccess(true);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-dim px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-text">Reset your password</h1>
                    <p className="text-text-secondary mt-1">
                        Enter your email and we&apos;ll send you a reset link
                    </p>
                </div>

                <div className="card p-8">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-success-light rounded-full mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-text mb-2">Check your email</h3>
                            <p className="text-sm text-text-secondary mb-6">
                                We&apos;ve sent a password reset link to <span className="font-medium text-text">{email}</span>.
                                Click the link in the email to reset your password.
                            </p>
                            <Link href="/login" className="btn-primary inline-block">
                                Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && <div className="bg-danger-light text-danger text-sm px-4 py-3 rounded-lg">{error}</div>}

                            <div>
                                <label htmlFor="email" className="label">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="input-field"
                                    placeholder="you@example.com"
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-sm text-text-secondary mt-6">
                    Remember your password?{' '}
                    <Link href="/login" className="text-primary font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
