'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);
    const { updatePassword, session } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Supabase sets the session automatically when the user clicks the reset link
        // The URL contains hash fragments that Supabase client parses
        const timer = setTimeout(() => setReady(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!password || !confirmPassword) {
            setError('Please fill in both fields.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        const { error } = await updatePassword(password);
        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            setTimeout(() => router.push('/dashboard'), 2000);
        }
    };

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-dim">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-text-secondary text-sm">Verifying reset link...</p>
                </div>
            </div>
        );
    }

    if (!session && ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-dim px-4">
                <div className="w-full max-w-md text-center">
                    <div className="card p-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-danger-light rounded-full mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-text mb-2">Invalid or expired link</h3>
                        <p className="text-sm text-text-secondary mb-6">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <Link href="/forgot-password" className="btn-primary inline-block">
                            Request New Link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

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
                    <h1 className="text-2xl font-bold text-text">Set new password</h1>
                    <p className="text-text-secondary mt-1">Choose a strong password for your account</p>
                </div>

                <div className="card p-8">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-success-light rounded-full mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-text mb-2">Password updated!</h3>
                            <p className="text-sm text-text-secondary">
                                Redirecting you to the dashboard...
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-danger-light text-danger text-sm px-4 py-3 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="password" className="label">New Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="input-field"
                                    placeholder="Min 6 characters"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="label">Confirm New Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="input-field"
                                    placeholder="Re-enter password"
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
                                    'Update Password'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
