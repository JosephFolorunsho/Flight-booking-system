"use client";

import { useState } from "react";
import { searchFlights } from "@/services/api";

export default function FlightsPage() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFlights([]);

    try {
      const results = await searchFlights({ origin, destination, date });
      console.log("All flights", results.data.flights);
      const allFlights = results.data.flights;
      setFlights(allFlights);
    } catch (err) {
      setError(
        err.response?.data?.error?.message || "Failed to search flights",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Search Flights</h1>
      <p className="description">Search for direct flights between airports</p>

      <form onSubmit={handleSearch} className="search-form">
        <div className="form-group">
          <label>Origin Airport</label>
          <input
            type="text"
            placeholder="e.g., JFK"
            value={origin}
            onChange={(e) => setOrigin(e.target.value.toUpperCase())}
            maxLength={3}
            required
          />
        </div>

        <div className="form-group">
          <label>Destination Airport</label>
          <input
            type="text"
            placeholder="e.g., LAX"
            value={destination}
            onChange={(e) => setDestination(e.target.value.toUpperCase())}
            maxLength={3}
            required
          />
        </div>

        <div className="form-group">
          <label>Departure Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Searching..." : "Search Flights"}
        </button>
      </form>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {flights.length > 0 && (
        <div className="results">
          <h2>Found {flights.length} Flights</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Flight Number</th>
                  <th>Airline</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {flights.map((flight, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{flight.flightNumber}</strong>
                    </td>
                    <td>{flight.airline}</td>
                    <td>
                      {flight.departureAirport}
                      <br />
                      <small>
                        {new Date(flight.departureTime).toLocaleString()}
                      </small>
                    </td>
                    <td>
                      {flight.arrivalAirport}
                      <br />
                      <small>
                        {new Date(flight.arrivalTime).toLocaleString()}
                      </small>
                    </td>
                    <td>{flight.duration} min</td>
                    <td>
                      <span
                        className={`badge ${flight.status === "scheduled" ? "badge-success" : "badge-warning"}`}
                      >
                        {flight.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && flights.length === 0 && !error && (
        <div className="empty-state">
          <p>Enter search criteria to find flights</p>
        </div>
      )}
    </div>
  );
}
