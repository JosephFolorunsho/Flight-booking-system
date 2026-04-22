-- ============================================
-- SkyRoute: Complete Database Schema
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- Airports Table
-- ============================================
CREATE TABLE IF NOT EXISTS airports (
    id              SERIAL PRIMARY KEY,
    iata_code       VARCHAR(3) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    country         VARCHAR(100) NOT NULL,
    latitude        DECIMAL(10, 6) NOT NULL,
    longitude       DECIMAL(10, 6) NOT NULL,
    timezone        VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airports_iata_code ON airports(iata_code);
CREATE INDEX IF NOT EXISTS idx_airports_name_trgm ON airports USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_airports_city_trgm ON airports USING gin(city gin_trgm_ops);

-- ============================================
-- Airlines Table
-- ============================================
CREATE TABLE IF NOT EXISTS airlines (
    id              SERIAL PRIMARY KEY,
    iata_code       VARCHAR(3) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    country         VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airlines_iata_code ON airlines(iata_code);

-- ============================================
-- Flights Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS flights_cache (
    id                  SERIAL PRIMARY KEY,
    origin_id           INTEGER NOT NULL REFERENCES airports(id) ON DELETE RESTRICT,
    dest_id             INTEGER NOT NULL REFERENCES airports(id) ON DELETE RESTRICT,
    airline_id          INTEGER REFERENCES airlines(id) ON DELETE SET NULL,
    flight_number       VARCHAR(10),
    departure_time      TIMESTAMP WITH TIME ZONE,
    arrival_time        TIMESTAMP WITH TIME ZONE,
    duration_minutes    INTEGER,
    price               DECIMAL(10, 2),
    raw_data            JSONB,
    cached_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flights_cache_origin ON flights_cache(origin_id);
CREATE INDEX IF NOT EXISTS idx_flights_cache_dest ON flights_cache(dest_id);
CREATE INDEX IF NOT EXISTS idx_flights_cache_route ON flights_cache(origin_id, dest_id);
CREATE INDEX IF NOT EXISTS idx_flights_cache_cached_at ON flights_cache(cached_at);
CREATE INDEX IF NOT EXISTS idx_flights_cache_raw_data ON flights_cache USING gin(raw_data);

-- ============================================
-- Bookings Table
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    total_price     DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency        VARCHAR(3) DEFAULT 'USD',
    payment_status  VARCHAR(20) DEFAULT 'pending'
                        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- ============================================
-- Booking Legs Table
-- ============================================
CREATE TABLE IF NOT EXISTS booking_legs (
    id              SERIAL PRIMARY KEY,
    booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    flight_id       INTEGER NOT NULL REFERENCES flights_cache(id) ON DELETE RESTRICT,
    sequence        INTEGER NOT NULL,
    passenger_name  VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_legs_booking_id ON booking_legs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_legs_flight_id ON booking_legs(flight_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_legs_unique_sequence 
    ON booking_legs(booking_id, sequence);

-- ============================================
-- Payment Attempts Table
-- ============================================
CREATE TABLE IF NOT EXISTS payment_attempts (
    id              SERIAL PRIMARY KEY,
    booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount          DECIMAL(10, 2) NOT NULL,
    status          VARCHAR(50) NOT NULL,
    payment_method  VARCHAR(50),
    transaction_id  VARCHAR(100),
    error_message   TEXT,
    attempted_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_booking_id 
    ON payment_attempts(booking_id);

-- ============================================
-- Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_airports_updated_at
    BEFORE UPDATE ON airports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_airlines_updated_at
    BEFORE UPDATE ON airlines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();