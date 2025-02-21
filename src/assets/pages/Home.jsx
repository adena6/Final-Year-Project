import React, { useState } from 'react';  // Import useState hook
import { FaSearch } from 'react-icons/fa'; // Import FaSearch from react-icons

const Home = () => {
  // Add useState to manage search query
  const [searchQuery, setSearchQuery] = useState('');

  // Handle search when pressing "Enter"
  const handleSearch = () => {
    if (searchQuery) {
      console.log(`Searching for: ${searchQuery}`);
      // You can add your search logic here
    }
  };

  return (
    <div className="w-full h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-4 bg-black text-white">
        <h1 className="text-xl font-bold">TrimTech</h1>
        <div className="space-x-4">
          <a href="#" className="hover:underline">Home</a>
          <a href="#" className="hover:underline">Log in</a>
          <a href="#" className="hover:underline">Businesses</a>
          <a href="#" className="hover:underline">More</a>
        </div>
      </nav>

      {/* Hero Section */}
      <div 
        className="relative w-full h-[80vh] flex items-center justify-center bg-cover bg-center" 
        style={{ backgroundImage: "url('https://source.unsplash.com/1600x900/?barber')" }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="text-center text-white z-10">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">Transform your look today</h2>
          <p className="mb-4">Book with your local professionals today!</p>
          <div className="flex items-center bg-white text-black px-4 py-2 rounded-lg w-96 mx-auto">
            <FaSearch className="text-gray-500" />
            <input 
              type="text" 
              placeholder="Search local businesses and services" 
              className="flex-grow p-2 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-4 bg-black text-white text-center">
        <p>&copy; 2024 TrimTech. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Home;
