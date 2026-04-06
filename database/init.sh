#!/bin/bash
# ============================================
# SkyRoute: Database Initialisation Script
# Runs migrations and seeds on first startup
# ============================================

set -e

echo "========================================"
echo "SkyRoute Database Initialisation"
echo "========================================"

# Run migrations
echo "[1/2] Running migrations..."
for migration in /docker-entrypoint-initdb.d/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "  -> Applying: $(basename $migration)"
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration"
    fi
done
echo "  Migrations complete."

# Run seeds
echo "[2/2] Running seed data..."
for seed in /docker-entrypoint-initdb.d/seeds/*.sql; do
    if [ -f "$seed" ]; then
        echo "  -> Seeding: $(basename $seed)"
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$seed"
    fi
done
echo "  Seed data complete."

echo "========================================"
echo "Database initialisation complete!"
echo "========================================"
