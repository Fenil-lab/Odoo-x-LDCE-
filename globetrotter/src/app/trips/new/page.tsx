'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function CreateTripPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Please enter a trip name.');
            return;
        }
        if (!startDate || !endDate) {
            setError('Please select start and end dates.');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            setError('End date cannot be before start date.');
            return;
        }

        setSaving(true);
        const { data, error: dbError } = await supabase
            .from('trips')
            .insert({
                user_id: user!.id,
                name: name.trim(),
                start_date: startDate,
                end_date: endDate,
                description: description.trim(),
            })
            .select()
            .single();

        if (dbError) {
            setError(dbError.message);
            setSaving(false);
            return;
        }

        router.push(`/trips/${data.id}/builder`);
    };

    return (
        <div className="min-h-screen bg-surface-dim">
            <Navbar />
            <main className="page-container">
                <div className="max-w-xl mx-auto">
                    <h1 className="page-title mb-2">Plan a New Trip</h1>
                    <p className="text-text-secondary mb-8">Fill in the basics, then add stops and activities.</p>

                    <div className="card p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-danger-light text-danger text-sm px-4 py-3 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="name" className="label">Trip Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="input-field"
                                    placeholder="e.g. Summer Europe Backpacking"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="label">Start Date</label>
                                    <input
                                        id="startDate"
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="label">End Date</label>
                                    <input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="description" className="label">Description (optional)</label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="input-field min-h-[100px] resize-y"
                                    placeholder="A quick summary of your trip plans..."
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                    {saving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Create & Build Itinerary
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                                <button type="button" onClick={() => router.back()} className="btn-outline">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
