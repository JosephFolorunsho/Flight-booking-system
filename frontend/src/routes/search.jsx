import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { useState } from "react";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    // fetch flights, update results, etc.
  };

  return (
    <div>
      <h2>Search Flights</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search flights..."
      />
      <button onClick={handleSearch}>Search</button>
      <ul>
        {results.map((r) => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
    </div>
  );
}

export const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
});
