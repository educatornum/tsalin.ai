require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
}));
app.use(express.json()); // Body parser
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logger

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Tsalin API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      industries: '/api/industries',
      positions: '/api/positions',
      proLevels: '/api/pro-levels',
      salaryPosts: '/api/salary-posts',
      stats: '/api/stats',
    },
  });
});

app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/industries', require('./routes/industryRoutes'));
app.use('/api/positions', require('./routes/positionRoutes'));
app.use('/api/pro-levels', require('./routes/proLevelRoutes'));
app.use('/api/salary-posts', require('./routes/salaryPostRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api', require('./routes/claudeRoutes'));
app.use('/api/ai', require('./routes/claudeRoutes'));

// Error handler (must be last)
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

