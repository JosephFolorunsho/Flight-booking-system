const request = require('supertest');   
const { Pool } = require('pg');   
const app = require('../../../src/server');   
   
describe('Booking API - Integration Tests', () => {   
  let pool;   
   
  beforeAll(async () => {   
    pool = new Pool({   
      host: process.env.DB_HOST || 'localhost',   
      port: process.env.DB_PORT || 5432,   
      database: process.env.DB_NAME || 'skyroute_test',   
      user: process.env.DB_USER || 'postgres',   
      password: process.env.DB_PASSWORD || 'postgres'   
    });   
   
    // Setup test database   
    const client = await pool.connect();   
    try {   
      await client.query('DROP TABLE IF EXISTS booking_legs CASCADE');   
      await client.query('DROP TABLE IF EXISTS bookings CASCADE');   
      await client.query('DROP TABLE IF EXISTS flights_cache CASCADE');   
      await client.query('DROP TABLE IF EXISTS airlines CASCADE');   
      await client.query('DROP TABLE IF EXISTS airports CASCADE');   
   
      // Run migrations   
      const migrationSQL = require('fs').readFileSync(   
        './database/migrations/001_initial_schema.sql',   
        'utf-8'   
      );   
      await client.query(migrationSQL);   
    } finally {   
      client.release();   
    }   
  });   
   
  afterAll(async () => {   
    await pool.end();   
  });   
   
  describe('POST /api/bookings', () => {   
    it('should create booking successfully', async () => {   
      const response = await request(app)   
        .post('/api/bookings')   
        .send({   
          userEmail: 'test@example.com',   
          passengerName: 'John Doe',   
          totalPrice: 599.99,   
          currency: 'USD',   
          flights: [   
            {   
              flightNumber: 'AA100',   
              airline: 'AA',   
              departure: {   
                airport: 'JFK',   
                time: '2026-05-01T10:00:00Z'   
              },   
              arrival: {   
                airport: 'LAX',   
                time: '2026-05-01T13:00:00Z'   
              },   
              duration: 180,   
              price: 599.99   
            }   
          ]   
        });   
   
      expect(response.status).toBe(201);   
      expect(response.body.success).toBe(true);   
      expect(response.body.bookingReference).toBeDefined();   
      expect(response.body.status).toBe('confirmed');   
    });   
   
    it('should return 400 for missing fields', async () => {   
      const response = await request(app)   
        .post('/api/bookings')   
        .send({   
          userEmail: 'test@example.com'   
        });   
   
      expect(response.status).toBe(400);   
      expect(response.body.error.code).toBe('MISSING_FIELDS');   
    });   
   
    it('should return 400 for invalid email', async () => {   
      const response = await request(app)   
        .post('/api/bookings')   
        .send({   
          userEmail: 'not-an-email',   
          totalPrice: 100,   
          flights: []   
        });   
   
      expect(response.status).toBe(400);   
      expect(response.body.error.code).toBe('INVALID_EMAIL');   
    });   
   
    it('should return 402 for payment failure', async () => {   
      const response = await request(app)   
        .post('/api/bookings')   
        .send({   
          userEmail: 'fail@example.com',   
          passengerName: 'John Doe',   
          totalPrice: 100.00,   
          flights: [   
            {   
              flightNumber: 'AA200',   
              airline: 'AA',   
              departure: {   
                airport: 'JFK',   
                time: '2026-05-01T10:00:00Z'   
              },   
              arrival: {   
                airport: 'LAX',   
                time: '2026-05-01T13:00:00Z'   
              },   
              duration: 180,   
              price: 100.00   
            }   
          ]   
        });   
   
      expect(response.status).toBe(402);   
      expect(response.body.error.code).toBe('PAYMENT_FAILED');   
    });   
  });   
   
  describe('GET /api/bookings/:reference', () => {   
    let bookingId;   
   
    beforeAll(async () => {   
      const response = await request(app)   
        .post('/api/bookings')   
        .send({   
          userEmail: 'retrieve@example.com',   
          passengerName: 'Jane Doe',   
          totalPrice: 450.00,   
          flights: [   
            {   
              flightNumber: 'UA300',   
              airline: 'UA',   
              departure: {   
                airport: 'JFK',   
                time: '2026-05-02T14:00:00Z'   
              },   
              arrival: {   
                airport: 'LAX',   
                time: '2026-05-02T17:00:00Z'   
              },   
              duration: 180,   
              price: 450.00   
            }   
          ]   
        });   
      bookingId = response.body.bookingReference;   
    });   
   
    it('should retrieve booking by reference', async () => {   
      const response = await request(app)   
        .get(`/api/bookings/${bookingId}`);   
   
      expect(response.status).toBe(200);   
      expect(response.body.bookingReference).toBe(bookingId);   
      expect(response.body.email).toBe('retrieve@example.com');   
      expect(response.body.status).toBe('confirmed');   
    });   
   
    it('should return 404 for non-existent booking', async () => {   
      const response = await request(app)   
        .get('/api/bookings/00000000-0000-0000-0000-000000000000');   
   
      expect(response.status).toBe(404);   
      expect(response.body.error.code).toBe('BOOKING_NOT_FOUND');   
    });   
   
    it('should return 400 for invalid UUID', async () => {   
      const response = await request(app)   
        .get('/api/bookings/not-a-uuid');   
   
      expect(response.status).toBe(400);   
      expect(response.body.error.code).toBe('INVALID_REFERENCE');   
    });   
  });   
});   
 

backend/test/unit/utils/validation.test.js 

javascript 

Copy 

const validation = require('../../../src/utils/validation');   
   
describe('Validation Utilities', () => {   
  describe('validateEmail', () => {   
    it('should accept valid emails', () => {   
      expect(validation.validateEmail('test@example.com')).toBe(true);   
      expect(validation.validateEmail('user+tag@domain.co.uk')).toBe(true);   
    });   
   
    it('should reject invalid emails', () => {   
      expect(validation.validateEmail('not-an-email')).toBe(false);   
      expect(validation.validateEmail('missing@domain')).toBe(false);   
      expect(validation.validateEmail('')).toBe(false);   
    });   
  });   
   
  describe('validatePrice', () => {   
    it('should accept valid prices', () => {   
      expect(validation.validatePrice(99.99)).toBe(true);   
      expect(validation.validatePrice(0.01)).toBe(true);   
    });   
   
    it('should reject invalid prices', () => {   
      expect(validation.validatePrice(0)).toBe(false);   
      expect(validation.validatePrice(-100)).toBe(false);   
      expect(validation.validatePrice('not-a-number')).toBe(false);   
    });   
  });   
   
  describe('validateAirportCode', () => {   
    it('should accept valid airport codes', () => {   
      expect(validation.validateAirportCode('JFK')).toBe(true);   
      expect(validation.validateAirportCode('LAX')).toBe(true);   
      expect(validation.validateAirportCode('LHR')).toBe(true);   
    });   
   
    it('should reject invalid airport codes', () => {   
      expect(validation.validateAirportCode('JFKK')).toBe(false);   
      expect(validation.validateAirportCode('jfk')).toBe(false);   
      expect(validation.validateAirportCode('J')).toBe(false);   
    });   
  });   
});   
 