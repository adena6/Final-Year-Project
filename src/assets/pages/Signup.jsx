import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import './Signup.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      alert("The password must have a minimum of 8 characters, 1 uppercase, 1 digit, 1 special character.");
      return;
    }

    try {
      await axios.post(
        "http://localhost:5001/api/signup", 
        formData,
        { withCredentials: true }
      );
      
      navigate('/login', { 
        state: { 
          from: location.state?.from,
          message: 'Account created! Please login to continue'
        } 
      });
    } catch (error) {
      alert(error.response?.data?.error || "Signup failed");
    }
  };

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page in history
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <button 
          onClick={handleGoBack}
          className="back-button"
          aria-label="Go back"
        >
          &larr; Back
        </button>

        <h2>Create Your Account</h2>
        <p className="signup-subtitle">Join us today to get started</p>

        {location.state?.message && (
          <div className="signup-msg">
            {location.state.message}
          </div>
        )}

        <form onSubmit={handleSignup} className="signup-form">
          <div className="name-fields">
            <div>
              <label htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                type="text"
                name="first_name"
                placeholder="John"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                type="text"
                name="last_name"
                placeholder="Doe"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <p className="password-hint">
              Must be 8+ characters with 1 uppercase, 1 number, and 1 special character
            </p>
          </div>

          <button type="submit" className="signup-btn">
            Create Account
          </button>
        </form>

        <p className="signup-footer">
          Already have an account?{" "}
          <Link
            to="/login"
            state={{ from: location.state?.from }}
            className="signup-link"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;