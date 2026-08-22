'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            if (!authLoading && !user) router.replace('/login');
            if (user) {
                setName(user.user_metadata?.display_name || '');
                setEmail(user.email || '');
            }
        };
        void loadProfile();
    }, [authLoading, user, router]);

    const saveProfile = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setMessage(null);
        const { error } = await supabase.auth.updateUser({
            email: email.trim(),
            data: { display_name: name.trim() },
        });
        setSaving(false);
        setMessage(error ? { text: error.message, error: true } : { text: 'Profile updated. Check your inbox if email confirmation is required.', error: false });
    };

    const sendPasswordReset = async () => {
        if (!user?.email) return;
        setMessage(null);
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/profile` });
        setMessage(error ? { text: error.message, error: true } : { text: 'Password reset instructions sent to your email.', error: false });
    };

    if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center bg-surface-dim"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    return <div className="min-h-screen bg-surface-dim"><Navbar /><main className="page-container"><div className="max-w-xl mx-auto"><h1 className="page-title mb-2">Profile & Settings</h1><p className="text-text-secondary mb-8">Manage your account details and sign-in security.</p>{message && <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${message.error ? 'bg-danger-light text-danger' : 'bg-success-light text-green-700'}`} role={message.error ? 'alert' : 'status'}>{message.text}</div>}<div className="card p-6 sm:p-8"><form onSubmit={saveProfile} className="space-y-5"><div><label htmlFor="display-name" className="label">Display name</label><input id="display-name" value={name} onChange={event => setName(event.target.value)} className="input-field" placeholder="Your name" /></div><div><label htmlFor="email" className="label">Email address</label><input id="email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="input-field" /></div><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save changes'}</button></form><div className="mt-8 pt-6 border-t border-border-light"><h2 className="section-title mb-1">Password</h2><p className="text-sm text-text-secondary mb-4">Receive a secure link to choose a new password.</p><button onClick={sendPasswordReset} className="btn-outline">Send password reset email</button></div></div></div></main></div>;
}