import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

export const rootRoute = createRootRoute({
  component: () => (
    <div className="App">
      <header className="App-header">
        <h1>SkyRoute</h1>
        <nav>
          <Link to="/" activeProps={{ className: "active" }}>
            Home
          </Link>
          <Link to="/search" activeProps={{ className: "active" }}>
            Search Flights
          </Link>
          <Link to="/booking" activeProps={{ className: "active" }}>
            Bookings
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  ),
});
