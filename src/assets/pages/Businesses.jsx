import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Businesses.css';

const Businesses = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:5001/api/stores', {
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch stores (${response.status})`);
        }

        const data = await response.json();
        setStores(data);
      } catch (error) {
        console.error('Fetch error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const navigationError = location.state?.error;

  if (loading) return (
    <div className="business-page-container">
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">Barber Shops</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-white rounded-lg shadow animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (error || navigationError) return (
    <div className="business-page-container">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error || navigationError}</p>
        </div>
        <button 
          onClick={() => {
            setError(null);
            navigate('/businesses', { replace: true });
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="business-page-container">
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">Barber Shops</h1>
        <div className="space-y-4">
          {stores.map(store => (
            <div 
              key={store.store_id} 
              onClick={() => navigate(`/businesses/${store.store_id}`)}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition cursor-pointer"
            >
              <h2 className="font-bold text-lg">{store.store_name}</h2>
              <div className="flex items-center mt-1">
                <span className="text-gray-500 text-sm">
                  Rating: {store.rating} ({store.reviews} reviews)
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-1">
                {store.address || 'Address not specified'}, {store.city}
              </p>
              {store.top_services && store.top_services.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {store.top_services.slice(0, 3).map((service, i) => (
                    <span key={i} className="bg-gray-100 text-xs px-2 py-1 rounded">
                      {service}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Businesses;