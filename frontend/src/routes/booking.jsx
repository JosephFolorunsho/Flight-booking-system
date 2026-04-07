import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";

export const bookingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/booking",
  component: () => (
    <div>
      <h2>Bookings</h2>
      <p>View your current bookings and booking details here.</p>
    </div>
  ),
});
