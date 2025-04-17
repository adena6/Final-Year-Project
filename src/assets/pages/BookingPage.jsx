import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './BookingPage.css';

const BookingPage = () => {
  const { id: businessId, serviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [store, setStore] = useState(null);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBooking, setExistingBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const API_BASE_URL = 'http://localhost:5001';

  // Memoized function to check authentication
  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/check-auth`, {
        withCredentials: true
      });
      setIsAuthenticated(response.data.authenticated);
      if (response.data.authenticated && response.data.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  // Improved function to check existing bookings with retry logic
  const checkExistingBooking = useCallback(async (userId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/bookings/user/${userId}/service/${serviceId}`,
        { withCredentials: true }
      );
      
      if (response.data && response.data.exists) {
        setExistingBooking(response.data.booking);
      } else {
        setExistingBooking(null);
      }
    } catch (error) {
      console.error('Error checking existing booking:', error);
      
      // Implement retry logic for rate limit errors (429)
      if (error.response?.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkExistingBooking(userId);
        }, delay);
      }
    }
  }, [serviceId, retryCount]);

  // Fetch store and service data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [storeRes, serviceRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/stores/${businessId}`),
        axios.get(`${API_BASE_URL}/api/services/${serviceId}`)
      ]);

      const storeService = storeRes.data.services?.find(
        s => s.service_id === parseInt(serviceId)
      );

      if (!storeService) {
        throw new Error('Service not available at this store');
      }

      setStore(storeRes.data);
      setService({
        ...serviceRes.data,
        price: storeService.price,
        duration_minutes: storeService.duration_minutes || 30
      });
    } catch (error) {
      setError(error.response?.data?.error || error.message || "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  }, [businessId, serviceId]);

  // Fetch available time slots with error handling
  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedDate || !service?.duration_minutes) return;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/stores/${businessId}/availability`,
        {
          params: {
            serviceId,
            date: selectedDate,
            duration: service.duration_minutes
          },
          withCredentials: true
        }
      );
      
      setAvailableSlots(response.data.availableSlots || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
      
      if (error.response?.status === 429) {
        setBookingError('Too many requests. Please wait a moment and try again.');
      }
    }
  }, [businessId, serviceId, selectedDate, service]);

  // Group time slots by period
  const groupTimeSlots = useCallback(() => {
    const morning = availableSlots.filter(time => parseInt(time.split(':')[0]) < 12);
    const afternoon = availableSlots.filter(time => {
      const hour = parseInt(time.split(':')[0]);
      return hour >= 12 && hour < 17;
    });
    const evening = availableSlots.filter(time => parseInt(time.split(':')[0]) >= 17);

    return { morning, afternoon, evening };
  }, [availableSlots]);

  const { morning, afternoon, evening } = groupTimeSlots();

  // Handle booking cancellation
  const handleCancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    setCancelling(true);
    setCancelError(null);

    try {
      await axios.delete(
        `${API_BASE_URL}/api/bookings/${existingBooking.booking_id}`,
        { withCredentials: true }
      );
      
      // Refresh data
      setExistingBooking(null);
      if (selectedDate) {
        await fetchAvailableSlots();
      }
      
      // Show success feedback
      setBookingError(null);
      alert('Booking cancelled successfully');
    } catch (error) {
      console.error('Cancellation error:', error);
      setCancelError(
        error.response?.data?.error || 
        error.message || 
        'Failed to cancel booking'
      );
    } finally {
      setCancelling(false);
    }
  };

  // Handle booking submission
  const handleBooking = async () => {
    if (!isAuthenticated || !user) {
      navigate('/login', {
        state: {
          from: location.pathname,
          message: 'Please login to complete your booking'
        }
      });
      return;
    }

    if (!selectedDate || !selectedTime) {
      setBookingError('Please select both date and time');
      return;
    }

    setBookingError(null);
    setIsSubmitting(true);

    try {
      const bookingData = {
        store_id: parseInt(businessId),
        service_id: parseInt(serviceId),
        booking_date: selectedDate,
        booking_time: selectedTime
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/bookings`,
        bookingData,
        { withCredentials: true }
      );

      if (response.data.success) {
        navigate('/booking-confirmation', { 
          state: { 
            bookingId: response.data.bookingId,
            bookingDetails: {
              date: selectedDate,
              time: selectedTime,
              service: service.service_name,
              store: store.store_name,
              price: service.price,
              duration: service.duration_minutes
            }
          } 
        });
      }
    } catch (error) {
      console.error('Booking error:', error);
      let errorMessage = 'Booking failed. Please try again.';
      
      if (error.response) {
        if (error.response.status === 409) {
          errorMessage = 'This time slot is no longer available. Please choose another time.';
          await fetchAvailableSlots();
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
        }
      }
      
      setBookingError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial data loading
  useEffect(() => {
    checkAuth();
    fetchData();
  }, [checkAuth, fetchData]);

  // Check for existing booking when auth state changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      checkExistingBooking(user.id);
    } else {
      setExistingBooking(null);
    }
  }, [isAuthenticated, user, checkExistingBooking]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate && service?.duration_minutes) {
      fetchAvailableSlots();
    }
  }, [selectedDate, service, fetchAvailableSlots]);

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading booking details...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Booking Page</h2>
        <p className="error-message">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="back-button"
        >
          Return Home
        </button>
      </div>
    );
  }

  // Missing data state
  if (!store || !service) {
    return (
      <div className="error-container">
        <h2>Service or Store Not Found</h2>
        <p>The service or store you're looking for doesn't exist.</p>
        <button 
          onClick={() => navigate('/')}
          className="back-button"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="booking-page-container">
      <div className="booking-content">
        <button 
          onClick={() => navigate(-1)}
          className="back-button"
          disabled={isSubmitting || cancelling}
        >
          ← Back
        </button>

        <h1 className="booking-title">
          {existingBooking ? 'Manage Booking' : 'Book Appointment'}
        </h1>
        
        <div className="booking-details-card">
          <div className="store-info">
            <h2>{store.store_name}</h2>
            <p className="store-address">
              {store.address}, {store.city}
            </p>
            {store.rating && (
              <div className="store-rating">
                {'★'.repeat(Math.round(store.rating))}
                {'☆'.repeat(5 - Math.round(store.rating))}
                <span>({store.reviews || 0} reviews)</span>
              </div>
            )}
          </div>
          
          <div className="service-info">
            <h3>{service.service_name}</h3>
            {service.description && (
              <p className="service-description">{service.description}</p>
            )}
            <div className="service-meta">
              <span className="service-price">£{service.price?.toFixed(2)}</span>
              <span className="service-duration">{service.duration_minutes} mins</span>
            </div>
          </div>

          {existingBooking && (
            <div className="existing-booking">
              <h4>Your Current Booking</h4>
              <div className="booking-details">
                <p>
                  <strong>Date:</strong> {new Date(existingBooking.booking_date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Time:</strong> {existingBooking.booking_time}
                </p>
                <p>
                  <strong>Status:</strong> 
                  <span className={`status-badge ${existingBooking.status}`}>
                    {existingBooking.status}
                  </span>
                </p>
              </div>
              {existingBooking.status === 'confirmed' && (
                <div className="booking-actions">
                  <button
                    onClick={handleCancelBooking}
                    disabled={cancelling}
                    className="cancel-booking-btn"
                  >
                    {cancelling ? (
                      <>
                        <span className="spinner small"></span>
                        Cancelling...
                      </>
                    ) : 'Cancel Booking'}
                  </button>
                  {cancelError && (
                    <p className="error-text">{cancelError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {!existingBooking && (
          <>
            <div className="booking-form-section">
              <div className="date-selection">
                <h3>Select Date</h3>
                <input
                  type="date"
                  className="date-input"
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {selectedDate && (
                <div className="time-selection">
                  <h3>Available Times</h3>
                  
                  {morning.length > 0 && (
                    <div className="time-slot-group">
                      <h4 className="time-period-header">Morning</h4>
                      <div className="time-slots-grid">
                        {morning.map((slot) => (
                          <button
                            key={`morning-${slot}`}
                            className={`time-slot-btn ${selectedTime === slot ? 'selected' : ''}`}
                            onClick={() => setSelectedTime(slot)}
                            disabled={isSubmitting}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {afternoon.length > 0 && (
                    <div className="time-slot-group">
                      <h4 className="time-period-header">Afternoon</h4>
                      <div className="time-slots-grid">
                        {afternoon.map((slot) => (
                          <button
                            key={`afternoon-${slot}`}
                            className={`time-slot-btn ${selectedTime === slot ? 'selected' : ''}`}
                            onClick={() => setSelectedTime(slot)}
                            disabled={isSubmitting}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {evening.length > 0 && (
                    <div className="time-slot-group">
                      <h4 className="time-period-header">Evening</h4>
                      <div className="time-slots-grid">
                        {evening.map((slot) => (
                          <button
                            key={`evening-${slot}`}
                            className={`time-slot-btn ${selectedTime === slot ? 'selected' : ''}`}
                            onClick={() => setSelectedTime(slot)}
                            disabled={isSubmitting}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableSlots.length === 0 && selectedDate && (
                    <p className="no-slots-message">
                      No available time slots for this date. Please try another date.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="booking-summary-section">
              <h3>Booking Summary</h3>
              <div className="summary-details">
                <div className="summary-row">
                  <span className="summary-label">Service:</span>
                  <span className="summary-value">{service.service_name}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Price:</span>
                  <span className="summary-value">£{service.price?.toFixed(2)}</span>
                </div>
                {selectedDate && (
                  <div className="summary-row">
                    <span className="summary-label">Date:</span>
                    <span className="summary-value">
                      {new Date(selectedDate).toLocaleDateString('en-GB', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </span>
                  </div>
                )}
                {selectedTime && (
                  <div className="summary-row">
                    <span className="summary-label">Time:</span>
                    <span className="summary-value">{selectedTime}</span>
                  </div>
                )}
              </div>
            </div>

            {bookingError && (
              <div className="booking-error">
                <p>{bookingError}</p>
              </div>
            )}

            <button
              onClick={handleBooking}
              disabled={!selectedDate || !selectedTime || isSubmitting}
              className="confirm-booking-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : isAuthenticated ? (
                'Confirm Booking'
              ) : (
                'Login to Book'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingPage;