'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { Trip, Stop, Activity, City, ActivityCatalog } from '@/lib/types';

interface StopWithDetails extends Stop {
    city: City;
    activities: Activity[];
}

export default function ItineraryBuilderPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const tripId = params.id as string;

    const [trip, setTrip] = useState<Trip | null>(null);
    const [stops, setStops] = useState<StopWithDetails[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [activityCatalog, setActivityCatalog] = useState<ActivityCatalog[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // Add Stop modal
    const [showAddStop, setShowAddStop] = useState(false);
    const [newStopCity, setNewStopCity] = useState('');
    const [newStopStart, setNewStopStart] = useState('');
    const [newStopEnd, setNewStopEnd] = useState('');
    const [savingStop, setSavingStop] = useState(false);

    // Add Activity modal
    const [activeStopId, setActiveStopId] = useState<string | null>(null);
    const [activityMode, setActivityMode] = useState<'catalog' | 'custom'>('catalog');
    const [selectedCatalogId, setSelectedCatalogId] = useState('');
    const [customName, setCustomName] = useState('');
    const [customCost, setCustomCost] = useState('');
    const [customCategory, setCustomCategory] = useState('sightseeing');
    const [activityTime, setActivityTime] = useState('morning');
    const [savingActivity, setSavingActivity] = useState(false);

    // Transport/stay cost editing
    const [editingCosts, setEditingCosts] = useState<string | null>(null);
    const [tempTransport, setTempTransport] = useState('');
    const [tempStay, setTempStay] = useState('');

    useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [user, authLoading, router]);

    const fetchData = useCallback(async () => {
        if (!user) return;
        const [tripRes, citiesRes, catalogRes] = await Promise.all([
            supabase.from('trips').select('*').eq('id', tripId).single(),
            supabase.from('cities').select('*').order('name'),
            supabase.from('activity_catalog').select('*').order('name'),
        ]);

        if (tripRes.data) setTrip(tripRes.data);
        if (citiesRes.data) setCities(citiesRes.data);
        if (catalogRes.data) setActivityCatalog(catalogRes.data);

        // Fetch stops with cities and activities
        const { data: stopsData } = await supabase
            .from('stops')
            .select('*, city:cities(*)')
            .eq('trip_id', tripId)
            .order('order_index');

        if (stopsData) {
            const stopsWithActivities = await Promise.all(
                stopsData.map(async (stop: StopWithDetails) => {
                    const { data: acts } = await supabase
                        .from('activities')
                        .select('*')
                        .eq('stop_id', stop.id)
                        .order('time_of_day');
                    return { ...stop, activities: acts || [] };
                })
            );
            setStops(stopsWithActivities);
        }

        setLoading(false);
    }, [user, tripId]);

    useEffect(() => {
        if (!user) return;
        const loadData = async () => { await fetchData(); };
        void loadData();
    }, [user, fetchData]);

    const addStop = async () => {
        setErrorMessage('');
        if (!newStopCity || !newStopStart || !newStopEnd) {
            setErrorMessage('Select a city and both stop dates.');
            return;
        }
        if (newStopEnd < newStopStart) {
            setErrorMessage('Stop end date cannot be before its start date.');
            return;
        }
        if (trip && (newStopStart < trip.start_date || newStopEnd > trip.end_date)) {
            setErrorMessage('Stop dates must fall within the trip dates.');
            return;
        }
        setSavingStop(true);

        const { data, error } = await supabase
            .from('stops')
            .insert({
                trip_id: tripId,
                city_id: newStopCity,
                start_date: newStopStart,
                end_date: newStopEnd,
                order_index: stops.length,
                transport_cost: 0,
                stay_cost: 0,
            })
            .select('*, city:cities(*)')
            .single();

        if (error) {
            setErrorMessage(error.message);
        } else if (data) {
            setStops(prev => [...prev, { ...data, activities: [] }]);
            setShowAddStop(false);
            setNewStopCity('');
            setNewStopStart('');
            setNewStopEnd('');
        }
        setSavingStop(false);
    };

    const removeStop = async (stopId: string) => {
        if (!confirm('Remove this stop and all its activities?')) return;
        setErrorMessage('');
        const { error: activitiesError } = await supabase.from('activities').delete().eq('stop_id', stopId);
        if (activitiesError) {
            setErrorMessage(activitiesError.message);
            return;
        }
        const { error: stopError } = await supabase.from('stops').delete().eq('id', stopId);
        if (stopError) {
            setErrorMessage(stopError.message);
            return;
        }
        setStops(prev => prev.filter(s => s.id !== stopId));
    };

    const addActivity = async () => {
        setErrorMessage('');
        if (!activeStopId) {
            setErrorMessage('Choose a stop before adding an activity.');
            return;
        }
        setSavingActivity(true);

        let name = customName;
        const parsedCustomCost = Number(customCost);
        let cost = customCost === '' ? 0 : parsedCustomCost;
        let category = customCategory;
        let catalogId: string | null = null;

        if (activityMode === 'catalog' && !selectedCatalogId) {
            setErrorMessage('Select an activity from the catalog.');
            setSavingActivity(false);
            return;
        }

        if (activityMode === 'custom' && (!Number.isFinite(parsedCustomCost) || parsedCustomCost < 0)) {
            setErrorMessage('Activity cost must be zero or greater.');
            setSavingActivity(false);
            return;
        }

        if (activityMode === 'catalog' && selectedCatalogId) {
            const cat = activityCatalog.find(a => a.id === selectedCatalogId);
            if (cat) {
                name = cat.name;
                cost = cat.typical_cost;
                category = cat.category;
                catalogId = cat.id;
            }
        }

        if (!name.trim()) {
            setErrorMessage('Enter an activity name.');
            setSavingActivity(false);
            return;
        }

        const { data, error } = await supabase
            .from('activities')
            .insert({
                stop_id: activeStopId,
                activity_catalog_id: catalogId,
                name: name.trim(),
                cost,
                category,
                time_of_day: activityTime,
            })
            .select()
            .single();

        if (error) {
            setErrorMessage(error.message);
        } else if (data) {
            setStops(prev =>
                prev.map(s =>
                    s.id === activeStopId
                        ? { ...s, activities: [...s.activities, data] }
                        : s
                )
            );
            resetActivityForm();
        }
        setSavingActivity(false);
    };

    const removeActivity = async (stopId: string, activityId: string) => {
        setErrorMessage('');
        const { error } = await supabase.from('activities').delete().eq('id', activityId);
        if (error) {
            setErrorMessage(error.message);
            return;
        }
        setStops(prev =>
            prev.map(s =>
                s.id === stopId
                    ? { ...s, activities: s.activities.filter(a => a.id !== activityId) }
                    : s
            )
        );
    };

    const saveCosts = async (stopId: string) => {
        setErrorMessage('');
        const transportCost = Number(tempTransport);
        const stayCost = Number(tempStay);
        if (!Number.isFinite(transportCost) || transportCost < 0 || !Number.isFinite(stayCost) || stayCost < 0) {
            setErrorMessage('Costs must be zero or greater.');
            return;
        }

        const { error } = await supabase
            .from('stops')
            .update({
                transport_cost: transportCost,
                stay_cost: stayCost,
            })
            .eq('id', stopId);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setStops(prev =>
            prev.map(s =>
                s.id === stopId
                    ? { ...s, transport_cost: transportCost, stay_cost: stayCost }
                    : s
            )
        );
        setEditingCosts(null);
    };

    const resetActivityForm = () => {
        setActiveStopId(null);
        setActivityMode('catalog');
        setSelectedCatalogId('');
        setCustomName('');
        setCustomCost('');
        setCustomCategory('sightseeing');
        setActivityTime('morning');
    };

    const getActivitiesForCity = (cityId: string) => {
        return activityCatalog.filter(a => a.city_id === cityId || a.city_id === null);
    };

    const categoryColors: Record<string, string> = {
        sightseeing: 'bg-blue-100 text-blue-700',
        food: 'bg-orange-100 text-orange-700',
        adventure: 'bg-green-100 text-green-700',
        entertainment: 'bg-purple-100 text-purple-700',
        shopping: 'bg-pink-100 text-pink-700',
        relaxation: 'bg-teal-100 text-teal-700',
        transport: 'bg-gray-100 text-gray-700',
    };

    const timeLabels: Record<string, string> = {
        morning: '🌅 Morning',
        afternoon: '☀️ Afternoon',
        evening: '🌆 Evening',
        night: '🌙 Night',
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
                    <h2 className="text-xl font-semibold text-text mb-2">Trip not found</h2>
                    <button onClick={() => router.push('/trips')} className="btn-primary mt-4">Back to Trips</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-dim">
            <Navbar />
            <main className="page-container">
                {errorMessage && (
                    <div className="mb-6 flex items-start justify-between gap-4 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger" role="alert">
                        <span>{errorMessage}</span>
                        <button onClick={() => setErrorMessage('')} aria-label="Dismiss error" className="font-semibold">×</button>
                    </div>
                )}
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
                            <button onClick={() => router.push('/trips')} className="hover:text-primary transition-colors">My Trips</button>
                            <span>/</span>
                            <span className="text-text">{trip.name}</span>
                        </div>
                        <h1 className="page-title">Itinerary Builder</h1>
                        <p className="text-text-secondary mt-1">
                            {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' — '}
                            {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowAddStop(true)} className="btn-primary inline-flex items-center gap-2">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Stop
                        </button>
                        <button onClick={() => router.push(`/trips/${tripId}`)} className="btn-outline inline-flex items-center gap-2">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                            View Itinerary
                        </button>
                    </div>
                </div>

                {/* Stops List */}
                {stops.length === 0 ? (
                    <div className="card p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-text mb-1">No stops added yet</h3>
                        <p className="text-text-secondary mb-6">Add your first destination to start building your itinerary</p>
                        <button onClick={() => setShowAddStop(true)} className="btn-primary">Add Your First Stop</button>
                    </div>
                ) : (
                    <div className="space-y-6 route-list">
                        {stops.map((stop, index) => (
                            <div key={stop.id} className="card overflow-hidden route-stop">
                                {/* Stop Header */}
                                <div className="bg-gradient-to-r from-primary/5 to-transparent px-6 py-4 border-b border-border-light">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-text text-lg">
                                                    {stop.city.name}, {stop.city.country}
                                                </h3>
                                                <p className="text-sm text-text-secondary">
                                                    {new Date(stop.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    {' — '}
                                                    {new Date(stop.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    {' · '}
                                                    {Math.ceil((new Date(stop.end_date).getTime() - new Date(stop.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingCosts(stop.id);
                                                    setTempTransport(String(stop.transport_cost || 0));
                                                    setTempStay(String(stop.stay_cost || 0));
                                                }}
                                                className="text-sm text-text-secondary hover:text-primary transition-colors px-2 py-1"
                                                title="Edit transport & stay costs"
                                            >
                                                💰 Costs
                                            </button>
                                            <button onClick={() => removeStop(stop.id)} className="text-sm text-text-secondary hover:text-danger transition-colors px-2 py-1">
                                                Remove
                                            </button>
                                        </div>
                                    </div>

                                    {/* Cost editing inline */}
                                    {editingCosts === stop.id && (
                                        <div className="mt-3 flex items-end gap-3 bg-white p-3 rounded-lg border border-border">
                                            <div className="flex-1">
                                                <label className="text-xs font-medium text-text-secondary mb-1 block">Transport ($)</label>
                                                <input type="number" value={tempTransport} onChange={e => setTempTransport(e.target.value)} className="input-field text-sm py-1.5" placeholder="0" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs font-medium text-text-secondary mb-1 block">Accommodation ($)</label>
                                                <input type="number" value={tempStay} onChange={e => setTempStay(e.target.value)} className="input-field text-sm py-1.5" placeholder="0" />
                                            </div>
                                            <button onClick={() => saveCosts(stop.id)} className="btn-primary text-sm py-1.5 px-4">Save</button>
                                            <button onClick={() => setEditingCosts(null)} className="btn-outline text-sm py-1.5 px-3">×</button>
                                        </div>
                                    )}

                                    {/* Show saved costs */}
                                    {editingCosts !== stop.id && (Number(stop.transport_cost) > 0 || Number(stop.stay_cost) > 0) && (
                                        <div className="mt-2 flex gap-4 text-xs text-text-secondary">
                                            {Number(stop.transport_cost) > 0 && <span>🚗 Transport: ${Number(stop.transport_cost).toFixed(0)}</span>}
                                            {Number(stop.stay_cost) > 0 && <span>🏨 Stay: ${Number(stop.stay_cost).toFixed(0)}</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Activities in this stop */}
                                <div className="px-6 py-4">
                                    {stop.activities.length === 0 ? (
                                        <p className="text-sm text-text-muted py-2">No activities added yet</p>
                                    ) : (
                                        <div className="space-y-2 mb-4">
                                            {stop.activities.map(activity => (
                                                <div key={activity.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-dim transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-text-muted w-24">{timeLabels[activity.time_of_day] || activity.time_of_day}</span>
                                                        <span className="text-sm font-medium text-text">{activity.name}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[activity.category] || 'bg-gray-100 text-gray-700'}`}>
                                                            {activity.category}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-semibold text-text">${Number(activity.cost).toFixed(0)}</span>
                                                        <button
                                                            onClick={() => removeActivity(stop.id, activity.id)}
                                                            className="text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add Activity for this stop */}
                                    {activeStopId === stop.id ? (
                                        <div className="bg-surface-dim rounded-lg p-4 border border-border-light">
                                            <div className="flex items-center gap-3 mb-3">
                                                <button
                                                    onClick={() => setActivityMode('catalog')}
                                                    className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${activityMode === 'catalog' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-white'}`}
                                                >
                                                    From Catalog
                                                </button>
                                                <button
                                                    onClick={() => setActivityMode('custom')}
                                                    className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${activityMode === 'custom' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-white'}`}
                                                >
                                                    Custom
                                                </button>
                                            </div>

                                            {activityMode === 'catalog' ? (
                                                <div className="space-y-3">
                                                    <select
                                                        value={selectedCatalogId}
                                                        onChange={e => setSelectedCatalogId(e.target.value)}
                                                        className="input-field text-sm"
                                                    >
                                                        <option value="">Select an activity...</option>
                                                        <optgroup label={`${stop.city.name} Activities`}>
                                                            {getActivitiesForCity(stop.city_id)
                                                                .filter(a => a.city_id === stop.city_id)
                                                                .map(a => (
                                                                    <option key={a.id} value={a.id}>
                                                                        {a.name} — ${a.typical_cost} ({a.category})
                                                                    </option>
                                                                ))}
                                                        </optgroup>
                                                        <optgroup label="General Activities">
                                                            {getActivitiesForCity(stop.city_id)
                                                                .filter(a => a.city_id === null)
                                                                .map(a => (
                                                                    <option key={a.id} value={a.id}>
                                                                        {a.name} — ${a.typical_cost} ({a.category})
                                                                    </option>
                                                                ))}
                                                        </optgroup>
                                                    </select>
                                                    <div>
                                                        <label className="text-xs font-medium text-text-secondary mb-1 block">Time of Day</label>
                                                        <select value={activityTime} onChange={e => setActivityTime(e.target.value)} className="input-field text-sm">
                                                            <option value="morning">🌅 Morning</option>
                                                            <option value="afternoon">☀️ Afternoon</option>
                                                            <option value="evening">🌆 Evening</option>
                                                            <option value="night">🌙 Night</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        value={customName}
                                                        onChange={e => setCustomName(e.target.value)}
                                                        className="input-field text-sm"
                                                        placeholder="Activity name"
                                                    />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs font-medium text-text-secondary mb-1 block">Cost ($)</label>
                                                            <input
                                                                type="number"
                                                                value={customCost}
                                                                onChange={e => setCustomCost(e.target.value)}
                                                                className="input-field text-sm"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-text-secondary mb-1 block">Category</label>
                                                            <select value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="input-field text-sm">
                                                                <option value="sightseeing">Sightseeing</option>
                                                                <option value="food">Food</option>
                                                                <option value="adventure">Adventure</option>
                                                                <option value="entertainment">Entertainment</option>
                                                                <option value="shopping">Shopping</option>
                                                                <option value="relaxation">Relaxation</option>
                                                                <option value="transport">Transport</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-text-secondary mb-1 block">Time of Day</label>
                                                        <select value={activityTime} onChange={e => setActivityTime(e.target.value)} className="input-field text-sm">
                                                            <option value="morning">🌅 Morning</option>
                                                            <option value="afternoon">☀️ Afternoon</option>
                                                            <option value="evening">🌆 Evening</option>
                                                            <option value="night">🌙 Night</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 mt-4">
                                                <button onClick={addActivity} disabled={savingActivity} className="btn-primary text-sm py-2">
                                                    {savingActivity ? 'Adding...' : 'Add Activity'}
                                                </button>
                                                <button onClick={resetActivityForm} className="btn-outline text-sm py-2">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setActiveStopId(stop.id)}
                                            className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1 mt-1"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                            </svg>
                                            Add Activity
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Stop Modal */}
                {showAddStop && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setShowAddStop(false)}>
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-semibold text-text mb-4">Add a Stop</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="label">City</label>
                                    <select value={newStopCity} onChange={e => setNewStopCity(e.target.value)} className="input-field">
                                        <option value="">Select a city...</option>
                                        {cities.map(city => (
                                            <option key={city.id} value={city.id}>
                                                {city.name}, {city.country}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="label">Start Date</label>
                                        <input type="date" min={trip.start_date} max={trip.end_date} value={newStopStart} onChange={e => setNewStopStart(e.target.value)} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="label">End Date</label>
                                        <input type="date" min={newStopStart || trip.start_date} max={trip.end_date} value={newStopEnd} onChange={e => setNewStopEnd(e.target.value)} className="input-field" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-6">
                                <button onClick={addStop} disabled={savingStop} className="btn-primary flex-1">
                                    {savingStop ? 'Adding...' : 'Add Stop'}
                                </button>
                                <button onClick={() => setShowAddStop(false)} className="btn-outline">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
