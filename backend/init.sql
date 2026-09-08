CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS hazards (
    id SERIAL PRIMARY KEY,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Reported',
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS hazards_location_idx ON hazards USING GIST (location);

-- Insert some dummy data for testing
INSERT INTO hazards (location, severity, status) VALUES 
(ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326), 'Critical', 'Reported'), -- New Delhi
(ST_SetSRID(ST_MakePoint(77.2000, 28.6100), 4326), 'Medium', 'In Progress'),
(ST_SetSRID(ST_MakePoint(77.2150, 28.6200), 4326), 'Low', 'Resolved');
