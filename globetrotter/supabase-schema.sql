-- =============================================
-- GlobeTrotter Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Cities table (seed data)
CREATE TABLE IF NOT EXISTS cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  cost_index NUMERIC(3,1) NOT NULL DEFAULT 3.0
);

-- Activity catalog (seed data)
CREATE TABLE IF NOT EXISTS activity_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  typical_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL
);

-- Trips
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stops
CREATE TABLE IF NOT EXISTS stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES cities(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  transport_cost NUMERIC(10,2) DEFAULT 0,
  stay_cost NUMERIC(10,2) DEFAULT 0
);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stop_id UUID NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  activity_catalog_id UUID REFERENCES activity_catalog(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'sightseeing',
  time_of_day TEXT NOT NULL DEFAULT 'morning'
);

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips
CREATE POLICY "Users can view own trips" ON trips
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trips" ON trips
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for stops (via trip ownership)
CREATE POLICY "Users can view stops of own trips" ON stops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = stops.trip_id AND trips.user_id = auth.uid())
  );
CREATE POLICY "Users can insert stops to own trips" ON stops
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = stops.trip_id AND trips.user_id = auth.uid())
  );
CREATE POLICY "Users can update stops of own trips" ON stops
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = stops.trip_id AND trips.user_id = auth.uid())
  );
CREATE POLICY "Users can delete stops of own trips" ON stops
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = stops.trip_id AND trips.user_id = auth.uid())
  );

-- RLS Policies for activities (via stop → trip ownership)
CREATE POLICY "Users can view activities of own trips" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stops
      JOIN trips ON trips.id = stops.trip_id
      WHERE stops.id = activities.stop_id AND trips.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert activities to own trips" ON activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM stops
      JOIN trips ON trips.id = stops.trip_id
      WHERE stops.id = activities.stop_id AND trips.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update activities of own trips" ON activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM stops
      JOIN trips ON trips.id = stops.trip_id
      WHERE stops.id = activities.stop_id AND trips.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete activities of own trips" ON activities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM stops
      JOIN trips ON trips.id = stops.trip_id
      WHERE stops.id = activities.stop_id AND trips.user_id = auth.uid()
    )
  );

-- Cities and activity_catalog are readable by all authenticated users
CREATE POLICY "Authenticated can read cities" ON cities
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can read activity_catalog" ON activity_catalog
  FOR SELECT USING (auth.role() = 'authenticated');

-- Public itinerary sharing. Run this migration on an existing database too.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
CREATE POLICY "Anyone can view public trips" ON trips
  FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Anyone can view stops of public trips" ON stops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = stops.trip_id AND trips.is_public = TRUE)
  );
CREATE POLICY "Anyone can view activities of public trips" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stops
      JOIN trips ON trips.id = stops.trip_id
      WHERE stops.id = activities.stop_id AND trips.is_public = TRUE
    )
  );
CREATE POLICY "Anyone can view cities in public trips" ON cities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stops
      JOIN trips ON trips.id = stops.trip_id
      WHERE stops.city_id = cities.id AND trips.is_public = TRUE
    )
  );

-- =============================================
-- SEED DATA: Cities (35 cities)
-- =============================================
INSERT INTO cities (name, country, cost_index) VALUES
  ('Paris', 'France', 4.2),
  ('Tokyo', 'Japan', 4.0),
  ('New York', 'United States', 4.5),
  ('London', 'United Kingdom', 4.3),
  ('Bangkok', 'Thailand', 2.0),
  ('Istanbul', 'Turkey', 2.5),
  ('Barcelona', 'Spain', 3.5),
  ('Rome', 'Italy', 3.4),
  ('Dubai', 'UAE', 4.0),
  ('Sydney', 'Australia', 4.1),
  ('Amsterdam', 'Netherlands', 3.8),
  ('Prague', 'Czech Republic', 2.8),
  ('Bali', 'Indonesia', 1.8),
  ('Lisbon', 'Portugal', 2.9),
  ('Marrakech', 'Morocco', 1.7),
  ('Seoul', 'South Korea', 3.2),
  ('Cape Town', 'South Africa', 2.3),
  ('Vienna', 'Austria', 3.6),
  ('Mexico City', 'Mexico', 2.1),
  ('Singapore', 'Singapore', 4.0),
  ('Budapest', 'Hungary', 2.6),
  ('Athens', 'Greece', 2.8),
  ('Hanoi', 'Vietnam', 1.5),
  ('Buenos Aires', 'Argentina', 2.2),
  ('Reykjavik', 'Iceland', 4.8),
  ('Jaipur', 'India', 1.4),
  ('Kyoto', 'Japan', 3.8),
  ('Cusco', 'Peru', 1.9),
  ('Dubrovnik', 'Croatia', 3.0),
  ('Zanzibar', 'Tanzania', 2.0),
  ('Queenstown', 'New Zealand', 3.9),
  ('Cartagena', 'Colombia', 2.1),
  ('Florence', 'Italy', 3.5),
  ('Bruges', 'Belgium', 3.3),
  ('Petra', 'Jordan', 2.4);

-- =============================================
-- SEED DATA: Activity Catalog (70+ activities)
-- =============================================

-- Generic activities (city_id = NULL, available everywhere)
INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
  ('City Walking Tour', 'sightseeing', 25.00, NULL),
  ('Museum Visit', 'sightseeing', 18.00, NULL),
  ('Local Street Food Tour', 'food', 35.00, NULL),
  ('Cooking Class', 'food', 65.00, NULL),
  ('Bike Rental & Ride', 'adventure', 20.00, NULL),
  ('Sunset Boat Cruise', 'sightseeing', 55.00, NULL),
  ('Historical Landmark Visit', 'sightseeing', 15.00, NULL),
  ('Night Market Exploration', 'food', 20.00, NULL),
  ('Spa & Wellness Session', 'relaxation', 80.00, NULL),
  ('Rooftop Bar & Drinks', 'food', 40.00, NULL),
  ('Public Transport Day Pass', 'transport', 12.00, NULL),
  ('Art Gallery Visit', 'sightseeing', 15.00, NULL),
  ('Local Market Shopping', 'shopping', 30.00, NULL),
  ('Photography Walk', 'sightseeing', 10.00, NULL),
  ('Traditional Dance Show', 'entertainment', 35.00, NULL);

-- Paris-specific
DO $$
DECLARE paris_id UUID;
BEGIN
  SELECT id INTO paris_id FROM cities WHERE name = 'Paris' AND country = 'France';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Eiffel Tower Visit', 'sightseeing', 28.00, paris_id),
    ('Louvre Museum', 'sightseeing', 22.00, paris_id),
    ('Seine River Cruise', 'sightseeing', 18.00, paris_id),
    ('Croissant & Coffee at Le Marais', 'food', 12.00, paris_id),
    ('Montmartre Art Walk', 'sightseeing', 0.00, paris_id);
END $$;

-- Tokyo-specific
DO $$
DECLARE tokyo_id UUID;
BEGIN
  SELECT id INTO tokyo_id FROM cities WHERE name = 'Tokyo' AND country = 'Japan';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Tsukiji Outer Market Tour', 'food', 30.00, tokyo_id),
    ('Meiji Shrine Visit', 'sightseeing', 0.00, tokyo_id),
    ('Shibuya Crossing & Harajuku Walk', 'sightseeing', 0.00, tokyo_id),
    ('Ramen Tasting Tour', 'food', 45.00, tokyo_id),
    ('TeamLab Borderless', 'entertainment', 32.00, tokyo_id);
END $$;

-- New York-specific
DO $$
DECLARE ny_id UUID;
BEGIN
  SELECT id INTO ny_id FROM cities WHERE name = 'New York' AND country = 'United States';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Statue of Liberty Ferry', 'sightseeing', 24.00, ny_id),
    ('Central Park Bike Tour', 'adventure', 45.00, ny_id),
    ('Broadway Show Ticket', 'entertainment', 120.00, ny_id),
    ('Brooklyn Pizza Walk', 'food', 38.00, ny_id),
    ('Top of the Rock', 'sightseeing', 40.00, ny_id);
END $$;

-- Bangkok-specific
DO $$
DECLARE bkk_id UUID;
BEGIN
  SELECT id INTO bkk_id FROM cities WHERE name = 'Bangkok' AND country = 'Thailand';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Grand Palace & Wat Phra Kaew', 'sightseeing', 16.00, bkk_id),
    ('Chao Phraya River Dinner Cruise', 'food', 42.00, bkk_id),
    ('Chatuchak Weekend Market', 'shopping', 25.00, bkk_id),
    ('Thai Massage (2 hours)', 'relaxation', 18.00, bkk_id),
    ('Pad Thai Cooking Class', 'food', 35.00, bkk_id);
END $$;

-- Barcelona-specific
DO $$
DECLARE bcn_id UUID;
BEGIN
  SELECT id INTO bcn_id FROM cities WHERE name = 'Barcelona' AND country = 'Spain';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Sagrada Familia Tour', 'sightseeing', 36.00, bcn_id),
    ('Las Ramblas Walk & Tapas', 'food', 28.00, bcn_id),
    ('Park Güell', 'sightseeing', 10.00, bcn_id),
    ('Beach Day at Barceloneta', 'relaxation', 0.00, bcn_id),
    ('Flamenco Show', 'entertainment', 45.00, bcn_id);
END $$;

-- Rome-specific
DO $$
DECLARE rome_id UUID;
BEGIN
  SELECT id INTO rome_id FROM cities WHERE name = 'Rome' AND country = 'Italy';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Colosseum & Forum Tour', 'sightseeing', 38.00, rome_id),
    ('Vatican Museums & Sistine Chapel', 'sightseeing', 28.00, rome_id),
    ('Trastevere Food Tour', 'food', 55.00, rome_id),
    ('Trevi Fountain & Gelato Walk', 'food', 8.00, rome_id);
END $$;

-- Dubai-specific
DO $$
DECLARE dubai_id UUID;
BEGIN
  SELECT id INTO dubai_id FROM cities WHERE name = 'Dubai' AND country = 'UAE';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Burj Khalifa Observation Deck', 'sightseeing', 45.00, dubai_id),
    ('Desert Safari with BBQ Dinner', 'adventure', 70.00, dubai_id),
    ('Dubai Mall & Aquarium', 'sightseeing', 35.00, dubai_id),
    ('Gold Souk & Spice Market Walk', 'shopping', 10.00, dubai_id);
END $$;

-- Bali-specific
DO $$
DECLARE bali_id UUID;
BEGIN
  SELECT id INTO bali_id FROM cities WHERE name = 'Bali' AND country = 'Indonesia';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Ubud Rice Terrace Trek', 'adventure', 15.00, bali_id),
    ('Balinese Temple Tour', 'sightseeing', 10.00, bali_id),
    ('Surfing Lesson at Kuta Beach', 'adventure', 25.00, bali_id),
    ('Beachfront Sunset Dinner', 'food', 22.00, bali_id);
END $$;

-- Istanbul-specific
DO $$
DECLARE ist_id UUID;
BEGIN
  SELECT id INTO ist_id FROM cities WHERE name = 'Istanbul' AND country = 'Turkey';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Hagia Sophia Visit', 'sightseeing', 20.00, ist_id),
    ('Grand Bazaar Shopping', 'shopping', 15.00, ist_id),
    ('Bosphorus Cruise', 'sightseeing', 25.00, ist_id),
    ('Turkish Bath (Hamam)', 'relaxation', 40.00, ist_id);
END $$;

-- Jaipur-specific
DO $$
DECLARE jaipur_id UUID;
BEGIN
  SELECT id INTO jaipur_id FROM cities WHERE name = 'Jaipur' AND country = 'India';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Amber Fort Tour', 'sightseeing', 8.00, jaipur_id),
    ('Hawa Mahal Visit', 'sightseeing', 3.00, jaipur_id),
    ('Traditional Rajasthani Thali', 'food', 6.00, jaipur_id),
    ('Block Printing Workshop', 'entertainment', 15.00, jaipur_id);
END $$;

-- Cape Town-specific
DO $$
DECLARE ct_id UUID;
BEGIN
  SELECT id INTO ct_id FROM cities WHERE name = 'Cape Town' AND country = 'South Africa';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Table Mountain Cable Car', 'adventure', 18.00, ct_id),
    ('Cape Peninsula Day Tour', 'sightseeing', 65.00, ct_id),
    ('Wine Tasting in Stellenbosch', 'food', 30.00, ct_id);
END $$;

-- Reykjavik-specific
DO $$
DECLARE rvk_id UUID;
BEGIN
  SELECT id INTO rvk_id FROM cities WHERE name = 'Reykjavik' AND country = 'Iceland';
  INSERT INTO activity_catalog (name, category, typical_cost, city_id) VALUES
    ('Golden Circle Tour', 'sightseeing', 85.00, rvk_id),
    ('Blue Lagoon Entry', 'relaxation', 75.00, rvk_id),
    ('Northern Lights Tour', 'adventure', 90.00, rvk_id);
END $$;
