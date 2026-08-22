'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { Trip } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [user, authLoading, router]);

    const fetchTrips = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(5);

        setTrips(data || []);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        const loadTrips = async () => { await fetchTrips(); };
        void loadTrips();
    }, [fetchTrips]);

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-dim">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const userName = user.email?.split('@')[0] || 'Traveler';

    return (
        <div className="min-h-screen bg-surface-dim">
            <Navbar />
            <main className="page-container">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-8 sm:p-10 mb-8 text-white">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                        Welcome back, {userName}! 👋
                    </h1>
                    <p className="text-white/80 mb-6 max-w-lg">
                        Ready to plan your next adventure? Create a new trip and start adding destinations, activities, and track your budget.
                    </p>
                    <Link href="/trips/new" className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Plan New Trip
                    </Link>
                </div>

                {/* Recent Trips */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="section-title">Recent Trips</h2>
                        {trips.length > 0 && (
                            <Link href="/trips" className="text-sm text-primary font-medium hover:underline">
                                View all →
                            </Link>
                        )}
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
                            <h3 className="text-lg font-semibold text-text mb-1">No trips planned yet</h3>
                            <p className="text-text-secondary mb-6">Create your first trip to get started with GlobeTrotter</p>
                            <Link href="/trips/new" className="btn-primary inline-flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Plan Your First Trip
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {trips.map(trip => (
                                <Link key={trip.id} href={`/trips/${trip.id}`} className="card p-6 group">
                                    <h3 className="font-semibold text-text group-hover:text-primary transition-colors mb-1.5">
                                        {trip.name}
                                    </h3>
                                    <p className="text-sm text-text-secondary mb-3">
                                        {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        {' — '}
                                        {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                    {trip.description && (
                                        <p className="text-sm text-text-muted line-clamp-2">{trip.description}</p>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Stats */}
                {trips.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
                        <div className="card p-5 text-center">
                            <p className="text-2xl font-bold text-primary">{trips.length}</p>
                            <p className="text-sm text-text-secondary">Total Trips</p>
                        </div>
                        <div className="card p-5 text-center">
                            <p className="text-2xl font-bold text-accent">
                                {trips.filter(t => new Date(t.end_date) >= new Date()).length}
                            </p>
                            <p className="text-sm text-text-secondary">Upcoming</p>
                        </div>
                        <div className="card p-5 text-center hidden sm:block">
                            <p className="text-2xl font-bold text-success">
                                {trips.filter(t => new Date(t.end_date) < new Date()).length}
                            </p>
                            <p className="text-sm text-text-secondary">Completed</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
