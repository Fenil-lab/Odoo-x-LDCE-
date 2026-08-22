export interface City {
    id: string;
    name: string;
    country: string;
    cost_index: number;
}

export interface ActivityCatalog {
    id: string;
    name: string;
    category: string;
    typical_cost: number;
    city_id: string | null;
}

export interface Trip {
    id: string;
    user_id: string;
    name: string;
    start_date: string;
    end_date: string;
    description: string;
    created_at: string;
}

export interface Stop {
    id: string;
    trip_id: string;
    city_id: string;
    start_date: string;
    end_date: string;
    order_index: number;
    transport_cost: number;
    stay_cost: number;
    city?: City;
    activities?: Activity[];
}

export interface Activity {
    id: string;
    stop_id: string;
    activity_catalog_id: string | null;
    name: string;
    cost: number;
    category: string;
    time_of_day: string;
}

export interface TripWithStops extends Trip {
    stops: (Stop & { city: City; activities: Activity[] })[];
}
