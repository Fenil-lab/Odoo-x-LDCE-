'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { City, Trip } from '@/lib/types';

export default function CitiesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [cities, setCities] = useState<City[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [query, setQuery] = useState('');
    const [country, setCountry] = useState('all');
    const [activeTripId, setActiveTripId] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingCityId, setSavingCityId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!authLoading && !user) router.replace('/login');
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        const loadData = async () => {
            const [citiesResult, tripsResult] = await Promise.all([
                supabase.from('cities').select('*').order('name'),
                supabase.from('trips').select('*').eq('user_id', user.id).order('start_date'),
            ]);
            if (citiesResult.error || tripsResult.error) {
                setErrorMessage(citiesResult.error?.message || tripsResult.error?.message || 'Unable to load city data.');
            } else {
                setCities(citiesResult.data || []);
                const loadedTrips = tripsResult.data || [];
                setTrips(loadedTrips);
                if (loadedTrips[0]) setActiveTripId(loadedTrips[0].id);
            }
            setLoading(false);
        };
        void loadData();
    }, [user]);

    const countries = useMemo(() => [...new Set(cities.map(city => city.country))].sort(), [cities]);
    const filteredCities = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return cities.filter(city => {
            const matchesQuery = !normalizedQuery || `${city.name} ${city.country}`.toLowerCase().includes(normalizedQuery);
            return matchesQuery && (country === 'all' || city.country === country);
        });
    }, [cities, country, query]);

    const addCityToTrip = async (city: City) => {
        setErrorMessage('');
        setSuccessMessage('');
        const trip = trips.find(item => item.id === activeTripId);
        if (!trip) {
            setErrorMessage('Create a trip first, then choose it here.');
            return;
        }

        setSavingCityId(city.id);
        const { data: lastStop } = await supabase
            .from('stops')
            .select('order_index')
            .eq('trip_id', trip.id)
            .order('order_index', { ascending: false })
            .limit(1)
            .maybeSingle();
        const { error } = await supabase.from('stops').insert({
            trip_id: trip.id,
            city_id: city.id,
            start_date: trip.start_date,
            end_date: trip.end_date,
            order_index: (lastStop?.order_index ?? -1) + 1,
            transport_cost: 0,
            stay_cost: 0,
        });
        if (error) setErrorMessage(error.message);
        else setSuccessMessage(`${city.name} added to ${trip.name}.`);
        setSavingCityId(null);
    };

    if (authLoading || loading) {
        return <div className="min-h-screen flex items-center justify-center bg-surface-dim"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-surface-dim">
            <Navbar />
            <main className="page-container">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="page-title">Explore Cities</h1>
                        <p className="text-text-secondary mt-1">Find your next destination from the GlobeTrotter catalog.</p>
                    </div>
                    <button onClick={() => router.push('/trips/new')} className="btn-outline">Create a new trip</button>
                </div>

                {errorMessage && <div className="mb-4 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger" role="alert">{errorMessage}</div>}
                {successMessage && <div className="mb-4 rounded-lg bg-success-light px-4 py-3 text-sm text-green-700" role="status">{successMessage}</div>}

                <div className="card p-4 mb-6 grid grid-cols-1 md:grid-cols-[1fr_220px_260px] gap-3">
                    <input value={query} onChange={event => setQuery(event.target.value)} className="input-field" placeholder="Search city or country" aria-label="Search city or country" />
                    <select value={country} onChange={event => setCountry(event.target.value)} className="input-field" aria-label="Filter by country">
                        <option value="all">All countries</option>
                        {countries.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <select value={activeTripId} onChange={event => setActiveTripId(event.target.value)} className="input-field" aria-label="Trip to add cities to">
                        <option value="">Choose a trip...</option>
                        {trips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
                    </select>
                </div>

                {trips.length === 0 ? (
                    <div className="card p-10 text-center"><h2 className="section-title mb-2">No trips yet</h2><p className="text-text-secondary mb-5">Create a trip before adding destinations.</p><button onClick={() => router.push('/trips/new')} className="btn-primary">Plan a trip</button></div>
                ) : filteredCities.length === 0 ? (
                    <div className="card p-10 text-center"><h2 className="section-title mb-2">No results found</h2><p className="text-text-secondary">Try another city, country, or filter.</p></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCities.map(city => (
                            <div key={city.id} className="card p-5">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div><h2 className="font-semibold text-text text-lg">{city.name}</h2><p className="text-sm text-text-secondary">{city.country}</p></div>
                                    <span className="text-xs font-medium bg-accent/10 text-amber-700 px-2.5 py-1 rounded-full whitespace-nowrap">Cost {Number(city.cost_index).toFixed(1)}/5</span>
                                </div>
                                <button onClick={() => addCityToTrip(city)} disabled={savingCityId === city.id} className="btn-primary w-full text-sm">
                                    {savingCityId === city.id ? 'Adding...' : 'Add to Trip'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}