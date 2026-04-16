const bfsService = require('../services/bfsService');
const graphService = require('../services/graphService');

// Mock the logger to avoid console noise during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('BFSService', () => {
  const flights = [
    {
      flightNumber: 'FL001',
      departureAirport: 'LHR',
      arrivalAirport: 'CDG',
    },
    {
      flightNumber: 'FL002',
      departureAirport: 'CDG',
      arrivalAirport: 'FRA',
    },
    {
      flightNumber: 'FL003',
      departureAirport: 'FRA',
      arrivalAirport: 'JFK',
    },
    {
      flightNumber: 'FL004',
      departureAirport: 'LHR',
      arrivalAirport: 'JFK',
    },
    {
      flightNumber: 'FL005',
      departureAirport: 'CDG',
      arrivalAirport: 'JFK',
    },
  ];

  beforeEach(() => {
    // Reset and rebuild the graph before each test
    graphService.clear();
    graphService.buildGraph(flights);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findRoutes()', () => {
    test('finds all routes within the maximum number of stops', () => {
      const routes = bfsService.findRoutes('LHR', 'JFK', 2);
      expect(routes.length).toBe(3);
    });

    test('returns routes sorted by number of stops', () => {
      const routes = bfsService.findRoutes('LHR', 'JFK', 2);
      expect(routes[0].stops).toBe(0); // Direct flight first
    });

    test('finds a direct flight correctly', () => {
      const routes = bfsService.findRoutes('LHR', 'JFK', 0);
      expect(routes.length).toBe(1);
      expect(routes[0].totalFlights).toBe(1);
      expect(routes[0].stops).toBe(0);
    });

    test('returns an empty array when no route exists', () => {
      const routes = bfsService.findRoutes('LHR', 'DXB', 2);
      expect(routes).toEqual([]);
    });

    test('throws an error when origin is missing', () => {
      expect(() =>
        bfsService.findRoutes(null, 'JFK', 2)
      ).toThrow('Origin and destination are required');
    });

    test('throws an error when destination is missing', () => {
      expect(() =>
        bfsService.findRoutes('LHR', null, 2)
      ).toThrow('Origin and destination are required');
    });

    test('throws an error when origin and destination are the same', () => {
      expect(() =>
        bfsService.findRoutes('LHR', 'LHR', 2)
      ).toThrow('Origin and destination cannot be the same');
    });

    test('respects the maximum stops constraint', () => {
      const routes = bfsService.findRoutes('LHR', 'JFK', 1);
      expect(routes.length).toBe(2); // Direct and one-stop routes only
    });
  });

  describe('findDirectFlights()', () => {
    test('returns only direct flights', () => {
      const flights = bfsService.findDirectFlights('LHR', 'JFK');
      expect(flights.length).toBe(1);
      expect(flights[0].arrivalAirport).toBe('JFK');
    });

    test('returns an empty array when no direct flights exist', () => {
      const flights = bfsService.findDirectFlights('FRA', 'LHR');
      expect(flights).toEqual([]);
    });
  });

  describe('routeExists()', () => {
    test('returns true when a route exists', () => {
      const exists = bfsService.routeExists('LHR', 'JFK', 2);
      expect(exists).toBe(true);
    });

    test('returns false when no route exists', () => {
      const exists = bfsService.routeExists('LHR', 'DXB', 2);
      expect(exists).toBe(false);
    });
  });
});