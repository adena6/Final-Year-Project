import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './BookingConfirmation.css';

const BookingConfirmation = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Handle redirect in useEffect with proper dependency array
  useEffect(() => {
    if (!state?.bookingId) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  // Return null if no valid booking data exists
  if (!state?.bookingId) {
    return null;
  }

  const { bookingId, bookingDetails, userDetails } = state;

  // Safely format the date with fallbacks
  const formattedDate = bookingDetails?.date 
    ? new Date(bookingDetails.date).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Date not specified';

  return (
    <div className="confirmation-container">
      <div className="confirmation-card">
        <div className="confirmation-header">
          <div className="confirmation-icon">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
            </svg>
          </div>
          <h1>Booking Confirmed!</h1>
          <p className="confirmation-reference">Reference: #{bookingId}</p>
        </div>

        <div className="confirmation-details">
          <h2>Appointment Details</h2>
          
          <div className="detail-section">
            <h3>Service</h3>
            <p>{bookingDetails?.service || 'Service not specified'}</p>
            <p>
              {bookingDetails?.price ? `£${bookingDetails.price.toFixed(2)}` : 'Price not specified'} • 
              {bookingDetails?.duration ? ` ${bookingDetails.duration} minutes` : ' Duration not specified'}
            </p>
          </div>

          <div className="detail-section">
            <h3>When</h3>
            <p>{formattedDate}</p>
            <p>{bookingDetails?.time ? `At ${bookingDetails.time}` : 'Time not specified'}</p>
          </div>

          <div className="detail-section">
            <h3>Where</h3>
            <p>{bookingDetails?.store || 'Store not specified'}</p>
            <p>
              {bookingDetails?.address || 'Address not specified'}, 
              {bookingDetails?.city ? ` ${bookingDetails.city}` : ''}
            </p>
          </div>

          {userDetails && (
            <div className="detail-section">
              <h3>Booked By</h3>
              <p>{userDetails.name || 'Name not specified'}</p>
              <p>{userDetails.email || 'Email not specified'}</p>
            </div>
          )}
        </div>

        <div className="confirmation-actions">
          <button 
            onClick={() => navigate('/bookings')}
            className="action-button primary"
          >
            View My Bookings
          </button>
          <button 
            onClick={() => navigate('/')}
            className="action-button secondary"
          >
            Back to Home
          </button>
        </div>

        <div className="confirmation-footer">
          <p>A confirmation has been sent to your email</p>
          <p>Need help? Contact support@barberapp.com</p>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;