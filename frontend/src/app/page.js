export default function Home() {
  return (
    <div className="home">
      <h1>Welcome to SkyRoute</h1>
      <p className="subtitle">Cloud-Native Distributed Flight Booking Engine</p>

      <div className="features">
        <div className="feature-card">
          <h3>🔍 Search Flights</h3>
          <p>Search flights from multiple providers with real-time caching</p>
          <a href="/flights" className="btn">
            Search Now
          </a>
        </div>

        <div className="feature-card">
          <h3>🗺️ Find Routes</h3>
          <p>
            Discover optimal routes with BFS algorithm (direct, 1-stop, 2-stop)
          </p>
          <a href="/routes" className="btn">
            Find Routes
          </a>
        </div>

        <div className="feature-card">
          <h3>✈️ Create Booking</h3>
          <p>Book multi-leg journeys with secure transaction handling</p>
          <a href="/booking" className="btn">
            Book Now
          </a>
        </div>
      </div>

      <div className="tech-stack">
        <h3>Technology Stack</h3>
        <p>Node.js • PostgreSQL • Docker • AWS • GitHub Actions</p>
      </div>
    </div>
  );
}
