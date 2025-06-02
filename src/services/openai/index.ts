/**
 * OpenAI Service
 * This module provides functions for image analysis and duplicate detection using OpenAI APIs
 */

// Export types

// Export image analysis functions
export { 
  analyzeImage,
  analyzeImagesBatch
} from './imageAnalysis';

// Export duplicate detection functions


// Export utility functions
export {
  deduplicateItems,
  isSimilarItem,
  fallbackImageAnalysis
} from './utils';
