const paymentService = require('../../../src/services/paymentService');   
   
describe('PaymentService - Unit Tests', () => {   
  describe('processPayment', () => {   
    it('should return success with transaction ID', async () => {   
      paymentService.setFailureRate(0);   
   
      const result = await paymentService.processPayment({   
        bookingReference: 'test-123',   
        amount: 599.99,   
        currency: 'USD',   
        paymentMethod: 'credit_card'   
      });   
   
      expect(result.success).toBe(true);   
      expect(result.transactionId).toMatch(/^TXN-/);   
      expect(result.amount).toBe(599.99);   
    });   
   
    it('should handle payment failure', async () => {   
      paymentService.setFailureRate(1.0);   
   
      const result = await paymentService.processPayment({   
        bookingReference: 'test-456',   
        amount: 100.00,   
        currency: 'USD'   
      });   
   
      expect(result.success).toBe(false);   
      expect(result.error).toBeDefined();   
      expect(result.transactionId).toBeNull();   
    });   
   
    it('should fail for suspicious emails', async () => {   
      paymentService.setFailureRate(0);   
   
      const result = await paymentService.processPayment({   
        userEmail: 'fail@example.com',   
        amount: 100.00   
      });   
   
      expect(result.success).toBe(false);   
    });   
   
    it('should fail for high amounts', async () => {   
      paymentService.setFailureRate(0);   
   
      const result = await paymentService.processPayment({   
        amount: 50000.00   
      });   
   
      expect(result.success).toBe(false);   
    });   
  });   
   
  describe('generateTransactionId', () => {   
    it('should generate unique transaction IDs', () => {   
      const id1 = paymentService.generateTransactionId();   
      const id2 = paymentService.generateTransactionId();   
   
      expect(id1).not.toEqual(id2);   
      expect(id1).toMatch(/^TXN-\d+-[A-Z0-9]+$/);   
    });   
  });   
   
  describe('setFailureRate', () => {   
    it('should clamp failure rate between 0 and 1', () => {   
      paymentService.setFailureRate(1.5);   
      expect(paymentService.failureRate).toBe(1);   
   
      paymentService.setFailureRate(-0.5);   
      expect(paymentService.failureRate).toBe(0);   
    });   
  });   
});   
