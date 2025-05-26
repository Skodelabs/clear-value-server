import express from 'express';
import authRoutes from './routes/authRoutes';
import mediaRoutes from './routes/mediaRoutes';
import reportRoutes from './routes/reportRoutes';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Basic route to test server
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Routes - update the path to match frontend
app.use('/auth', authRoutes);  // Changed from '/api/auth' to '/auth'
app.use('/media', mediaRoutes);  // Routes for image/video processing and AI analysis
app.use('/reports', reportRoutes);  // Routes for market research and report generation

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clear-value')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });