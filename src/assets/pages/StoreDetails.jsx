import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StoreDetails.css';

const StoreDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || isNaN(id)) {
      setError("Invalid store ID");
      setLoading(false);
      navigate('/businesses');
      return;
    }

    const fetchStore = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/stores/${id}`);
        setStore(response.data);
      } catch (error) {
        setError(error.response?.data?.error || "Failed to fetch store");
        navigate('/businesses', { state: { error: error.message } });
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [id, navigate]);

  const formatPrice = (price) => {
    if (typeof price !== 'number') {
      const num = parseFloat(price);
      return isNaN(num) ? 'Price not available' : `£${num.toFixed(2)}`;
    }
    return `£${price.toFixed(2)}`;
  };

  if (loading) return (
    <div className="store-details-page">
      <div className="max-w-md mx-auto p-4 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="store-details-page">
      <div className="max-w-md mx-auto p-4">
        <div className="error-message">
          <p className="error-title">Error</p>
          <p>{error}</p>
        </div>
        <Link to="/businesses" className="back-link">
          ← Back to all stores
        </Link>
      </div>
    </div>
  );

  if (!store) return null;

  return (
    <div className="store-details-page">
      <div className="max-w-md">
        <Link to="/businesses" className="back-link">
          ← Back to all stores
        </Link>
        
        <div className="store-card">
          <h1 className="store-name">{store.store_name}</h1>
          <div className="store-rating">
            Rating: {store.rating} ({store.reviews} reviews)
          </div>
          <div className="store-details">
            <p className="store-detail">
              <strong>Address:</strong> {store.address || 'Not specified'}, {store.city}
            </p>
            {store.zip_code && (
              <p className="store-detail">
                <strong>Postcode:</strong> {store.zip_code}
              </p>
            )}
            {store.phone_number && (
              <p className="store-detail">
                <strong>Phone:</strong> 
                <a href={`tel:${store.phone_number}`} className="text-blue-500 ml-1">
                  {store.phone_number}
                </a>
              </p>
            )}
          </div>
        </div>

        <h2 className="services-title">Services</h2>
        {store.services && store.services.length > 0 ? (
          <div className="services-list">
            {store.services.map(service => (
              <div key={service.service_id} className="service-item">
                <h3 className="service-name">{service.service_name}</h3>
                {service.description && (
                  <p className="service-description">{service.description}</p>
                )}
                <div className="service-price">{formatPrice(service.price)}</div>
                {service.duration_minutes && (
                  <div className="service-duration">
                    {service.duration_minutes} min
                  </div>
                )}
                <button 
                  onClick={() => navigate(`/businesses/${id}/book/${service.service_id}`)}
                  className="book-button"
                >
                  BOOK
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-services">
            <p>No services currently available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreDetails;