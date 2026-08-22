'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { Trip } from '@/lib/types';
import Link from 'next/link';

export default function TripsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [stopCounts, setStopCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [user, authLoading, router]);

    const fetchTrips = useCallback(async () => {
        if (!user) return;
        const { data: tripsData } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false });

        const tripsList = tripsData || [];
        setTrips(tripsList);

        // Fetch stop counts
        if (tripsList.length > 0) {
            const { data: stops } = await supabase
                .from('stops')
                .select('id, trip_id')
                .in('trip_id', tripsList.map(t => t.id));

            const counts: Record<string, number> = {};
            (stops || []).forEach(s => {
                counts[s.trip_id] = (counts[s.trip_id] || 0) + 1;
            });
            setStopCounts(counts);
        }

        setLoading(false);
    }, [user]);

    useEffect(() => {
        const loadTrips = async () => { await fetchTrips(); };
        void loadTrips();
    }, [fetchTrips]);

    const deleteTrip = async (tripId: string) => {
        if (!confirm('Delete this trip and all its data? This cannot be undone.')) return;
        setDeletingId(tripId);

        // Delete activities first (via stops)
        const { data: stops } = await supabase.from('stops').select('id').eq('trip_id', tripId);
        if (stops && stops.length > 0) {
            await supabase.from('activities').delete().in('stop_id', stops.map(s => s.id));
        }
        await supabase.from('stops').delete().eq('trip_id', tripId);
        await supabase.from('trips').delete().eq('id', tripId);

        setTrips(prev => prev.filter(t => t.id !== tripId));
        setDeletingId(null);
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-dim">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const getTripStatus = (trip: Trip) => {
        const now = new Date();
        const start = new Date(trip.start_date);
        const end = new Date(trip.end_date);
        if (now < start) return { label: 'Upcoming', color: 'bg-accent/10 text-amber-700' };
        if (now > end) return { label: 'Completed', color: 'bg-success-light text-green-700' };
        return { label: 'Ongoing', color: 'bg-primary/10 text-primary-dark' };
    };

    return (
        <div className="min-h-screen bg-surface-dim">
            <Navbar />
            <main className="page-container">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="page-title">My Trips</h1>
                        <p className="text-text-secondary mt-1">
                            {trips.length} trip{trips.length !== 1 ? 's' : ''} planned
                        </p>
                    </div>
                    <Link href="/trips/new" className="btn-primary inline-flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Trip
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card p-6 animate-pulse">
                                <div className="h-5 bg-border-light rounded w-3/4 mb-3" />
                                <div className="h-4 bg-border-light rounded w-1/2 mb-2" />
                                <div className="h-4 bg-border-light rounded w-1/3" />
                            </div>
                        ))}
                    </div>
                ) : trips.length === 0 ? (
                    <div className="card p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                                <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-text mb-1">No trips yet</h3>
                        <p className="text-text-secondary mb-6">Plan your first trip and start exploring the world</p>
                        <Link href="/trips/new" className="btn-primary inline-flex items-center gap-2">
                            Plan Your First Trip
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {trips.map(trip => {
                            const status = getTripStatus(trip);
                            return (
                                <div key={trip.id} className="card p-6 flex flex-col">
                                    <div className="flex items-start justify-between mb-3">
                                        <Link href={`/trips/${trip.id}`} className="font-semibold text-text hover:text-primary transition-colors flex-1 mr-2">
                                            {trip.name}
                                        </Link>
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    <p className="text-sm text-text-secondary mb-2">
                                        {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        {' — '}
                                        {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>

                                    <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
                                        <span className="flex items-center gap-1">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            {stopCounts[trip.id] || 0} stop{(stopCounts[trip.id] || 0) !== 1 ? 's' : ''}
                                        </span>
                                        <span>
                                            {Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                                        </span>
                                    </div>

                                    {trip.description && (
                                        <p className="text-sm text-text-muted line-clamp-2 mb-4 flex-1">{trip.description}</p>
                                    )}

                                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border-light">
                                        <Link href={`/trips/${trip.id}`} className="text-sm text-primary font-medium hover:underline flex-1">
                                            View Details →
                                        </Link>
                                        <Link href={`/trips/${trip.id}/edit`} className="text-sm text-text-secondary hover:text-text transition-colors px-2 py-1">
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => deleteTrip(trip.id)}
                                            disabled={deletingId === trip.id}
                                            className="text-sm text-text-secondary hover:text-danger transition-colors px-2 py-1"
                                        >
                                            {deletingId === trip.id ? '...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
