'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { ActivityCatalog, City, Stop, Trip } from '@/lib/types';

type StopOption = Stop & { city: City };

export default function ActivitiesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [catalog, setCatalog] = useState<ActivityCatalog[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [stops, setStops] = useState<StopOption[]>([]);
    const [tripId, setTripId] = useState('');
    const [stopId, setStopId] = useState('');
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [maxCost, setMaxCost] = useState('all');
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

    useEffect(() => {
        if (!authLoading && !user) router.replace('/login');
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        const loadData = async () => {
            const [catalogResult, tripsResult] = await Promise.all([
                supabase.from('activity_catalog').select('*').order('name'),
                supabase.from('trips').select('*').eq('user_id', user.id).order('start_date'),
            ]);
            if (catalogResult.error || tripsResult.error) {
                setMessage({ text: catalogResult.error?.message || tripsResult.error?.message || 'Unable to load activities.', error: true });
            } else {
                setCatalog(catalogResult.data || []);
                const loadedTrips = tripsResult.data || [];
                setTrips(loadedTrips);
                if (loadedTrips[0]) setTripId(loadedTrips[0].id);
            }
            setLoading(false);
        };
        void loadData();
    }, [user]);

    useEffect(() => {
        const loadStops = async () => {
            if (!tripId) {
                setStops([]);
                setStopId('');
                return;
            }
            const { data, error } = await supabase.from('stops').select('*, city:cities(*)').eq('trip_id', tripId).order('order_index');
            if (error) setMessage({ text: error.message, error: true });
            const loadedStops = (data || []) as StopOption[];
            setStops(loadedStops);
            setStopId(current => loadedStops.some(stop => stop.id === current) ? current : loadedStops[0]?.id || '');
        };
        void loadStops();
    }, [tripId]);

    const selectedStop = stops.find(stop => stop.id === stopId);
    const categories = useMemo(() => [...new Set(catalog.map(activity => activity.category))].sort(), [catalog]);
    const filteredActivities = useMemo(() => catalog.filter(activity => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery = !normalizedQuery || activity.name.toLowerCase().includes(normalizedQuery);
        const matchesCategory = category === 'all' || activity.category === category;
        const matchesCost = maxCost === 'all' || Number(activity.typical_cost) <= Number(maxCost);
        const matchesCity = !selectedStop || activity.city_id === null || activity.city_id === selectedStop.city_id;
        return matchesQuery && matchesCategory && matchesCost && matchesCity;
    }), [catalog, category, maxCost, query, selectedStop]);

    const addActivity = async (activity: ActivityCatalog) => {
        setMessage(null);
        if (!selectedStop) {
            setMessage({ text: 'Choose a stop before adding an activity.', error: true });
            return;
        }
        setSavingId(activity.id);
        const { error } = await supabase.from('activities').insert({
            stop_id: selectedStop.id,
            activity_catalog_id: activity.id,
            name: activity.name,
            cost: activity.typical_cost,
            category: activity.category,
            time_of_day: 'morning',
        });
        setSavingId(null);
        if (error) setMessage({ text: error.message, error: true });
        else setMessage({ text: `${activity.name} added to ${selectedStop.city.name}.`, error: false });
    };

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-surface-dim"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-surface-dim">
            <Navbar />
            <main className="page-container">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div><h1 className="page-title">Find Activities</h1><p className="text-text-secondary mt-1">Build each stop with activities from the catalog.</p></div>
                    <button onClick={() => router.push('/trips')} className="btn-outline">Manage trips</button>
                </div>
                {message && <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.error ? 'bg-danger-light text-danger' : 'bg-success-light text-green-700'}`} role={message.error ? 'alert' : 'status'}>{message.text}</div>}

                <div className="card p-4 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <select value={tripId} onChange={event => setTripId(event.target.value)} className="input-field" aria-label="Choose trip"><option value="">Choose a trip...</option>{trips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select>
                    <select value={stopId} onChange={event => setStopId(event.target.value)} className="input-field" aria-label="Choose stop"><option value="">Choose a stop...</option>{stops.map(stop => <option key={stop.id} value={stop.id}>{stop.city.name}, {stop.city.country}</option>)}</select>
                    <input value={query} onChange={event => setQuery(event.target.value)} className="input-field" placeholder="Search activities" aria-label="Search activities" />
                    <select value={category} onChange={event => setCategory(event.target.value)} className="input-field" aria-label="Filter by category"><option value="all">All categories</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
                    <span className="text-text-secondary">Maximum cost:</span>
                    {['all', '25', '50', '100'].map(value => <button key={value} onClick={() => setMaxCost(value)} className={`px-3 py-1.5 rounded-lg border text-sm ${maxCost === value ? 'border-primary bg-primary text-white' : 'border-border bg-white text-text-secondary'}`}>{value === 'all' ? 'Any' : `$${value}`}</button>)}
                </div>

                {trips.length === 0 ? <div className="card p-10 text-center"><h2 className="section-title mb-2">No trips yet</h2><p className="text-text-secondary mb-5">Create a trip and a stop before adding activities.</p><button onClick={() => router.push('/trips/new')} className="btn-primary">Plan a trip</button></div>
                    : stops.length === 0 ? <div className="card p-10 text-center"><h2 className="section-title mb-2">No stops in this trip</h2><p className="text-text-secondary mb-5">Add a destination before choosing activities.</p><button onClick={() => router.push(`/trips/${tripId}/builder`)} className="btn-primary">Open itinerary builder</button></div>
                        : filteredActivities.length === 0 ? <div className="card p-10 text-center"><h2 className="section-title mb-2">No results found</h2><p className="text-text-secondary">Try a different search or filter.</p></div>
                            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{filteredActivities.map(activity => <div key={activity.id} className="card p-5"><div className="flex items-start justify-between gap-3 mb-3"><h2 className="font-semibold text-text">{activity.name}</h2><span className="font-semibold text-primary whitespace-nowrap">${Number(activity.typical_cost).toFixed(0)}</span></div><p className="text-xs text-text-secondary capitalize mb-5">{activity.category}{activity.city_id ? ' · Local favorite' : ' · Works anywhere'}</p><button onClick={() => addActivity(activity)} disabled={savingId === activity.id} className="btn-primary w-full text-sm">{savingId === activity.id ? 'Adding...' : 'Add to Trip'}</button></div>)}</div>}
            </main>
        </div>
    );
}