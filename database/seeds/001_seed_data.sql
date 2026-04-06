-- ============================================
-- SkyRoute: Seed Data
-- Sprint 1 - US-03: Initial Airport & Airline Data
-- ============================================

-- ============================================
-- 15 Major International Airports
-- ============================================
INSERT INTO airports (iata_code, name, city, country, latitude, longitude, timezone) VALUES
    ('LHR', 'London Heathrow Airport', 'London', 'United Kingdom', 51.470020, -0.454296, 'Europe/London'),
    ('JFK', 'John F. Kennedy International Airport', 'New York', 'United States', 40.641766, -73.780968, 'America/New_York'),
    ('DXB', 'Dubai International Airport', 'Dubai', 'United Arab Emirates', 25.252778, 55.364444, 'Asia/Dubai'),
    ('SIN', 'Singapore Changi Airport', 'Singapore', 'Singapore', 1.350189, 103.994433, 'Asia/Singapore'),
    ('HND', 'Tokyo Haneda Airport', 'Tokyo', 'Japan', 35.553333, 139.781111, 'Asia/Tokyo'),
    ('LAX', 'Los Angeles International Airport', 'Los Angeles', 'United States', 33.942536, -118.408075, 'America/Los_Angeles'),
    ('CDG', 'Charles de Gaulle Airport', 'Paris', 'France', 49.009722, 2.547778, 'Europe/Paris'),
    ('AMS', 'Amsterdam Schiphol Airport', 'Amsterdam', 'Netherlands', 52.308056, 4.764167, 'Europe/Amsterdam'),
    ('FRA', 'Frankfurt Airport', 'Frankfurt', 'Germany', 50.033333, 8.570556, 'Europe/Berlin'),
    ('IST', 'Istanbul Airport', 'Istanbul', 'Turkey', 41.275278, 28.751944, 'Europe/Istanbul'),
    ('SYD', 'Sydney Kingsford Smith Airport', 'Sydney', 'Australia', -33.946111, 151.177222, 'Australia/Sydney'),
    ('HKG', 'Hong Kong International Airport', 'Hong Kong', 'China', 22.308919, 113.914603, 'Asia/Hong_Kong'),
    ('ORD', 'O\'Hare International Airport', 'Chicago', 'United States', 41.978603, -87.904842, 'America/Chicago'),
    ('DOH', 'Hamad International Airport', 'Doha', 'Qatar', 25.273056, 51.608056, 'Asia/Qatar'),
    ('NBO', 'Jomo Kenyatta International Airport', 'Nairobi', 'Kenya', -1.319167, 36.927778, 'Africa/Nairobi')
ON CONFLICT (iata_code) DO NOTHING;

-- ============================================
-- 10 Major International Airlines
-- ============================================
INSERT INTO airlines (iata_code, name, country) VALUES
    ('BA', 'British Airways', 'United Kingdom'),
    ('AA', 'American Airlines', 'United States'),
    ('EK', 'Emirates', 'United Arab Emirates'),
    ('SQ', 'Singapore Airlines', 'Singapore'),
    ('NH', 'All Nippon Airways', 'Japan'),
    ('AF', 'Air France', 'France'),
    ('LH', 'Lufthansa', 'Germany'),
    ('TK', 'Turkish Airlines', 'Turkey'),
    ('QR', 'Qatar Airways', 'Qatar'),
    ('QF', 'Qantas', 'Australia')
ON CONFLICT (iata_code) DO NOTHING;
