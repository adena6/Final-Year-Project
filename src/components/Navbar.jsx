import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PropTypes from 'prop-types';
import './Navbar.css';

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    
    try {
      const response = await fetch("http://localhost:5001/api/logout", {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Logout failed with status: ' + response.status);
      }

      setUser(null);
      navigate('/');
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
      setLogoutError('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const closeMenu = () => setIsMenuOpen(false);

  const renderAuthButtons = () => {
    if (user) {
      return (
        <>
          <Link to="/my-bookings" className="nav-link" onClick={closeMenu}>My Bookings</Link>
          <span className="user-firstname" aria-label="User first name">
            {user.first_name}
          </span>
          <button 
            onClick={handleLogout} 
            className="logout-btn"
            disabled={isLoggingOut}
            aria-label="Logout"
          >
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </button>
          {logoutError && <span className="error-message">{logoutError}</span>}
        </>
      );
    }
    return (
      <>
        <Link to="/login" className="nav-link" onClick={closeMenu}>Log In</Link>
        <Link to="/signup" className="signup-btn" onClick={closeMenu}>Sign Up</Link>
      </>
    );
  };

  const renderMobileAuthButtons = () => {
    if (user) {
      return (
        <>
          <Link to="/my-bookings" className="mobile-link" onClick={closeMenu}>My Bookings</Link>
          <span className="mobile-link user-firstname">{user.first_name}</span>
          <button 
            onClick={handleLogout} 
            className="mobile-link logout-btn"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </button>
        </>
      );
    }
    return (
      <>
        <Link to="/login" className="mobile-link" onClick={closeMenu}>Log In</Link>
        <Link to="/signup" className="mobile-link signup-btn" onClick={closeMenu}>Sign Up</Link>
      </>
    );
  };

  return (
    <>
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar-container">
          <div className="navbar-left">
            <button 
              className="hamburger" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
            </button>
            <Link to="/" className="logo" onClick={closeMenu}>TrimTech</Link>
          </div>
          
          <div className="nav-links">
            <Link to="/" className="nav-link" onClick={closeMenu}>Home</Link>
            <Link to="/businesses" className="nav-link" onClick={closeMenu}>Businesses</Link>
            {renderAuthButtons()}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`} aria-hidden={!isMenuOpen}>
        <Link to="/" className="mobile-link" onClick={closeMenu}>Home</Link>
        <Link to="/businesses" className="mobile-link" onClick={closeMenu}>Businesses</Link>
        {renderMobileAuthButtons()}
      </div>
    </>
  );
};

Navbar.propTypes = {
  user: PropTypes.shape({
    first_name: PropTypes.string,
    id: PropTypes.number,
    email: PropTypes.string,
    last_name: PropTypes.string
  }),
  setUser: PropTypes.func.isRequired,
};

Navbar.defaultProps = {
  user: null,
};

export default Navbar;