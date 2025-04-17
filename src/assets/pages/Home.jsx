import React, { useState, useEffect } from 'react';
import { FaSearch, FaCalendarAlt, FaMapMarkerAlt, FaStar, FaCut } from 'react-icons/fa';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Home.css';

const Home = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for welcome message in location state
    if (location.state?.message) {
      setShowWelcome(true);
      
      // Start fade out after 4.5 seconds
      const fadeOutTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 4500);
      
      // Hide completely after 5 seconds
      const hideTimer = setTimeout(() => {
        setShowWelcome(false);
        setIsFadingOut(false);
        
        // Clean up the location state to prevent reappearing on refresh
        navigate(location.pathname, { replace: true, state: {} });
      }, 5000);
      
      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [location.state, navigate, location.pathname]);

  // Rest of the component remains the same...
  const handleSearch = () => {
    if (searchQuery) {
      navigate('/businesses');
    }
  };

  const featuredBusinesses = [
    {
      id: 1,
      name: "Elite Barber Shop",
      rating: 4.8,
      location: "Downtown",
      service: "Haircut & Shave",
      image: "https://source.unsplash.com/random/300x200/?barbershop"
    },
    {
      id: 2,
      name: "Luxury Hair Studio",
      rating: 4.6,
      location: "Midtown",
      service: "Hair Styling",
      image: "https://source.unsplash.com/random/300x200/?hairstudio"
    },
    {
      id: 3,
      name: "Beard & Co.",
      rating: 4.9,
      location: "Uptown",
      service: "Beard Grooming",
      image: "https://source.unsplash.com/random/300x200/?beard"
    }
  ];

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          {showWelcome && (
            <div className={`welcome-banner ${isFadingOut ? 'fade-out' : 'fade-in'}`}>
              {location.state?.message}
            </div>
          )}
          <h1>Find Your Perfect Style</h1>
          <p>Book with top-rated barbers and stylists in your area</p>
          <div className="search-container">
            <div className="search-input">
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Search for barbers, salons, or services..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <button className="search-btn" onClick={handleSearch}>Search</button>
          </div>
        </div>
      </section>

      {/* Rest of the component remains exactly the same... */}
      {/* Features Section */}
      <section className="features-section">
        <h2>How It Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <FaSearch className="feature-icon" />
            <h3>Search</h3>
            <p>Find local barbers and stylists near you</p>
          </div>
          <div className="feature-card">
            <FaCalendarAlt className="feature-icon" />
            <h3>Book</h3>
            <p>Schedule an appointment that fits your schedule</p>
          </div>
          <div className="feature-card">
            <FaCut className="feature-icon" />
            <h3>Enjoy</h3>
            <p>Get the perfect cut and style you deserve</p>
          </div>
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="featured-section">
        <h2>Featured Businesses</h2>
        <div className="businesses-grid">
          {featuredBusinesses.map(business => (
            <div key={business.id} className="business-card">
              <img src={business.image} alt={business.name} />
              <div className="business-info">
                <h3>{business.name}</h3>
                <div className="business-rating">
                  <FaStar className="star-icon" />
                  <span>{business.rating}</span>
                </div>
                <div className="business-details">
                  <FaMapMarkerAlt className="detail-icon" />
                  <span>{business.location}</span>
                </div>
                <div className="business-details">
                  <FaCut className="detail-icon" />
                  <span>{business.service}</span>
                </div>
                <Link to={`/businesses/${business.id}`} className="book-btn">View Details</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <h2>Ready to Transform Your Look?</h2>
        <p>Join thousands of satisfied customers who found their perfect style</p>
        <Link to={user ? "/businesses" : "/signup"} className="cta-btn">
          {user ? "Book Now" : "Get Started"}
        </Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>TrimTech</h3>
            <p>Connecting you with the best local barbers and stylists</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/businesses">Businesses</Link>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p>info@trimtech.com</p>
            <p>(123) 456-7890</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} TrimTech. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;