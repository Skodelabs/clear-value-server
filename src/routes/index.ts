import { Router } from 'express';
import mediaRoutes from './mediaRoutes';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import reportRoutes from './reportRoutes';

const router = Router();

// Import route modules here
router.use('/media', mediaRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export const routes = router;