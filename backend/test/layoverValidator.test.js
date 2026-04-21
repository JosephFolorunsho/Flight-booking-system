const layoverValidator = require('../src/services/layoverValidator');

// Mock the logger to avoid console noise during tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('LayoverValidator - US-14', () => {
  // Mock flight data
  const flight1 = {
    flightNumber: 'AA100',
    departureAirport: 'JFK',
    arrivalAirport: 'LAX',
    departureTime: '2026-04-16T10:00:00Z',
    arrivalTime: '2026-04-16T13:00:00Z',
    duration: 180
  };

  const flight2 = {
    flightNumber: 'UA200',
    departureAirport: 'LAX',
    arrivalAirport: 'SFO',
    departureTime: '2026-04-16T14:30:00Z', // 90 minutes after flight1 arrival
    arrivalTime: '2026-04-16T16:00:00Z',
    duration: 90
  };

  const flight3 = {
    flightNumber: 'DL300',
    departureAirport: 'SFO',
    arrivalAirport: 'SEA',
    departureTime: '2026-04-16T17:30:00Z', 
    arrivalTime: '2026-04-16T18:30:00Z',
    duration: 60
  };

  const shortLayoverFlight = {
    flightNumber: 'BA400',
    departureAirport: 'LAX',
    arrivalAirport: 'SFO',
    departureTime: '2026-04-16T13:30:00Z', // Only 30 minutes after flight1 arrival
    arrivalTime: '2026-04-16T15:00:00Z',
    duration: 90
  };

  const impossibleFlight = {
    flightNumber: 'LH500',
    departureAirport: 'LAX',
    arrivalAirport: 'SFO',
    departureTime: '2026-04-16T12:00:00Z', // Departs before flight1 arrives
    arrivalTime: '2026-04-16T13:30:00Z',
    duration: 90
  };

  describe('AC: Minimum layover enforcement', () => {
    test('should accept layover of exactly 90 minutes', () => {
      const validation = layoverValidator.validateLayover(flight1, flight2);

      expect(validation.valid).toBe(true);
      expect(validation.layoverMinutes).toBe(90);
    });

    test('should reject layover less than 90 minutes', () => {
      const validation = layoverValidator.validateLayover(flight1, shortLayoverFlight);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Layover too short');
      expect(validation.layoverMinutes).toBe(30);
    });

    test('should reject negative layover (impossible connection)', () => {
      const validation = layoverValidator.validateLayover(flight1, impossibleFlight);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Second flight departs before first flight arrives');
      expect(validation.layoverMinutes).toBeLessThan(0);
    });

    test('should validate airport connection', () => {
      const disconnectedFlight = {
        ...flight2,
        departureAirport: 'JFK' // Different from flight1 arrival
      };

      const validation = layoverValidator.validateLayover(flight1, disconnectedFlight);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('do not connect at same airport');
    });
  });

  describe('AC: Layover calculation', () => {
    test('should calculate layover time correctly', () => {
      const validation = layoverValidator.validateLayover(flight1, flight2);

      expect(validation.layoverMinutes).toBe(90);
      expect(validation.layoverHours).toBe('1.50');
    });

    test('should return layover in minutes and hours', () => {
      const validation = layoverValidator.validateLayover(flight1, flight2);

      expect(validation).toHaveProperty('layoverMinutes');
      expect(validation).toHaveProperty('layoverHours');
    });

    test('should handle layovers over 24 hours', () => {
      const shortFlight = {
        ...flight1,
        arrivalTime: '2026-04-16T13:00:00Z'
      };

      const longLayoverFlight = {
        ...flight2,
        departureTime: '2026-04-17T15:00:00Z' // 26 hours later
      };

      const validation = layoverValidator.validateLayover(shortFlight, longLayoverFlight);

      expect(validation.valid).toBe(true); // Still valid, just warns
      expect(validation.layoverMinutes).toBeGreaterThan(1440); // > 24 hours
    });
  });

  describe('AC: Route validation', () => {
    test('should validate entire multi-flight route', () => {
      const route = [flight1, flight2, flight3];
      const validation = layoverValidator.validateRoute(route);

      expect(validation.valid).toBe(true);
      expect(validation.layovers).toHaveLength(2);
      expect(validation.invalidLayovers).toHaveLength(0);
    });

    test('should accept direct flight (no layovers)', () => {
      const validation = layoverValidator.validateRoute([flight1]);

      expect(validation.valid).toBe(true);
      expect(validation.layovers).toHaveLength(0);
    });

    test('should reject route with invalid layover', () => {
      const route = [flight1, shortLayoverFlight, flight3];
      const validation = layoverValidator.validateRoute(route);

      expect(validation.valid).toBe(false);
      expect(validation.invalidLayovers).toHaveLength(1);
      expect(validation.invalidLayovers[0].index).toBe(0);
    });

    test('should reject empty route', () => {
      const validation = layoverValidator.validateRoute([]);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('No flights provided');
    });

    test('should calculate total layover time for route', () => {
      const route = [flight1, flight2, flight3];
      const validation = layoverValidator.validateRoute(route);

      expect(validation).toHaveProperty('totalLayoverTime');
      expect(validation.totalLayoverTime).toBe(180); // 90 + 90 minutes
    });

    test('should identify all invalid layovers in route', () => {
      const route = [flight1, shortLayoverFlight, shortLayoverFlight];
      const validation = layoverValidator.validateRoute(route);

      expect(validation.valid).toBe(false);
      expect(validation.invalidLayovers.length).toBeGreaterThan(0);
    });
  });

  describe('AC: Journey time calculation', () => {
    test('should calculate total journey time', () => {
      const route = [flight1, flight2];
      const journeyTime = layoverValidator.calculateJourneyTime(route);

      expect(journeyTime).toHaveProperty('totalMinutes');
      expect(journeyTime).toHaveProperty('totalHours');
      expect(journeyTime).toHaveProperty('departureTime');
      expect(journeyTime).toHaveProperty('arrivalTime');
    });

    test('should detect same-day journey', () => {
      const route = [flight1, flight2];
      const journeyTime = layoverValidator.calculateJourneyTime(route);

      expect(journeyTime.isOvernight).toBe(false);
    });

    test('should detect overnight journey', () => {
      const overnightFlight = {
        ...flight2,
        arrivalTime: '2026-04-17T02:00:00Z' // Next day
      };

      const route = [flight1, overnightFlight];
      const journeyTime = layoverValidator.calculateJourneyTime(route);

      expect(journeyTime.isOvernight).toBe(true);
    });

    test('should return null for empty route', () => {
      const journeyTime = layoverValidator.calculateJourneyTime([]);

      expect(journeyTime).toBe(null);
    });

    test('should calculate correct journey time with multiple flights', () => {
      const route = [flight1, flight2, flight3];
      const journeyTime = layoverValidator.calculateJourneyTime(route);

      // From 10:00 to 18:30 = 8.5 hours
      expect(journeyTime.totalHours).toBe('8.50');
      expect(journeyTime.totalMinutes).toBe(510);
    });
  });

  describe('AC: Route filtering', () => {
    test('should filter out invalid routes', () => {
      const routes = [
        { path: [flight1, flight2, flight3] },
        { path: [flight1, shortLayoverFlight] },
        { path: [flight1, flight2] }
      ];

      const validRoutes = layoverValidator.filterValidRoutes(routes);

      expect(validRoutes.length).toBe(2); // Only valid routes
      expect(validRoutes[0]).toHaveProperty('validation');
      expect(validRoutes[0]).toHaveProperty('journeyTime');
    });

    test('should include validation details in filtered routes', () => {
      const routes = [
        { path: [flight1, flight2], stops: 1 }
      ];

      const validRoutes = layoverValidator.filterValidRoutes(routes);

      expect(validRoutes[0].validation).toHaveProperty('valid');
      expect(validRoutes[0].journeyTime).toHaveProperty('totalMinutes');
    });

    test('should preserve route metadata when filtering', () => {
      const routes = [
        { path: [flight1], stops: 0, price: 100 }
      ];

      const validRoutes = layoverValidator.filterValidRoutes(routes);

      expect(validRoutes[0].price).toBe(100); // Original metadata preserved
    });
  });

  describe('Error handling', () => {
    test('should handle missing flight data gracefully', () => {
      const incompleteFlights = [
        { flightNumber: 'AA100' }, // Missing times and airports
        { flightNumber: 'UA200' }
      ];

      const validation = layoverValidator.validateRoute(incompleteFlights);

      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('layovers');
    });

    test('should handle null/undefined input', () => {
      const validation = layoverValidator.validateRoute(null);

      expect(validation.valid).toBe(false);
    });

    test('should handle flights with invalid date formats', () => {
      const invalidFlight = {
        flightNumber: 'AA100',
        departureAirport: 'JFK',
        arrivalAirport: 'LAX',
        departureTime: 'invalid-date',
        arrivalTime: 'invalid-date'
      };

      // This should not crash
      expect(() => {
        layoverValidator.validateLayover(flight1, invalidFlight);
      }).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    test('should handle minimum layover boundary (exactly 90 minutes)', () => {
      const validation = layoverValidator.validateLayover(flight1, flight2);

      expect(validation.valid).toBe(true);
      expect(validation.layoverMinutes).toBe(90);
    });

    test('should reject layover one minute below minimum', () => {
      const almostValidFlight = {
        ...flight2,
        departureTime: '2026-04-16T14:29:00Z' // 89 minutes
      };

      const validation = layoverValidator.validateLayover(flight1, almostValidFlight);

      expect(validation.valid).toBe(false);
    });

    test('should validate route with many connections', () => {
      const manyFlights = [flight1, flight2, flight3];
      const validation = layoverValidator.validateRoute(manyFlights);

      expect(validation.layovers.length).toBe(2);
    });

    test('should return accurate airport for each layover', () => {
      const route = [flight1, flight2, flight3];
      const validation = layoverValidator.validateRoute(route);

      expect(validation.layovers[0].airport).toBe('LAX');
      expect(validation.layovers[1].airport).toBe('SFO');
    });
  });
});
