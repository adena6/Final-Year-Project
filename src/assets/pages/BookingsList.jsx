import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './BookingsList.css';

const BookingsList = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [cancelError, setCancelError] = useState(null);
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:5001';

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/bookings`, {
          withCredentials: true
        });
        setBookings(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchBookings();
  }, [user]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancelLoadingId(bookingId);
    setCancelError(null);

    try {
      await axios.delete(`${API_BASE_URL}/api/bookings/${bookingId}`, {
        withCredentials: true
      });
      
      setBookings(bookings.filter(booking => booking.booking_id !== bookingId));
    } catch (err) {
      setCancelError(err.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setCancelLoadingId(null);
    }
  };

  if (loading) return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p>Loading your bookings...</p>
    </div>
  );

  if (error) return (
    <div className="error-state">
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className="retry-button">
        Try Again
      </button>
    </div>
  );

  return (
    <div className="bookings-container">
      <h1 className="bookings-title">My Bookings</h1>
      
      {cancelError && (
        <div className="error-message">
          <p>{cancelError}</p>
        </div>
      )}

      {bookings.length > 0 ? (
        <div className="bookings-grid">
          {bookings.map(booking => (
            <div key={booking.booking_id} className="booking-card">
              <div className="booking-header">
                <h3 className="service-name">{booking.service_name || 'Service'}</h3>
                <span className={`status-badge ${booking.status.toLowerCase()}`}>
                  {booking.status}
                </span>
              </div>
              
              <div className="booking-details">
                <p><strong>Date:</strong> {new Date(booking.booking_date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {booking.booking_time}</p>
                <p><strong>Location:</strong> {booking.store_name}</p>
              </div>

              <div className="booking-actions">
                <button 
                  onClick={() => navigate(`/businesses/${booking.store_id}`)}
                  className="action-button view-store"
                >
                  View Store
                </button>
                
                {booking.status.toLowerCase() === 'confirmed' && (
                  <button
                    onClick={() => handleCancelBooking(booking.booking_id)}
                    className="action-button cancel"
                    disabled={cancelLoadingId === booking.booking_id}
                  >
                    {cancelLoadingId === booking.booking_id ? (
                      <span className="button-loading"></span>
                    ) : (
                      'Cancel Booking'
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-bookings">
          <p>You have no bookings yet</p>
          <button 
            onClick={() => navigate('/businesses')} 
            className="action-button primary"
          >
            Browse Services
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingsList; 