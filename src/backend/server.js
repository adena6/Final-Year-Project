require('dotenv').config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();

// Database pool configurations
const barberStoresPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Abdi1738",
  database: "BarberStores",
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  timezone: '+00:00',
  charset: 'utf8mb4',
  decimalNumbers: true
});

const userAuthPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Abdi1738",
  database: "user_auth",
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  timezone: '+00:00',
  charset: 'utf8mb4',
  decimalNumbers: true
});

// Verify database connections on startup
barberStoresPool.getConnection()
  .then(conn => {
    console.log('Connected to BarberStores database');
    conn.release();
  })
  .catch(err => {
    console.error('BarberStores database connection error:', err);
    process.exit(1);
  });

userAuthPool.getConnection()
  .then(conn => {
    console.log('Connected to user_auth database');
    conn.release();
  })
  .catch(err => {
    console.error('user_auth database connection error:', err);
    process.exit(1);
  });

// Session store
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, userAuthPool);

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['set-cookie']
}));
app.use(express.json({ limit: '10kb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Session middleware
app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'your_secret_key_here_change_me',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health'
});

app.use('/api/', apiLimiter);

// Database query helper with better error handling
const query = async (sql, params, pool, connection = null) => {
  const shouldRelease = !connection;
  connection = connection || await pool.getConnection();
  
  try {
    const [results] = await connection.query(sql, params);
    return results;
  } catch (error) {
    console.error("SQL Error:", {
      message: error.message,
      sql: sql,
      params: params,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    throw error;
  } finally {
    if (shouldRelease && connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error("Connection release error:", releaseError);
      }
    }
  }
};

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return errorResponse(res, 401, "Unauthorized", {
      message: "Please login to access this resource"
    });
  }
  next();
};

// Error response helper
const errorResponse = (res, status, error, details = {}) => {
  const response = {
    error: error,
    statusCode: status,
    timestamp: new Date().toISOString(),
    path: res.req?.originalUrl,
    ...details
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = new Error().stack;
    if (details instanceof Error) {
      response.errorDetails = {
        message: details.message,
        stack: details.stack
      };
    }
  }
  
  return res.status(status).json(response);
};

/* ==================== USER AUTH ENDPOINTS ==================== */

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { first_name, last_name, email, password } = req.body;
  
  if (!first_name || !last_name || !email || !password) {
    return errorResponse(res, 400, "All fields are required");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse(res, 400, "Invalid email format");
  }

  if (password.length < 8) {
    return errorResponse(res, 400, "Password must be at least 8 characters");
  }

  const connection = await userAuthPool.getConnection();
  try {
    await connection.beginTransaction();

    const existing = await query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email],
      userAuthPool,
      connection
    );

    if (existing.length > 0) {
      return errorResponse(res, 409, "Email already registered");
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await query(
      'INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)',
      [first_name, last_name, email, hashedPassword],
      userAuthPool,
      connection
    );

    await connection.commit();
    
    req.session.userId = result.insertId;
    req.session.user = {
      id: result.insertId,
      first_name,
      last_name,
      email
    };
    
    return res.status(201).json({ 
      success: true,
      message: "Registration successful",
      user: { 
        id: result.insertId, 
        email, 
        first_name, 
        last_name 
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error("Signup error:", error);
    return errorResponse(res, 500, "Registration failed", {
      details: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return errorResponse(res, 400, "Email and password required");
  }

  try {
    const users = await query(
      'SELECT id, first_name, last_name, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [email],
      userAuthPool
    );
    
    if (users.length === 0) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email
    };
    
    return res.json({ 
      success: true,
      message: "Login successful",
      user: { 
        id: user.id, 
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, 500, "Login failed", {
      details: error.message
    });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return errorResponse(res, 500, "Logout failed");
    }
    res.clearCookie('session_cookie_name');
    return res.json({ success: true, message: "Logout successful" });
  });
});

// Check auth endpoint
app.get('/api/check-auth', (req, res) => {
  if (req.session.userId && req.session.user) {
    return res.json({ 
      authenticated: true,
      user: req.session.user
    });
  }
  return res.json({ 
    authenticated: false,
    user: null
  });
});

/* ==================== STORE ENDPOINTS ==================== */

// Get all stores
app.get("/api/stores", async (req, res) => {
  try {
    const stores = await query(`
      SELECT 
        s.store_id, 
        s.store_name, 
        s.phone_number,
        s.rating,
        s.reviews,
        l.address,
        l.city,
        l.zip_code,
        (SELECT GROUP_CONCAT(DISTINCT service_name SEPARATOR ', ') 
         FROM Services sv 
         JOIN Prices p ON sv.service_id = p.service_id 
         WHERE p.store_id = s.store_id
         LIMIT 3) AS top_services
      FROM Stores s
      LEFT JOIN Locations l ON s.store_id = l.store_id
      ORDER BY s.rating DESC
      LIMIT 100`, [], barberStoresPool);
    
    const formattedStores = stores.map(store => ({
      ...store,
      top_services: store.top_services ? store.top_services.split(', ') : [],
      address: store.address || "Address not available",
      city: store.city || "City not available"
    }));
    
    return res.json(formattedStores);
  } catch (error) {
    console.error("Store fetch error:", error);
    return errorResponse(res, 500, "Failed to fetch stores", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get store details
app.get("/api/stores/:id", async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);
    if (isNaN(storeId)) {
      return errorResponse(res, 400, "Invalid store ID");
    }

    const [store] = await query(`
      SELECT s.*, l.address, l.city, l.zip_code
      FROM Stores s
      LEFT JOIN Locations l ON s.store_id = l.store_id
      WHERE s.store_id = ?`, 
      [storeId],
      barberStoresPool
    );

    if (!store) {
      return errorResponse(res, 404, "Store not found");
    }

    const services = await query(`
      SELECT 
        s.service_id,
        s.service_name,
        s.description,
        CAST(p.price AS DECIMAL(10,2)) as price,
        s.duration_minutes
      FROM Services s
      JOIN Prices p ON s.service_id = p.service_id
      WHERE p.store_id = ?
      ORDER BY p.price ASC`,
      [storeId],
      barberStoresPool
    );

    const businessHours = await query(
      `SELECT day, open_time, close_time FROM BusinessHours WHERE store_id = ?`,
      [storeId],
      barberStoresPool
    );

    return res.json({
      ...store,
      address: store.address || "Address not available",
      city: store.city || "City not available",
      services: services.map(service => ({
        ...service,
        price: service.price || 0,
        duration_minutes: service.duration_minutes || 30
      })),
      business_hours: businessHours
    });

  } catch (error) {
    console.error("Store details error:", error);
    return errorResponse(res, 500, "Failed to fetch store details", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get store availability
app.get("/api/stores/:storeId/availability", async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    const { serviceId, date, duration } = req.query;

    if (isNaN(storeId)) {
      return errorResponse(res, 400, "Invalid store ID");
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(res, 400, "Valid date parameter is required (YYYY-MM-DD)");
    }

    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const [businessHours] = await query(
      `SELECT open_time, close_time FROM BusinessHours 
       WHERE store_id = ? AND day = ?`,
      [storeId, dayOfWeek],
      barberStoresPool
    );

    if (!businessHours) {
      return res.json({
        availableSlots: [],
        message: "Store is closed on this day"
      });
    }

    const bookings = await query(
      `SELECT booking_time, duration_minutes 
       FROM BOOKINGS 
       WHERE store_id = ? 
       AND booking_date = ? 
       AND status != 'cancelled'`,
      [storeId, date],
      barberStoresPool
    );

    const openTime = businessHours.open_time;
    const closeTime = businessHours.close_time;
    const serviceDuration = duration ? parseInt(duration) : 30;

    if (isNaN(serviceDuration) || serviceDuration <= 0) {
      return errorResponse(res, 400, "Invalid duration parameter");
    }

    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);

    const slots = [];
    let currentHour = openHour;
    let currentMinute = openMinute;

    while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
      const slotTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      slots.push(slotTime);

      currentMinute += serviceDuration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    const bookedSlots = new Set();
    bookings.forEach(booking => {
      const [bookingHour, bookingMinute] = booking.booking_time.split(':').map(Number);
      const bookingEnd = new Date(0, 0, 0, bookingHour, bookingMinute + booking.duration_minutes);
      
      for (let i = 0; i < slots.length; i++) {
        const [slotHour, slotMinute] = slots[i].split(':').map(Number);
        const slotTime = new Date(0, 0, 0, slotHour, slotMinute);
        const slotEnd = new Date(0, 0, 0, slotHour, slotMinute + serviceDuration);

        if (slotTime < bookingEnd && slotEnd > new Date(0, 0, 0, bookingHour, bookingMinute)) {
          bookedSlots.add(slots[i]);
        }
      }
    });

    const availableSlots = slots.filter(slot => !bookedSlots.has(slot));

    return res.json({
      availableSlots,
      openTime,
      closeTime,
      serviceDuration
    });

  } catch (error) {
    console.error("Availability error:", error);
    return errorResponse(res, 500, "Failed to check availability", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ==================== SERVICE ENDPOINTS ==================== */

// Get service details
app.get("/api/services/:id", async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    if (isNaN(serviceId)) {
      return errorResponse(res, 400, "Invalid service ID");
    }

    const [service] = await query(
      `SELECT 
        service_id,
        service_name,
        description,
        duration_minutes
      FROM Services
      WHERE service_id = ?`,
      [serviceId],
      barberStoresPool
    );

    if (!service) {
      return errorResponse(res, 404, "Service not found");
    }

    const stores = await query(
      `SELECT 
        p.price,
        s.store_id,
        s.store_name,
        s.rating,
        l.address,
        l.city
      FROM Prices p
      JOIN Stores s ON p.store_id = s.store_id
      LEFT JOIN Locations l ON s.store_id = l.store_id
      WHERE p.service_id = ?`,
      [serviceId],
      barberStoresPool
    );

    return res.json({
      ...service,
      available_at: stores.map(store => ({
        store_id: store.store_id,
        store_name: store.store_name,
        price: store.price,
        rating: store.rating,
        location: {
          address: store.address,
          city: store.city
        }
      }))
    });

  } catch (error) {
    console.error("Service details error:", error);
    return errorResponse(res, 500, "Failed to fetch service details", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ==================== BOOKING ENDPOINTS ==================== */

// Create booking
app.post('/api/bookings', requireAuth, async (req, res) => {
  const { store_id, service_id, booking_date, booking_time } = req.body;
  const userId = req.session.userId;

  if (!store_id || !service_id || !booking_date || !booking_time) {
    return errorResponse(res, 400, "Missing required fields");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
    return errorResponse(res, 400, "Invalid date format (YYYY-MM-DD)");
  }

  if (!/^\d{2}:\d{2}$/.test(booking_time)) {
    return errorResponse(res, 400, "Invalid time format (HH:MM)");
  }

  const connection = await barberStoresPool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get service details and validate
    const [serviceRows] = await connection.query(
      `SELECT p.price, s.duration_minutes 
       FROM Prices p
       JOIN Services s ON p.service_id = s.service_id
       WHERE p.service_id = ? AND p.store_id = ?`,
      [service_id, store_id]
    );
    
    if (!serviceRows || serviceRows.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, "Service not available at this store");
    }

    const service = serviceRows[0];

    // 2. Check for existing bookings
    const [existing] = await connection.query(
      `SELECT booking_id FROM BOOKINGS 
       WHERE store_id = ? 
       AND booking_date = ?
       AND booking_time = ?
       AND status != 'cancelled'`,
      [store_id, booking_date, booking_time]
    );
    
    if (existing && existing.length > 0) {
      await connection.rollback();
      return errorResponse(res, 409, "Time slot already booked");
    }

    // 3. Create booking
    const [result] = await connection.query(
      `INSERT INTO BOOKINGS (
        user_id, 
        store_id, 
        service_id, 
        booking_date, 
        booking_time, 
        duration_minutes,
        price,
        status, 
        payment_method,
        payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', 'online', 'pending')`,
      [
        userId,
        store_id,
        service_id,
        booking_date,
        booking_time,
        service.duration_minutes || 30,
        service.price
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      bookingId: result.insertId
    });

  } catch (error) {
    await connection.rollback();
    console.error("Booking error:", error);
    return errorResponse(res, 500, "Failed to create booking", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

// Get user bookings
app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const bookings = await query(
      `SELECT 
        b.booking_id,
        b.booking_date,
        b.booking_time,
        b.status,
        b.duration_minutes,
        b.price,
        s.store_id,
        s.store_name,
        sv.service_id,
        sv.service_name,
        l.address,
        l.city
      FROM BOOKINGS b
      JOIN Stores s ON b.store_id = s.store_id
      JOIN Services sv ON b.service_id = sv.service_id
      LEFT JOIN Locations l ON s.store_id = l.store_id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.booking_time DESC`,
      [req.session.userId],
      barberStoresPool
    );

    return res.json(bookings.map(booking => ({
      ...booking,
      booking_date: new Date(booking.booking_date).toISOString().split('T')[0]
    })));
  } catch (error) {
    console.error("Get bookings error:", error);
    return errorResponse(res, 500, "Failed to fetch bookings", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get booking by ID
app.get('/api/bookings/:bookingId', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) {
      return errorResponse(res, 400, "Invalid booking ID");
    }

    const [booking] = await query(
      `SELECT 
        b.*,
        s.store_name,
        sv.service_name,
        l.address,
        l.city
      FROM BOOKINGS b
      JOIN Stores s ON b.store_id = s.store_id
      JOIN Services sv ON b.service_id = sv.service_id
      LEFT JOIN Locations l ON s.store_id = l.store_id
      WHERE b.booking_id = ? AND b.user_id = ?`,
      [bookingId, req.session.userId],
      barberStoresPool
    );

    if (!booking) {
      return errorResponse(res, 404, "Booking not found");
    }

    return res.json({
      ...booking,
      booking_date: new Date(booking.booking_date).toISOString().split('T')[0]
    });
  } catch (error) {
    console.error("Get booking error:", error);
    return errorResponse(res, 500, "Failed to fetch booking", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check for existing booking for a service
app.get('/api/bookings/user/:userId/service/:serviceId', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const serviceId = parseInt(req.params.serviceId);

    if (isNaN(userId) || isNaN(serviceId)) {
      return errorResponse(res, 400, "Invalid parameters");
    }

    if (userId !== req.session.userId) {
      return errorResponse(res, 403, "Unauthorized");
    }

    const [booking] = await query(
      `SELECT 
        b.booking_id,
        b.booking_date,
        b.booking_time,
        b.status,
        s.store_name,
        sv.service_name
      FROM BOOKINGS b
      JOIN Stores s ON b.store_id = s.store_id
      JOIN Services sv ON b.service_id = sv.service_id
      WHERE b.user_id = ? AND b.service_id = ? AND b.status != 'cancelled'
      ORDER BY b.booking_date DESC
      LIMIT 1`,
      [userId, serviceId],
      barberStoresPool
    );

    if (!booking) {
      return res.json({ exists: false });
    }

    return res.json({
      exists: true,
      booking: {
        ...booking,
        booking_date: new Date(booking.booking_date).toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error("Check existing booking error:", error);
    
    if (error.response?.status === 429) {
      return errorResponse(res, 429, "Too many requests", {
        message: "Please wait before checking again"
      });
    }
    
    return errorResponse(res, 500, "Failed to check booking", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Cancel booking
app.delete('/api/bookings/:bookingId', requireAuth, async (req, res) => {
  const bookingId = parseInt(req.params.bookingId);
  if (isNaN(bookingId)) {
    return errorResponse(res, 400, "Invalid booking ID");
  }

  const connection = await barberStoresPool.getConnection();
  try {
    await connection.beginTransaction();

    const [bookings] = await connection.query(
      `SELECT 
        b.*,
        s.store_name,
        sv.service_name,
        sv.duration_minutes,
        bh.day,
        bh.open_time,
        bh.close_time
      FROM BOOKINGS b
      JOIN Stores s ON b.store_id = s.store_id
      JOIN Services sv ON b.service_id = sv.service_id
      LEFT JOIN BusinessHours bh ON b.store_id = bh.store_id 
        AND bh.day = DAYNAME(b.booking_date)
      WHERE b.booking_id = ? AND b.user_id = ? AND b.status = 'confirmed'`,
      [bookingId, req.session.userId]
    );

    if (bookings.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, "Booking not found or already cancelled");
    }

    const booking = bookings[0];
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    const currentDateTime = new Date();

    const hoursUntilBooking = (bookingDateTime - currentDateTime) / (1000 * 60 * 60);
    if (hoursUntilBooking < 24) {
      await connection.rollback();
      return errorResponse(res, 400, "Cancellations must be made at least 24 hours in advance");
    }

    await connection.query(
      `UPDATE BOOKINGS 
       SET status = 'cancelled', 
           cancelled_at = NOW() 
       WHERE booking_id = ?`,
      [bookingId]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Booking cancelled successfully",
      bookingId: bookingId
    });

  } catch (error) {
    await connection.rollback();
    console.error("Cancel booking error:", error);
    return errorResponse(res, 500, "Failed to cancel booking", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

/* ==================== USER PROFILE ENDPOINTS ==================== */

// Get profile
app.get('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const [users] = await query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = ? LIMIT 1',
      [req.session.userId],
      userAuthPool
    );
    
    const user = users[0];
    
    if (!user) {
      return errorResponse(res, 404, "User not found");
    }

    return res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return errorResponse(res, 500, "Failed to fetch user profile", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update profile
app.put('/api/user/profile', requireAuth, async (req, res) => {
  const { first_name, last_name, email } = req.body;
  
  if (!first_name || !last_name || !email) {
    return errorResponse(res, 400, "All fields are required");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse(res, 400, "Invalid email format");
  }

  const connection = await userAuthPool.getConnection();
  try {
    await connection.beginTransaction();

    if (email !== req.session.user.email) {
      const [existing] = await query(
        'SELECT 1 FROM users WHERE email = ? AND id != ?',
        [email, req.session.userId],
        userAuthPool,
        connection
      );
      
      if (existing && existing.length > 0) {
        return errorResponse(res, 409, "Email already in use");
      }
    }

    await query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
      [first_name, last_name, email, req.session.userId],
      userAuthPool,
      connection
    );

    req.session.user = {
      ...req.session.user,
      first_name,
      last_name,
      email
    };

    await connection.commit();

    return res.json({ 
      success: true,
      message: "Profile updated successfully",
      user: req.session.user
    });

  } catch (error) {
    await connection.rollback();
    console.error("Update profile error:", error);
    return errorResponse(res, 500, "Failed to update profile", {
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

/* ==================== HEALTH CHECK ==================== */

app.get('/api/health', (req, res) => {
  return res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected',
    session: req.sessionID ? 'active' : 'inactive',
    uptime: process.uptime()
  });
});

/* ==================== ERROR HANDLERS ==================== */

app.use((req, res) => {
  errorResponse(res, 404, "Endpoint not found", {
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  errorResponse(res, 500, "Internal server error", {
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/* ==================== SERVER START ==================== */

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Database connection monitoring
setInterval(() => {
  console.log('Database connection pools status:', {
    barberStores: {
      total: barberStoresPool.totalCount,
      idle: barberStoresPool.idleCount,
      waiting: barberStoresPool.waitingCount
    },
    userAuth: {
      total: userAuthPool.totalCount,
      idle: userAuthPool.idleCount,
      waiting: userAuthPool.waitingCount
    }
  });
}, 60000); // Log every minute