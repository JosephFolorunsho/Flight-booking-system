import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <div>
      <h2>Welcome to SkyRoute</h2>
      <p>
        This is a simple frontend navigation demo for your flight booking
        system.
      </p>
    </div>
  ),
});
