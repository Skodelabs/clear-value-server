import { Router } from 'express';
import mediaRoutes from './mediaRoutes';

const router = Router();

// Import route modules here
router.use('/media', mediaRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export const routes = router; 