import { Router } from 'express';
import {
  generateMarketReport,
  generateTypedReport,
  getReports,
  getReportById,
  downloadReport,
  deleteReport,
  getAllReports
} from '../controllers/reportController';
import { combinedAuthMiddleware } from '../middleware/combinedAuth';

const router = Router();

// Apply combined authentication middleware to all report routes
// This allows both regular users and admins to access reports
router.use(combinedAuthMiddleware);

// Route for generating market reports based on user-edited product details
router.post('/generate', generateMarketReport);

// Route for generating typed reports (main/basic with subtypes)
router.post('/generate-typed', generateTypedReport);

// Routes for retrieving reports
router.get('/', getReports);
router.get('/all', getAllReports);
router.get('/:id', getReportById);

// Route for downloading a report
router.get('/:id/download', downloadReport);

// Route for deleting a report
router.delete('/:id', deleteReport);

export default router;
