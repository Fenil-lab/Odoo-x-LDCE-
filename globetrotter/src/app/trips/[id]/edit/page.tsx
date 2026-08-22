'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { Trip } from '@/lib/types';

export default function EditTripPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const tripId = params.id as string;

    const [trip, setTrip] = useState<Trip | null>(null);
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [user, authLoading, router]);

    const fetchTrip = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from('trips').select('*').eq('id', tripId).single();
        if (data) {
            setTrip(data);
            setName(data.name);
            setStartDate(data.start_date);
            setEndDate(data.end_date);
            setDescription(data.description || '');
        }
        setLoading(false);
    }, [user, tripId]);

    useEffect(() => {
        if (!user) return;
        const loadTrip = async () => { await fetchTrip(); };
        void loadTrip();
    }, [user, fetchTrip]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) { setError('Please enter a trip name.'); return; }
        if (!startDate || !endDate) { setError('Please select dates.'); return; }
        if (new Date(endDate) < new Date(startDate)) { setError('End date must be after start date.'); return; }

        setSaving(true);
        const { error: dbError } = await supabase
            .from('trips')
            .update({ name: name.trim(), start_date: startDate, end_date: endDate, description: description.trim() })
            .eq('id', tripId);

        if (dbError) { setError(dbError.message); setSaving(false); return; }
        router.push(`/trips/${tripId}`);
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-surface-dim">
                <Navbar />
                <div className="page-container flex items-center justify-center min-h-[60vh]">
                    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="min-h-screen bg-surface-dim">
                <Navbar />
                <div className="page-container text-center py-20">
                    <h2 className="text-xl font-semibold text-text">Trip not found</h2>
                    <button onClick={() => router.push('/trips')} className="btn-primary mt-4">Back to Trips</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-dim">
            <Navbar />
            <main className="page-container">
                <div className="max-w-xl mx-auto">
                    <h1 className="page-title mb-2">Edit Trip</h1>
                    <p className="text-text-secondary mb-8">Update your trip details below.</p>

                    <div className="card p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && <div className="bg-danger-light text-danger text-sm px-4 py-3 rounded-lg">{error}</div>}

                            <div>
                                <label htmlFor="name" className="label">Trip Name</label>
                                <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="label">Start Date</label>
                                    <input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="label">End Date</label>
                                    <input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="description" className="label">Description</label>
                                <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className="input-field min-h-[100px] resize-y" />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button type="submit" disabled={saving} className="btn-primary flex-1">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button type="button" onClick={() => router.back()} className="btn-outline">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
