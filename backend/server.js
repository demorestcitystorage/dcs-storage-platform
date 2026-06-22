import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Basic API endpoints (to be built out)
app.get('/api/facilities', (req, res) => {
  // TODO: Fetch facilities from database
  res.json({ message: 'Facilities endpoint - coming soon' });
});

app.get('/api/customers', (req, res) => {
  // TODO: Fetch customers from database
  res.json({ message: 'Customers endpoint - coming soon' });
});

app.get('/api/units', (req, res) => {
  // TODO: Fetch units from database
  res.json({ message: 'Units endpoint - coming soon' });
});

app.post('/api/auth/login', (req, res) => {
  // TODO: Implement login
  res.json({ message: 'Login endpoint - coming soon' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
