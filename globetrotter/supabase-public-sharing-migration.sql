-- Run once in the Supabase SQL editor for an existing GlobeTrotter database.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

DROP POLICY IF EXISTS "Anyone can view public trips" ON trips;
CREATE POLICY "Anyone can view public trips" ON trips
  FOR SELECT USING (is_public = TRUE);

DROP POLICY IF EXISTS "Anyone can view stops of public trips" ON stops;
CREATE POLICY "Anyone can view stops of public trips" ON stops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = stops.trip_id AND trips.is_public = TRUE)
  );

DROP POLICY IF EXISTS "Anyone can view activities of public trips" ON activities;
CREATE POLICY "Anyone can view activities of public trips" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stops
      JOIN trips ON trips.id = stops.trip_id
      WHERE stops.id = activities.stop_id AND trips.is_public = TRUE
    )
  );

DROP POLICY IF EXISTS "Anyone can view cities in public trips" ON cities;
CREATE POLICY "Anyone can view cities in public trips" ON cities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stops
      JOIN trips ON trips.id = stops.trip_id
      WHERE stops.city_id = cities.id AND trips.is_public = TRUE
    )
  );