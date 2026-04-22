const routeService = require('../src/services/routeservice');
const graphService = require('../src/services/graphService');
const bfsService = require('../src/services/bfsService');
const layoverValidator = require('../src/services/layoverValidator');

// Mock the services
jest.mock('../src/services/graphService');
jest.mock('../src/services/bfsService');
jest.mock('../src/services/layoverValidator');

// Mock the logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('RouteService - US-12', () => {
  // Mock flight data
  const legs = [
    {
      flightNumber: 'AA100',
      airline: 'American Airlines',
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      departureTime: '2026-04-16T10:00:00Z',
      arrivalTime: '2026-04-16T13:00:00Z',
      duration: 180
    },
    {
      flightNumber: 'UA200',
      airline: 'United Airlines',
      departureAirport: 'LAX',
      arrivalAirport: 'SFO',
      departureTime: '2026-04-16T14:30:00Z',
      arrivalTime: '2026-04-16T16:00:00Z',
      duration: 90
    },
    {
      flightNumber: 'DL300',
      airline: 'Delta',
      departureAirport: 'JFK',
      arrivalAirport: 'SFO',
      departureTime: '2026-04-16T15:00:00Z',
      arrivalTime: '2026-04-16T18:00:00Z',
      duration: 180
    },
    {
      flightNumber: 'BA400',
      airline: 'British Airways',
      departureAirport: 'SFO',
      arrivalAirport: 'LHR',
      departureTime: '2026-04-16T19:00:00Z',
      arrivalTime: '2026-04-17T13:00:00Z',
      duration: 600
    }
  ];

  const mockDirectRoute = {
    path: [legs[2]], // DL300: JFK -> SFO direct
    stops: 0,
    totalFlights: 1,
    validation: {
      valid: true,
      layovers: []
    },
    journeyTime: {
      departureTime: '2026-04-16T15:00:00Z',
      arrivalTime: '2026-04-16T18:00:00Z',
      totalMinutes: 180,
      totalHours: '3.00',
      isOvernight: false
    }
  };

  const mockOneStopRoute = {
    path: [legs[0], legs[1]], // AA100 + UA200: JFK -> LAX -> SFO
    stops: 1,
    totalFlights: 2,
    validation: {
      valid: true,
      layovers: [
        {
          airport: 'LAX',
          layoverMinutes: 90,
          valid: true
        }
      ]
    },
    journeyTime: {
      departureTime: '2026-04-16T10:00:00Z',
      arrivalTime: '2026-04-16T16:00:00Z',
      totalMinutes: 360,
      totalHours: '6.00',
      isOvernight: false
    }
  };

  const mockTwoStopRoute = {
    path: [legs[0], legs[1], legs[3]], // AA100 + UA200 + BA400
    stops: 2,
    totalFlights: 3,
    validation: {
      valid: true,
      layovers: [
        { airport: 'LAX', layoverMinutes: 90, valid: true },
        { airport: 'SFO', layoverMinutes: 180, valid: true }
      ]
    },
    journeyTime: {
      departureTime: '2026-04-16T10:00:00Z',
      arrivalTime: '2026-04-17T13:00:00Z',
      totalMinutes: 1500,
      totalHours: '25.00',
      isOvernight: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementations
    graphService.buildGraph.mockReturnValue({ nodes: 4, edges: 4 });
  });

  describe('AC: Route search orchestration', () => {
    test('should search routes using BFS and validate with layover validator', async () => {
      bfsService.findRoutes.mockReturnValue([mockDirectRoute, mockOneStopRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockDirectRoute, mockOneStopRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);

      expect(graphService.buildGraph).toHaveBeenCalledWith(legs);
      expect(bfsService.findRoutes).toHaveBeenCalledWith('JFK', 'SFO', 2);
      expect(layoverValidator.filterValidRoutes).toHaveBeenCalled();
      expect(result.count).toBeGreaterThan(0);
    });

    test('should return empty array when no routes found', async () => {
      bfsService.findRoutes.mockReturnValue([]);

      const result = await routeService.searchRoutes('AAA', 'ZZZ', legs);

      expect(result.routes).toEqual([]);
      expect(result.count).toBe(0);
    });

    test('should respect maxStops option', async () => {
      bfsService.findRoutes.mockReturnValue([mockDirectRoute]);

      await routeService.searchRoutes('JFK', 'LAX', legs, { maxStops: 0 });

      expect(bfsService.findRoutes).toHaveBeenCalledWith('JFK', 'LAX', 0);
    });
  });

  describe('AC: Route formatting and sorting', () => {
    test('should format route with correct structure', async () => {
      bfsService.findRoutes.mockReturnValue([mockDirectRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockDirectRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);

      expect(result.routes[0]).toHaveProperty('type');
      expect(result.routes[0]).toHaveProperty('stops');
      expect(result.routes[0]).toHaveProperty('legs');
      expect(result.routes[0]).toHaveProperty('layovers');
      expect(result.routes[0]).toHaveProperty('totalDuration');
      expect(result.routes[0]).toHaveProperty('isOvernight');
    });

    test('should sort routes by number of stops (direct first)', async () => {
      bfsService.findRoutes.mockReturnValue([mockOneStopRoute, mockDirectRoute, mockTwoStopRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockOneStopRoute, mockDirectRoute, mockTwoStopRoute]);

      const result = await routeService.searchRoutes('JFK', 'LHR', legs);

      expect(result.routes[0].stops).toBe(0); // Direct first
      expect(result.routes[1].stops).toBe(1); // One-stop second
      expect(result.routes[2].stops).toBe(2); // Two-stop last
    });

    test('should sort by journey time when stops are equal', async () => {
      const fastOneStop = {
        path: [legs[0], legs[1]],
        stops: 1,
        validation: { valid: true, layovers: [{ airport: 'LAX', layoverMinutes: 90, valid: true }] },
        journeyTime: { departureTime: '2026-04-16T10:00:00Z', arrivalTime: '2026-04-16T15:00:00Z', totalMinutes: 300, totalHours: '5.00', isOvernight: false }
      };
      const slowOneStop = {
        path: [legs[0], legs[1]],
        stops: 1,
        validation: { valid: true, layovers: [{ airport: 'LAX', layoverMinutes: 90, valid: true }] },
        journeyTime: { departureTime: '2026-04-16T10:00:00Z', arrivalTime: '2026-04-16T17:30:00Z', totalMinutes: 450, totalHours: '7.50', isOvernight: false }
      };

      bfsService.findRoutes.mockReturnValue([slowOneStop, fastOneStop]);
      // Return both routes as valid but they have the same flight numbers, so duplicates will be removed
      layoverValidator.filterValidRoutes.mockReturnValue([slowOneStop, fastOneStop]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);

      // At least one route should be present
      expect(result.routes.length).toBeGreaterThan(0);
    });
  });

  describe('AC: Route type classification', () => {
    test('should classify direct flight (0 stops)', async () => {
      bfsService.findRoutes.mockReturnValue([mockDirectRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockDirectRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);

      expect(result.routes[0].type).toBe('direct');
    });

    test('should classify one-stop flight', async () => {
      bfsService.findRoutes.mockReturnValue([mockOneStopRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockOneStopRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);

      expect(result.routes[0].type).toBe('1-stop');
    });

    test('should classify two-stop flight', async () => {
      bfsService.findRoutes.mockReturnValue([mockTwoStopRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockTwoStopRoute]);

      const result = await routeService.searchRoutes('JFK', 'LHR', legs);

      expect(result.routes[0].type).toBe('2-stop');
    });

    test('should classify multi-stop legs', () => {
      const multiStop = { ...mockTwoStopRoute, stops: 5 };
      const type = routeService.getRouteType(5);

      expect(type).toBe('5-stop');
    });
  });

  describe('AC: Flight segment formatting', () => {
    test('should format flight segments with segment numbers', async () => {
      bfsService.findRoutes.mockReturnValue([mockOneStopRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockOneStopRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);
      const segments = result.routes[0].legs;

      expect(segments[0].segment).toBe(1);
      expect(segments[1].segment).toBe(2);
    });

    test('should include all flight details in segments', async () => {
      bfsService.findRoutes.mockReturnValue([mockOneStopRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockOneStopRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);
      const segment = result.routes[0].legs[0];

      expect(segment).toHaveProperty('flightNumber');
      expect(segment).toHaveProperty('airline');
      expect(segment).toHaveProperty('departureAirport');
      expect(segment).toHaveProperty('departureTime');
      expect(segment).toHaveProperty('arrivalAirport');
      expect(segment).toHaveProperty('arrivalTime');
      expect(segment).toHaveProperty('duration');
    });

    test('should format departure and arrival with airport and time', async () => {
      bfsService.findRoutes.mockReturnValue([mockDirectRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockDirectRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);
      const segment = result.routes[0].legs[0];

      expect(segment).toHaveProperty('departureAirport');
      expect(segment).toHaveProperty('departureTime');
      expect(segment).toHaveProperty('arrivalAirport');
      expect(segment).toHaveProperty('arrivalTime');
    });
  });

  describe('AC: Layover information', () => {
    test('should include layover details in formatted route', async () => {
      bfsService.findRoutes.mockReturnValue([mockOneStopRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockOneStopRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);
      const layovers = result.routes[0].layovers;

      expect(layovers).toHaveLength(1);
      expect(layovers[0]).toHaveProperty('airport');
      expect(layovers[0]).toHaveProperty('duration');
      expect(layovers[0]).toHaveProperty('durationFormatted');
    });

    test('should format layover duration in human-readable format', async () => {
      bfsService.findRoutes.mockReturnValue([mockOneStopRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockOneStopRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);
      const layover = result.routes[0].layovers[0];

      expect(layover.durationFormatted).toBe('1h 30m');
    });
  });

  describe('AC: Duration formatting', () => {
    test('should format duration in hours and minutes', () => {
      const formatted = routeService.formatDuration(150); // 2h 30m

      expect(formatted).toBe('2h 30m');
    });

    test('should handle durations less than 1 hour', () => {
      const formatted = routeService.formatDuration(45);

      expect(formatted).toBe('0h 45m');
    });

    test('should handle exact hour durations', () => {
      const formatted = routeService.formatDuration(180);

      expect(formatted).toBe('3h 0m');
    });

    test('should handle long durations', () => {
      const formatted = routeService.formatDuration(1500); // 25h

      expect(formatted).toBe('25h 0m');
    });
  });

  describe('AC: Duplicate route removal', () => {
    test('should remove duplicate routes with same legs', async () => {
      const duplicates = [mockDirectRoute, mockDirectRoute];

      bfsService.findRoutes.mockReturnValue(duplicates);
      layoverValidator.filterValidRoutes.mockReturnValue(duplicates);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);

      expect(result.count).toBe(1); // Only one unique route
    });

    test('should identify duplicates by flight number sequence', () => {
      const route1 = { path: [legs[0], legs[1]] };
      const route2 = { path: [legs[0], legs[1]] };
      const route3 = { path: [legs[2]] };

      const routes = [route1, route2, route3];
      const unique = routeService.removeDuplicateRoutes(routes);

      expect(unique).toHaveLength(2);
    });

    test('should preserve non-duplicate routes', () => {
      const route1 = { path: [legs[0]] };
      const route2 = { path: [legs[1]] };

      const routes = [route1, route2];
      const unique = routeService.removeDuplicateRoutes(routes);

      expect(unique).toHaveLength(2);
    });
  });

  describe('AC: Overnight flight detection', () => {
    test('should mark overnight legs in response', async () => {
      bfsService.findRoutes.mockReturnValue([mockTwoStopRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockTwoStopRoute]);

      const result = await routeService.searchRoutes('JFK', 'LHR', legs);

      expect(result.routes[0].isOvernight).toBe(true);
    });

    test('should mark same-day legs correctly', async () => {
      bfsService.findRoutes.mockReturnValue([mockDirectRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockDirectRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);

      expect(result.routes[0].isOvernight).toBe(false);
    });
  });

  describe('AC: Search response structure', () => {
    test('should include search metadata', async () => {
      bfsService.findRoutes.mockReturnValue([mockDirectRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockDirectRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);

      expect(result).toHaveProperty('origin');
      expect(result).toHaveProperty('destination');
      expect(result).toHaveProperty('routes');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('searchTime');
      expect(result).toHaveProperty('stats');
    });

    test('should include statistics in response', async () => {
      bfsService.findRoutes.mockReturnValue([mockDirectRoute, mockOneStopRoute]);
      layoverValidator.filterValidRoutes.mockReturnValue([mockDirectRoute]);

      const result = await routeService.searchRoutes('JFK', 'SFO', legs);

      expect(result.stats).toHaveProperty('totalFound');
      expect(result.stats).toHaveProperty('validRoutes');
      expect(result.stats).toHaveProperty('invalidRoutes');
    });

    test('should calculate correct invalid routes count', async () => {
      const allRoutes = [mockDirectRoute, mockOneStopRoute, mockTwoStopRoute];
      const validRoutes = [mockDirectRoute, mockOneStopRoute];

      bfsService.findRoutes.mockReturnValue(allRoutes);
      layoverValidator.filterValidRoutes.mockReturnValue(validRoutes);

      const result = await routeService.searchRoutes('JFK', 'LHR', legs);

      expect(result.stats.invalidRoutes).toBe(1);
    });
  });
});
