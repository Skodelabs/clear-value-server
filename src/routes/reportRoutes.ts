import { Router } from 'express';
import {
  generateMarketReport,
  generateTypedReport,
  getReports,
  getReportById,
  downloadReport,
  deleteReport
} from '../controllers/reportController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all report routes
router.use(authMiddleware);

// Route for generating market reports based on user-edited product details
router.post('/generate', generateMarketReport);

// Route for generating typed reports (main/basic with subtypes)
router.post('/generate-typed', generateTypedReport);

// Routes for retrieving reports
router.get('/', getReports);
router.get('/:id', getReportById);

// Route for downloading a report
router.get('/:id/download', downloadReport);

// Route for deleting a report
router.delete('/:id', deleteReport);

export default router;
