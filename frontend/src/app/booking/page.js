'use client';

import { useState } from 'react';
import { createBooking } from '@/services/api';

export default function BookingPage() {
  const [userEmail, setUserEmail] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const bookingData = {
        userEmail,
        passengerName,
        totalPrice: parseFloat(price),
        currency: 'USD',
        paymentMethod: 'credit_card',
        flights: [
          {
            flightNumber,
            airline,
            departure: {
              airport: origin,
              time: departureTime
            },
            arrival: {
              airport: destination,
              time: arrivalTime
            },
            duration: Math.round((new Date(arrivalTime) - new Date(departureTime)) / 60000),
            price: parseFloat(price)
          }
        ]
      };

      console.log('Creating booking:', bookingData);

      const result = await createBooking(bookingData);
      
      console.log('Booking result:', result);
      
      if (result.success) {
        setSuccess(result);
        // Reset form
        setUserEmail('');
        setPassengerName('');
        setFlightNumber('');
        setAirline('');
        setOrigin('');
        setDestination('');
        setDepartureTime('');
        setArrivalTime('');
        setPrice('');
      } else {
        setError(result.paymentError || 'Booking failed');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create Booking</h1>
      <p className="description">Book a flight with secure transaction handling</p>

      <form onSubmit={handleSubmit} className="booking-form">
        <div className="form-section">
          <h3>Passenger Information</h3>
          
          <div className="form-group">
            <label>Email Address *</label>
            <input 
              type="email" 
              placeholder="passenger@example.com" 
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Passenger Name *</label>
            <input 
              type="text" 
              placeholder="John Doe" 
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Flight Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Flight Number *</label>
              <input 
                type="text" 
                placeholder="AA100" 
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Airline *</label>
              <input 
                type="text" 
                placeholder="American Airlines" 
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Origin *</label>
              <input 
                type="text" 
                placeholder="JFK" 
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                maxLength={3}
                required
              />
            </div>

            <div className="form-group">
              <label>Destination *</label>
              <input 
                type="text" 
                placeholder="LAX" 
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                maxLength={3}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Departure Time *</label>
              <input 
                type="datetime-local" 
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Arrival Time *</label>
              <input 
                type="datetime-local" 
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                min={departureTime}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Price (USD) *</label>
            <input 
              type="number" 
              step="0.01"
              placeholder="599.99" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0.01"
              required
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
          {loading ? 'Processing...' : 'Create Booking'}
        </button>
      </form>

      {error && (
        <div className="alert alert-error">
          <strong>Booking Failed:</strong> {error}
          <p><small>Note: Payment failures trigger automatic rollback (US-17)</small></p>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <h3>✅ Booking Confirmed!</h3>
          <p><strong>Booking Reference:</strong> {success.bookingReference}</p>
          <p><strong>Transaction ID:</strong> {success.transactionId}</p>
          <p><strong>Email:</strong> {success.userEmail}</p>
          <p><strong>Total Price:</strong> ${success.totalPrice} {success.currency}</p>
          <p><strong>Status:</strong> {success.status}</p>
          <p><strong>Response Time:</strong> {success.responseTime}ms</p>
        </div>
      )}


    </div>
  );
}