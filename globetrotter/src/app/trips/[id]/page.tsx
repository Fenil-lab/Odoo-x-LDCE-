'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { Trip, Stop, Activity, City } from '@/lib/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StopWithDetails extends Stop {
    city: City;
    activities: Activity[];
}

const COLORS = ['#0E7C6B', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

export default function TripDetailPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const tripId = params.id as string;

    const [trip, setTrip] = useState<Trip | null>(null);
    const [stops, setStops] = useState<StopWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'stops' | 'budget'>('stops');
    const [sharing, setSharing] = useState(false);
    const [shareMessage, setShareMessage] = useState('');

    useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [user, authLoading, router]);

    const fetchData = useCallback(async () => {
        if (!user) return;
        const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single();
        if (tripData) setTrip(tripData);

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

    const toggleSharing = async () => {
        if (!trip) return;
        setSharing(true);
        setShareMessage('');
        const { data, error } = await supabase.from('trips').update({ is_public: !trip.is_public }).eq('id', trip.id).select().single();
        if (error) setShareMessage(error.message);
        else if (data) setTrip(data);
        setSharing(false);
    };

    // Budget calculations
    const totalActivityCost = stops.reduce((sum, s) => sum + s.activities.reduce((a, act) => a + Number(act.cost), 0), 0);
    const totalTransport = stops.reduce((sum, s) => sum + Number(s.transport_cost || 0), 0);
    const totalStay = stops.reduce((sum, s) => sum + Number(s.stay_cost || 0), 0);
    const totalCost = totalActivityCost + totalTransport + totalStay;

    // Category breakdown
    const categoryData = (() => {
        const cats: Record<string, number> = { transport: totalTransport, stay: totalStay };
        stops.forEach(s => {
            s.activities.forEach(a => {
                cats[a.category] = (cats[a.category] || 0) + Number(a.cost);
            });
        });
        return Object.entries(cats)
            .filter(([, v]) => v > 0)
            .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value) }));
    })();

    // Per-stop cost for bar chart
    const stopCostData = stops.map(s => ({
        name: s.city.name,
        Activities: s.activities.reduce((sum, a) => sum + Number(a.cost), 0),
        Transport: Number(s.transport_cost || 0),
        Stay: Number(s.stay_cost || 0),
    }));

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
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary mb-1">
                            <button onClick={() => router.push('/trips')} className="hover:text-primary transition-colors">My Trips</button>
                            <span>/</span>
                            <span className="text-text">{trip.name}</span>
                        </div>
                        <h1 className="page-title">{trip.name}</h1>
                        <p className="text-text-secondary mt-1">
                            {new Date(trip.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {' — '}
                            {new Date(trip.end_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            {trip.description && <> · {trip.description}</>}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    <button onClick={toggleSharing} disabled={sharing} className="btn-outline inline-flex items-center gap-2">
                        {sharing ? 'Saving...' : trip.is_public ? 'Unpublish' : 'Share trip'}
                    </button>
                    <button onClick={() => router.push(`/trips/${tripId}/calendar`)} className="btn-outline inline-flex items-center gap-2">
                        Calendar
                    </button>
                    <button onClick={() => router.push(`/trips/${tripId}/builder`)} className="btn-primary inline-flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit Itinerary
                    </button>
                    </div>
                </div>
                {shareMessage && <div className="mb-4 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger" role="alert">{shareMessage}</div>}
                {trip.is_public && <div className="mb-6 rounded-lg bg-success-light px-4 py-3 text-sm text-green-700" role="status">This trip is public at <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/share/${trip.id}`)} className="font-semibold underline">/share/{trip.id}</button></div>}

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-border mb-6 w-fit">
                    <button
                        onClick={() => setViewMode('stops')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'stops' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`}
                    >
                        📍 Itinerary
                    </button>
                    <button
                        onClick={() => setViewMode('budget')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'budget' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`}
                    >
                        💰 Budget
                    </button>
                </div>

                {/* Budget Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="card p-4 text-center">
                        <p className="text-xs text-text-secondary mb-1">Total Cost</p>
                        <p className="text-xl font-bold text-text">${totalCost.toFixed(0)}</p>
                    </div>
                    <div className="card p-4 text-center">
                        <p className="text-xs text-text-secondary mb-1">Activities</p>
                        <p className="text-xl font-bold text-primary">${totalActivityCost.toFixed(0)}</p>
                    </div>
                    <div className="card p-4 text-center">
                        <p className="text-xs text-text-secondary mb-1">Transport</p>
                        <p className="text-xl font-bold text-accent">${totalTransport.toFixed(0)}</p>
                    </div>
                    <div className="card p-4 text-center">
                        <p className="text-xs text-text-secondary mb-1">Accommodation</p>
                        <p className="text-xl font-bold text-blue-600">${totalStay.toFixed(0)}</p>
                    </div>
                </div>

                {viewMode === 'stops' ? (
                    /* Itinerary View */
                    stops.length === 0 ? (
                        <div className="card p-12 text-center">
                            <h3 className="text-lg font-semibold text-text mb-1">No stops in this trip</h3>
                            <p className="text-text-secondary mb-6">Open the itinerary builder to add destinations</p>
                            <button onClick={() => router.push(`/trips/${tripId}/builder`)} className="btn-primary">Open Builder</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stops.map((stop, index) => (
                                <div key={stop.id} className="card overflow-hidden">
                                    <div className="bg-gradient-to-r from-primary/5 to-transparent px-6 py-4 border-b border-border-light">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-text text-lg">{stop.city.name}, {stop.city.country}</h3>
                                                <p className="text-sm text-text-secondary">
                                                    {new Date(stop.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    {' — '}
                                                    {new Date(stop.end_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-text">
                                                    ${(stop.activities.reduce((s, a) => s + Number(a.cost), 0) + Number(stop.transport_cost || 0) + Number(stop.stay_cost || 0)).toFixed(0)}
                                                </p>
                                                <p className="text-xs text-text-muted">total</p>
                                            </div>
                                        </div>
                                        {(Number(stop.transport_cost) > 0 || Number(stop.stay_cost) > 0) && (
                                            <div className="flex gap-4 mt-2 text-xs text-text-secondary ml-11">
                                                {Number(stop.transport_cost) > 0 && <span>🚗 Transport: ${Number(stop.transport_cost).toFixed(0)}</span>}
                                                {Number(stop.stay_cost) > 0 && <span>🏨 Stay: ${Number(stop.stay_cost).toFixed(0)}</span>}
                                            </div>
                                        )}
                                    </div>

                                    {stop.activities.length > 0 && (
                                        <div className="divide-y divide-border-light">
                                            {stop.activities.map(activity => (
                                                <div key={activity.id} className="px-6 py-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-text-muted w-24 shrink-0">{timeLabels[activity.time_of_day] || activity.time_of_day}</span>
                                                        <span className="text-sm font-medium text-text">{activity.name}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[activity.category] || 'bg-gray-100 text-gray-700'}`}>
                                                            {activity.category}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-text">${Number(activity.cost).toFixed(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    /* Budget View */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart */}
                        <div className="card p-6">
                            <h3 className="section-title mb-4">Cost by Category</h3>
                            {categoryData.length === 0 ? (
                                <p className="text-text-secondary text-sm py-8 text-center">No cost data yet</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={110}
                                            paddingAngle={3}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: $${value}`}
                                        >
                                            {categoryData.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `$${Number(value)}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Bar Chart - cost per stop */}
                        <div className="card p-6">
                            <h3 className="section-title mb-4">Cost by Destination</h3>
                            {stopCostData.length === 0 ? (
                                <p className="text-text-secondary text-sm py-8 text-center">No stop data yet</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={stopCostData}>
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(value) => `$${Number(value)}`} />
                                        <Legend />
                                        <Bar dataKey="Activities" stackId="a" fill="#0E7C6B" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Transport" stackId="a" fill="#F59E0B" />
                                        <Bar dataKey="Stay" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Breakdown Table */}
                        <div className="card p-6 lg:col-span-2">
                            <h3 className="section-title mb-4">Detailed Breakdown</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-2 px-3 font-medium text-text-secondary">Category</th>
                                            <th className="text-right py-2 px-3 font-medium text-text-secondary">Amount</th>
                                            <th className="text-right py-2 px-3 font-medium text-text-secondary">% of Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoryData.map((cat, i) => (
                                            <tr key={i} className="border-b border-border-light">
                                                <td className="py-2.5 px-3 flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                    {cat.name}
                                                </td>
                                                <td className="text-right py-2.5 px-3 font-medium">${cat.value}</td>
                                                <td className="text-right py-2.5 px-3 text-text-secondary">
                                                    {totalCost > 0 ? ((cat.value / totalCost) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="font-semibold">
                                            <td className="py-2.5 px-3">Total</td>
                                            <td className="text-right py-2.5 px-3">${totalCost.toFixed(0)}</td>
                                            <td className="text-right py-2.5 px-3">100%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
