
const graphService = require('../src/services/graphService');

describe('Graph Service - US-11', () => {
  // Mock flight data
  const mockFlights = [
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
      departureTime: '2026-04-16T15:00:00Z',
      arrivalTime: '2026-04-16T16:30:00Z',
      duration: 90
    },
    {
      flightNumber: 'DL300',
      airline: 'Delta',
      departureAirport: 'JFK',
      arrivalAirport: 'ORD',
      departureTime: '2026-04-16T11:00:00Z',
      arrivalTime: '2026-04-16T13:00:00Z',
      duration: 120
    },
    {
      flightNumber: 'BA400',
      airline: 'British Airways',
      departureAirport: 'ORD',
      arrivalAirport: 'LAX',
      departureTime: '2026-04-16T14:00:00Z',
      arrivalTime: '2026-04-16T16:00:00Z',
      duration: 120
    }
  ];

  beforeEach(() => {
    // Clear graph before each test
    graphService.clear();
  });

  describe('AC: Graph structure correctly represents relationships', () => {
    test('should build graph with correct adjacency list structure', () => {
      const stats = graphService.buildGraph(mockFlights);

      expect(stats.nodes).toBe(4); // JFK, LAX, SFO, ORD
      expect(stats.edges).toBe(4); // 4 flights

      // Verify adjacency list structure
      expect(graphService.getOutgoingFlights('JFK')).toHaveLength(2); // AA100, DL300
      expect(graphService.getOutgoingFlights('LAX')).toHaveLength(1); // UA200
      expect(graphService.getOutgoingFlights('ORD')).toHaveLength(1); // BA400
      expect(graphService.getOutgoingFlights('SFO')).toHaveLength(0); // No outgoing
    });

    test('should represent airports as nodes', () => {
      graphService.buildGraph(mockFlights);

      const airports = graphService.getAllAirports();
      expect(airports).toContain('JFK');
      expect(airports).toContain('LAX');
      expect(airports).toContain('SFO');
      expect(airports).toContain('ORD');
      expect(airports).toHaveLength(4);
    });

    test('should represent flights as edges', () => {
      graphService.buildGraph(mockFlights);

      const jfkFlights = graphService.getOutgoingFlights('JFK');
      expect(jfkFlights).toHaveLength(2);
      expect(jfkFlights[0].flightNumber).toBe('AA100');
      expect(jfkFlights[1].flightNumber).toBe('DL300');
    });
  });

  describe('AC: Data mapping between database and graph is accurate', () => {
    test('should accurately map flight data to graph edges', () => {
      graphService.buildGraph(mockFlights);

      const jfkFlights = graphService.getOutgoingFlights('JFK');
      const aa100 = jfkFlights.find(f => f.flightNumber === 'AA100');

      expect(aa100).toBeDefined();
      expect(aa100.airline).toBe('American Airlines');
      expect(aa100.departureAirport).toBe('JFK');
      expect(aa100.arrivalAirport).toBe('LAX');
      expect(aa100.departureTime).toBe('2026-04-16T10:00:00Z');
      expect(aa100.arrivalTime).toBe('2026-04-16T13:00:00Z');
      expect(aa100.duration).toBe(180);
    });

    test('should handle flights with missing origin or destination', () => {
      const invalidFlights = [
        { flightNumber: 'XX100', departureAirport: 'JFK' }, // Missing arrival
        { flightNumber: 'XX200', arrivalAirport: 'LAX' }, // Missing departure
        ...mockFlights
      ];

      const stats = graphService.buildGraph(invalidFlights);

      // Should only build graph with valid flights
      expect(stats.edges).toBe(4); // Only 4 valid flights
      expect(stats.nodes).toBe(4);
    });

    test('should preserve all flight properties in graph', () => {
      const flightWithExtraProps = [
        {
          ...mockFlights[0],
          status: 'scheduled',
          terminal: 'T4',
          gate: 'A12'
        }
      ];

      graphService.buildGraph(flightWithExtraProps);
      const flights = graphService.getOutgoingFlights('JFK');

      expect(flights[0].status).toBe('scheduled');
      expect(flights[0].terminal).toBe('T4');
      expect(flights[0].gate).toBe('A12');
    });
  });

  describe('AC: Graph supports traversal operations', () => {
    test('should support getOutgoingFlights traversal', () => {
      graphService.buildGraph(mockFlights);

      const jfkFlights = graphService.getOutgoingFlights('JFK');
      expect(jfkFlights).toHaveLength(2);
      expect(jfkFlights.every(f => f.departureAirport === 'JFK')).toBe(true);
    });

    test('should return empty array for airport with no outgoing flights', () => {
      graphService.buildGraph(mockFlights);

      const sfoFlights = graphService.getOutgoingFlights('SFO');
      expect(sfoFlights).toEqual([]);
    });

    test('should return empty array for non-existent airport', () => {
      graphService.buildGraph(mockFlights);

      const flights = graphService.getOutgoingFlights('XXX');
      expect(flights).toEqual([]);
    });

    test('should support hasAirport check', () => {
      graphService.buildGraph(mockFlights);

      expect(graphService.hasAirport('JFK')).toBe(true);
      expect(graphService.hasAirport('LAX')).toBe(true);
      expect(graphService.hasAirport('XXX')).toBe(false);
    });

    test('should support getAllAirports retrieval', () => {
      graphService.buildGraph(mockFlights);

      const airports = graphService.getAllAirports();
      expect(airports).toHaveLength(4);
      expect(airports).toEqual(expect.arrayContaining(['JFK', 'LAX', 'SFO', 'ORD']));
    });
  });

  describe('AC: No missing or duplicate nodes', () => {
    test('should not create duplicate nodes', () => {
      const duplicateFlights = [
        ...mockFlights,
        {
          flightNumber: 'AA101',
          departureAirport: 'JFK',
          arrivalAirport: 'LAX',
          departureTime: '2026-04-16T12:00:00Z',
          arrivalTime: '2026-04-16T15:00:00Z',
          duration: 180
        }
      ];

      graphService.buildGraph(duplicateFlights);

      const airports = graphService.getAllAirports();
      const uniqueAirports = new Set(airports);

      expect(airports.length).toBe(uniqueAirports.size); // No duplicates
      expect(airports).toHaveLength(4); // Still only 4 unique airports
    });

    test('should include all destination airports as nodes', () => {
      graphService.buildGraph(mockFlights);

      // SFO only appears as destination, should still be a node
      expect(graphService.hasAirport('SFO')).toBe(true);
    });

    test('should validate graph has no duplicate nodes', () => {
      graphService.buildGraph(mockFlights);

      const validation = graphService.validateGraph();
      expect(validation.valid).toBe(true);
      expect(validation.issues).not.toContain('Duplicate nodes detected');
    });
  });

  describe('AC: Graph creation performs efficiently', () => {
    test('should build graph in under 100ms for 100 flights', () => {
      // Generate 100 flights
      const largeFlightSet = [];
      for (let i = 0; i < 100; i++) {
        largeFlightSet.push({
          flightNumber: `FL${i}`,
          airline: 'Test Airline',
          departureAirport: `AP${i % 10}`,
          arrivalAirport: `AP${(i + 1) % 10}`,
          departureTime: '2026-04-16T10:00:00Z',
          arrivalTime: '2026-04-16T12:00:00Z',
          duration: 120
        });
      }

      const stats = graphService.buildGraph(largeFlightSet);

      expect(stats.buildTime).toBeLessThan(100);
      expect(stats.edges).toBe(100);
    });

    test('should return build time in stats', () => {
      const stats = graphService.buildGraph(mockFlights);

      expect(stats).toHaveProperty('buildTime');
      expect(typeof stats.buildTime).toBe('number');
      expect(stats.buildTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty flight array efficiently', () => {
      const stats = graphService.buildGraph([]);

      expect(stats.nodes).toBe(0);
      expect(stats.edges).toBe(0);
      expect(stats.buildTime).toBeLessThan(10);
    });
  });

  describe('AC: Data integrity maintained', () => {
    test('should maintain data integrity after multiple builds', () => {
      // Build first time
      graphService.buildGraph(mockFlights);
      const firstStats = graphService.getStats();

      // Build second time with same data
      graphService.buildGraph(mockFlights);
      const secondStats = graphService.getStats();

      expect(secondStats).toEqual(firstStats);
    });

    test('should clear previous graph when building new one', () => {
      graphService.buildGraph(mockFlights);
      expect(graphService.getAllAirports()).toHaveLength(4);

      const newFlights = [
        {
          flightNumber: 'XX100',
          departureAirport: 'ATL',
          arrivalAirport: 'DFW',
          departureTime: '2026-04-16T10:00:00Z',
          arrivalTime: '2026-04-16T12:00:00Z',
          duration: 120
        }
      ];

      graphService.buildGraph(newFlights);
      expect(graphService.getAllAirports()).toHaveLength(2); // Only ATL, DFW
      expect(graphService.hasAirport('JFK')).toBe(false); // Old data cleared
    });

    test('should validate graph integrity', () => {
      graphService.buildGraph(mockFlights);

      const validation = graphService.validateGraph();
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('issues');
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    test('should provide accurate graph statistics', () => {
      graphService.buildGraph(mockFlights);

      const stats = graphService.getStats();
      expect(stats.totalNodes).toBe(4);
      expect(stats.totalEdges).toBe(4);
      expect(parseFloat(stats.avgDegree)).toBeCloseTo(1.0, 1); // 4 edges / 4 nodes
    });

    test('should handle null or undefined input gracefully', () => {
      const stats1 = graphService.buildGraph(null);
      expect(stats1.nodes).toBe(0);
      expect(stats1.edges).toBe(0);

      const stats2 = graphService.buildGraph(undefined);
      expect(stats2.nodes).toBe(0);
      expect(stats2.edges).toBe(0);
    });
  });

  describe('Graph Utility Methods', () => {
    test('should clear graph completely', () => {
      graphService.buildGraph(mockFlights);
      expect(graphService.getAllAirports()).toHaveLength(4);

      graphService.clear();
      expect(graphService.getAllAirports()).toHaveLength(0);
      expect(graphService.getStats().totalNodes).toBe(0);
    });

    test('should detect orphaned nodes in validation', () => {
      // SFO has no outgoing flights (orphaned node)
      graphService.buildGraph(mockFlights);

      const orphaned = graphService.getOrphanedNodes();
      // SFO is orphaned (no outgoing flights)
      expect(orphaned).toContain('SFO');
    });
  });
});