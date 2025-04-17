import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from 'react';
import Navbar from "./components/Navbar.jsx";
import Home from "./assets/pages/Home.jsx";
import Login from "./assets/pages/Login.jsx";
import Signup from "./assets/pages/Signup.jsx";
import Businesses from "./assets/pages/Businesses.jsx";
import StoreDetails from "./assets/pages/StoreDetails.jsx";
import BookingPage from "./assets/pages/BookingPage.jsx";
import BookingConfirmation from "./assets/pages/BookingConfirmation.jsx";
import BookingsList from "./assets/pages/BookingsList.jsx";
import "./App.css";

const App = () => {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <div className="app">
        <Navbar user={user} setUser={setUser} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/businesses" element={<Businesses />} />
            <Route path="/businesses/:id" element={<StoreDetails />} />
            <Route path="/businesses/:id/book/:serviceId" element={<BookingPage />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            <Route 
              path="/my-bookings" 
              element={
                user ? (
                  <BookingsList user={user} />
                ) : (
                  <Navigate to="/login" state={{ from: "/my-bookings" }} replace />
                )
              } 
            />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/signup" element={<Signup setUser={setUser} />} />
            
            <Route path="*" element={
              <div className="p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">404 - Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;