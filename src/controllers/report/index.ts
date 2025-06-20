// Export all report controllers from a single file
import { generateMarketReport } from './generationController';
import { getReports, getReportById } from './retrievalController';
import { downloadReport } from './downloadController';
import { deleteReport } from './deleteController';
import { getMarketValueWithCondition } from './marketValueController';
import { calculateTotalValue } from './utilsController';
import { generateTypedReport } from './reportTypesController';
import { getAllReports } from './adminRetrievalController';

export {
  // Report generation
  generateMarketReport,
  generateTypedReport,
  
  // Report retrieval
  getReports,
  getReportById,
  getAllReports,
  
  // Report download
  downloadReport,
  
  // Report deletion
  deleteReport,
  
  // Utility functions
  getMarketValueWithCondition,
  calculateTotalValue
};
