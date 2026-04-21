-- ============================================
-- Repair ownership/grants for flights_cache
-- Aligns the cache table with the application role that owns bookings
-- ============================================

DO $$
DECLARE
    app_role TEXT;
BEGIN
    SELECT tableowner
    INTO app_role
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'bookings';

    IF app_role IS NULL THEN
        RAISE EXCEPTION 'Could not determine application role from public.bookings';
    END IF;

    EXECUTE format('ALTER TABLE public.flights_cache OWNER TO %I', app_role);

    IF EXISTS (
        SELECT 1
        FROM pg_sequences
        WHERE schemaname = 'public'
          AND sequencename = 'flights_cache_id_seq'
    ) THEN
        EXECUTE format('ALTER SEQUENCE public.flights_cache_id_seq OWNER TO %I', app_role);
        EXECUTE format(
            'GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.flights_cache_id_seq TO %I',
            app_role
        );
    END IF;

    EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON TABLE public.flights_cache TO %I',
        app_role
    );
END $$;
