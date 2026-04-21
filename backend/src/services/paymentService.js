const logger = require('../utils/logger');   
   
class PaymentService {   
  constructor() {   
    this.failureRate = 0.3;   
    this.simulateDelay = true;   
  }   
   
  async processPayment(paymentData) {   
    const { bookingReference, amount, currency, paymentMethod, userEmail } = paymentData;   
   
    logger.info('Payment Service: Processing payment', {   
      bookingReference,   
      amount,   
      currency,   
      paymentMethod   
    });   
   
    if (this.simulateDelay) {   
      await this.delay(500 + Math.random() * 1000);   
    }   
   
    const shouldFail = this.shouldSimulateFailure(paymentData);   
   
    if (shouldFail) {   
      const error = this.generatePaymentError();   
      logger.error('Payment Service: Payment failed', {   
        bookingReference,   
        error: error.message   
      });   
   
      return {   
        success: false,   
        transactionId: null,   
        error: error.message,   
        errorCode: error.code,   
        timestamp: new Date().toISOString()   
      };   
    }   
   
    const transactionId = this.generateTransactionId();   
   
    logger.info('Payment Service: Payment successful', {   
      bookingReference,   
      transactionId   
    });   
   
    return {   
      success: true,   
      transactionId,   
      amount,   
      currency,   
      paymentMethod,   
      timestamp: new Date().toISOString()   
    };   
  }   
   
  shouldSimulateFailure(paymentData) {   
    if (paymentData.userEmail && paymentData.userEmail.includes('fail')) {   
      return true;   
    }   
   
    if (paymentData.amount && paymentData.amount > 10000) {   
      return true;   
    }   
   
    if (paymentData.paymentMethod === 'test_fail') {   
      return true;   
    }   
   
    return Math.random() < this.failureRate;   
  }   
   
  generatePaymentError() {   
    const errors = [   
      { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds in account' },   
      { code: 'CARD_DECLINED', message: 'Card declined by issuer' },   
      { code: 'EXPIRED_CARD', message: 'Card has expired' },   
      { code: 'INVALID_CVV', message: 'Invalid CVV code' },   
      { code: 'FRAUD_DETECTED', message: 'Transaction flagged as potentially fraudulent' },   
      { code: 'NETWORK_ERROR', message: 'Payment gateway network error' }   
    ];   
   
    return errors[Math.floor(Math.random() * errors.length)];   
  }   
   
  generateTransactionId() {   
    const timestamp = Date.now();   
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();   
    return `TXN-${timestamp}-${random}`;   
  }   
   
  delay(ms) {   
    return new Promise(resolve => setTimeout(resolve, ms));   
  }   
   
  setFailureRate(rate) {   
    this.failureRate = Math.max(0, Math.min(1, rate));   
    logger.info(`Payment Service: Failure rate set to ${(this.failureRate * 100).toFixed(0)}%`);   
  }   
   
  setDelaySimulation(enabled) {   
    this.simulateDelay = enabled;   
  }   
}   
   
module.exports = new PaymentService();   
 