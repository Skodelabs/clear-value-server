/**
 * OpenAI Service
 * This module provides functions for image analysis and duplicate detection
 * It now uses the enhanced implementations from the openai directory
 */

import dotenv from "dotenv";

// Import enhanced AI analysis modules
import {
  analyzeImage as analyzeImageEnhanced,
  analyzeImagesBatch as analyzeImagesBatchEnhanced,
  deduplicateEnhancedItems,
  isEnhancedSimilarItem
} from "./openai/imageAnalysis";

dotenv.config();

/**
 * Market valuation interface for compatibility with existing code
 */
export interface MarketValuation {
  description: string;
  estimatedValue: number;
  confidence: number;
  factors: string[];
  items: {
    name: string;
    value: number;
    condition: string;
    confidence: number;
  }[];
}

/**
 * Analyze a single image using OpenAI Vision API
 * @param imageBuffer - Buffer containing the image data
 * @param language - Language code (e.g., 'en', 'fr') for the response
 * @returns Market valuation data including identified items
 */
export async function analyzeImage(
  imageBuffer: Buffer,
  language: string = 'en'
): Promise<MarketValuation> {
  try {
    // Use the enhanced version from the openai directory
    return await analyzeImageEnhanced(imageBuffer, language);
  } catch (error) {
    console.error("Error in analyzeImage:", error);
    throw error;
  }
}

/**
 * Process multiple images to identify items
 * @param imageBuffers - Array of image buffers to analyze
 * @param language - Language code (e.g., 'en', 'fr') for the response
 * @returns Market valuation data including identified items from all images
 */
export async function analyzeImagesBatch(
  imageBuffers: Buffer[],
  language: string = 'en'
): Promise<MarketValuation> {
  try {
    // Use the enhanced version from the openai directory
    return await analyzeImagesBatchEnhanced(imageBuffers, language);
  } catch (error) {
    console.error("Error in analyzeImagesBatch:", error);
    throw error;
  }
}

/**
 * Export the enhanced duplicate detection functions
 */
export {
  deduplicateEnhancedItems,
  isEnhancedSimilarItem
};
