'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Activity, City, Stop, Trip } from '@/lib/types';

type StopWithDetails = Stop & { city: City; activities: Activity[] };
const timeLabels: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };

export default function SharedTripPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const tripId = params.tripId as string;
    const [trip, setTrip] = useState<Trip | null>(null);
    const [stops, setStops] = useState<StopWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [copying, setCopying] = useState(false);

    useEffect(() => {
        const loadSharedTrip = async () => {
            const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).eq('is_public', true).single();
            if (tripData) {
                setTrip(tripData);
                const { data: stopData } = await supabase.from('stops').select('*, city:cities(*)').eq('trip_id', tripId).order('order_index');
                const loadedStops = (stopData || []) as StopWithDetails[];
                const detailedStops = await Promise.all(loadedStops.map(async stop => {
                    const { data: activities } = await supabase.from('activities').select('*').eq('stop_id', stop.id).order('time_of_day');
                    return { ...stop, activities: activities || [] };
                }));
                setStops(detailedStops);
            }
            setLoading(false);
        };
        void loadSharedTrip();
    }, [tripId]);

    const copyTrip = async () => {
        if (!user || !trip) { router.push('/login'); return; }
        setCopying(true);
        setMessage('');
        const { data: copiedTrip, error: tripError } = await supabase.from('trips').insert({ user_id: user.id, name: `${trip.name} (Copy)`, start_date: trip.start_date, end_date: trip.end_date, description: trip.description, is_public: false }).select().single();
        if (tripError || !copiedTrip) { setMessage(tripError?.message || 'Unable to copy trip.'); setCopying(false); return; }
        for (const stop of stops) {
            const { data: copiedStop, error: stopError } = await supabase.from('stops').insert({ trip_id: copiedTrip.id, city_id: stop.city_id, start_date: stop.start_date, end_date: stop.end_date, order_index: stop.order_index, transport_cost: stop.transport_cost, stay_cost: stop.stay_cost }).select().single();
            if (stopError || !copiedStop) { setMessage(stopError?.message || 'Unable to copy a stop.'); setCopying(false); return; }
            if (stop.activities.length) {
                const { error: activitiesError } = await supabase.from('activities').insert(stop.activities.map(activity => ({ stop_id: copiedStop.id, activity_catalog_id: activity.activity_catalog_id, name: activity.name, cost: activity.cost, category: activity.category, time_of_day: activity.time_of_day })));
                if (activitiesError) { setMessage(activitiesError.message); setCopying(false); return; }
            }
        }
        setCopying(false);
        router.push(`/trips/${copiedTrip.id}/builder`);
    };

    if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center bg-surface-dim"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    if (!trip) return <div className="min-h-screen flex items-center justify-center bg-surface-dim px-4"><div className="card p-10 text-center max-w-md"><h1 className="page-title mb-2">Trip not available</h1><p className="text-text-secondary">This itinerary is private or no longer exists.</p></div></div>;

    return <div className="min-h-screen bg-surface-dim"><main className="page-container"><div className="max-w-3xl mx-auto"><div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"><div><p className="text-sm text-primary font-medium mb-2">Shared GlobeTrotter itinerary</p><h1 className="page-title">{trip.name}</h1><p className="text-text-secondary mt-1">{new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div><button onClick={copyTrip} disabled={copying} className="btn-primary">{copying ? 'Copying...' : user ? 'Copy Trip' : 'Sign in to Copy'}</button></div>{message && <div className="mb-5 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger" role="alert">{message}</div>}{trip.description && <p className="card p-5 mb-6 text-text-secondary">{trip.description}</p>}{stops.length === 0 ? <div className="card p-10 text-center"><h2 className="section-title mb-2">No stops added yet</h2><p className="text-text-secondary">This itinerary is still being planned.</p></div> : <div className="space-y-5">{stops.map((stop, index) => <section className="card overflow-hidden" key={stop.id}><div className="bg-gradient-to-r from-primary/5 to-transparent px-6 py-4 border-b border-border-light"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</div><div><h2 className="font-semibold text-text text-lg">{stop.city.name}, {stop.city.country}</h2><p className="text-sm text-text-secondary">{new Date(stop.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(stop.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div></div></div>{stop.activities.length > 0 && <div className="divide-y divide-border-light">{stop.activities.map(activity => <div key={activity.id} className="px-6 py-3 flex items-center justify-between gap-3"><div><span className="text-xs text-text-muted">{timeLabels[activity.time_of_day] || activity.time_of_day}</span><p className="text-sm font-medium text-text">{activity.name}</p></div><span className="text-sm font-semibold text-text">${Number(activity.cost).toFixed(0)}</span></div>)}</div>}</section>)}</div>}</div></main></div>;
}