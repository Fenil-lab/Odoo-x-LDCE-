'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { Activity, City, Stop, Trip } from '@/lib/types';

type StopWithDetails = Stop & { city: City; activities: Activity[] };
const timeOrder = ['morning', 'afternoon', 'evening', 'night'];

export default function TripCalendarPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const tripId = params.id as string;
    const [trip, setTrip] = useState<Trip | null>(null);
    const [stops, setStops] = useState<StopWithDetails[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        const loadData = async () => {
            const [{ data: tripData }, { data: stopData }] = await Promise.all([
                supabase.from('trips').select('*').eq('id', tripId).single(),
                supabase.from('stops').select('*, city:cities(*)').eq('trip_id', tripId).order('start_date').order('order_index'),
            ]);
            setTrip(tripData);
            const loadedStops = (stopData || []) as StopWithDetails[];
            const detailedStops = await Promise.all(loadedStops.map(async stop => {
                const { data: activities } = await supabase.from('activities').select('*').eq('stop_id', stop.id);
                return { ...stop, activities: activities || [] };
            }));
            setStops(detailedStops);
            setLoading(false);
        };
        void loadData();
    }, [user, tripId]);

    const days = useMemo(() => {
        const result: { date: string; stops: StopWithDetails[] }[] = [];
        stops.forEach(stop => {
            const cursor = new Date(`${stop.start_date}T00:00:00`);
            const end = new Date(`${stop.end_date}T00:00:00`);
            while (cursor <= end) {
                const date = cursor.toISOString().slice(0, 10);
                const current = result.find(day => day.date === date);
                if (current) current.stops.push(stop);
                else result.push({ date, stops: [stop] });
                cursor.setDate(cursor.getDate() + 1);
            }
        });
        return result;
    }, [stops]);

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-surface-dim"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    if (!trip) return <div className="min-h-screen bg-surface-dim"><Navbar /><main className="page-container text-center py-20"><h1 className="page-title">Trip not found</h1><button onClick={() => router.push('/trips')} className="btn-primary mt-5">Back to trips</button></main></div>;

    return (
        <div className="min-h-screen bg-surface-dim"><Navbar /><main className="page-container">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"><div><button onClick={() => router.push(`/trips/${tripId}`)} className="text-sm text-primary hover:underline mb-2">← {trip.name}</button><h1 className="page-title">Trip Timeline</h1><p className="text-text-secondary mt-1">A day-by-day view of your destinations and plans.</p></div><button onClick={() => router.push(`/trips/${tripId}/builder`)} className="btn-primary">Edit itinerary</button></div>
            {days.length === 0 ? <div className="card p-12 text-center"><h2 className="section-title mb-2">No itinerary dates yet</h2><p className="text-text-secondary mb-5">Add a stop to see it on your timeline.</p><button onClick={() => router.push(`/trips/${tripId}/builder`)} className="btn-primary">Add a stop</button></div> : <div className="space-y-4">{days.map(day => <section key={day.date} className="card overflow-hidden"><div className="bg-primary px-5 py-3 text-white"><h2 className="font-semibold">{new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2></div><div className="p-5 space-y-5">{day.stops.map(stop => <div key={stop.id}><div className="flex items-center gap-2 mb-3"><span className="w-2.5 h-2.5 rounded-full bg-accent" /><h3 className="font-semibold text-text">{stop.city.name}, {stop.city.country}</h3></div>{stop.activities.length === 0 ? <p className="text-sm text-text-muted ml-5">No activities planned for this stop.</p> : <div className="ml-5 border-l border-border pl-4 space-y-2">{[...stop.activities].sort((a, b) => timeOrder.indexOf(a.time_of_day) - timeOrder.indexOf(b.time_of_day)).map(activity => <div key={activity.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-dim px-3 py-2"><div><span className="text-xs text-text-secondary capitalize">{activity.time_of_day}</span><p className="text-sm font-medium text-text">{activity.name}</p></div><span className="text-sm font-semibold text-text">${Number(activity.cost).toFixed(0)}</span></div>)}</div>}</div>)}</div></section>)}</div>}
        </main></div>
    );
}