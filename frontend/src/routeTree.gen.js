import { rootRoute } from "./routes/__root";
import { indexRoute } from "./routes/index";
import { searchRoute } from "./routes/search";
import { bookingRoute } from "./routes/booking";

export const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  bookingRoute,
]);
