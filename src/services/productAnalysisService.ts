import { analyzeImagesBatch, analyzeImage, detectDuplicateItems, MarketValuation } from "./openaiService";
import { processImage as processImageFile } from "../utils/imageProcessor";
import fs from "fs";
import { v4 as uuidv4 } from 'uuid';

// Define options interface for product analysis
export interface ProductAnalysisOptions {
  includeTearWear?: boolean;
  singleItem?: boolean;
}

export interface ProductItem {
  id: string;
  name: string;
  condition: string;
  details: string;
  imageUrl: string;
}

export interface ProductAnalysisResult {
  success: boolean;
  items: ProductItem[];
  rawAiResponse?: MarketValuation;
  processedImagePath?: string;
  processedImagePaths?: string[];
}

/**
 * Analyzes a single image to identify product details
 * @param filePath Path to the image file
 * @param options Analysis options
 * @returns Product analysis result with items array containing id, name, condition, details and imageUrl
 */
export const analyzeProductFromImage = async (
  filePath: string,
  options?: ProductAnalysisOptions
): Promise<ProductAnalysisResult> => {
  try {
    const processedImage = await processImageFile(filePath);
    const imageBuffer = fs.readFileSync(processedImage);
    
    // First analyze the image with OpenAI
    const aiValuation = await analyzeImage(imageBuffer);
    
    // Then use the enhanced duplicate detection
    const refinedValuation = await detectDuplicateItems(aiValuation);
    
    // Convert AI response to the requested format
    const items = refinedValuation.items && refinedValuation.items.length > 0
      ? refinedValuation.items.map((item: any) => ({
          id: uuidv4(),
          name: item.name,
          condition: item.condition,
          details: item.details || `${item.name} in ${item.condition.toLowerCase()} condition.`,
          imageUrl: filePath
        }))
      : [];
    
    return {
      success: true,
      items,
      rawAiResponse: aiValuation,
      processedImagePath: processedImage,
    };
  } catch (error) {
    console.error("Error analyzing product from image:", error);
    return {
      success: false,
      items: [],
      processedImagePath: filePath
    };
  }
};

/**
 * Analyzes multiple images as different angles of the same product
 * @param filePaths Array of paths to image files
 * @param options Analysis options
 * @returns Product analysis result with items array containing id, name, condition, details and imageUrl
 */
export const analyzeProductFromImageBatch = async (
  filePaths: string[],
  options?: ProductAnalysisOptions
): Promise<ProductAnalysisResult> => {
  try {
    // Preprocess and buffer all images
    const processedImages = await Promise.all(filePaths.map(processImageFile));
    const imageBuffers = processedImages.map((imgPath) => fs.readFileSync(imgPath));
    
    // First analyze the batch of images with OpenAI
    const aiValuation = await analyzeImagesBatch(imageBuffers);
    
    // Then use the enhanced duplicate detection for an additional layer of duplicate removal
    const refinedValuation = await detectDuplicateItems(aiValuation);
    
    // Convert AI response to the requested format
    const items = refinedValuation.items && refinedValuation.items.length > 0
      ? refinedValuation.items.map((item: any, index) => ({
          id: uuidv4(),
          name: item.name,
          condition: item.condition,
          details: item.details || `${item.name} in ${item.condition.toLowerCase()} condition.`,
          imageUrl: filePaths[Math.min(index, filePaths.length - 1)]
        }))
      : [];
    
    return {
      success: true,
      items,
      rawAiResponse: aiValuation,
      processedImagePaths: processedImages,
    };
  } catch (error) {
    console.error("Error analyzing product from image batch:", error);
    return {
      success: false,
      items: [],
      processedImagePaths: filePaths
    };
  }
};

/**
 * Extracts product details from an existing AI valuation result
 * @param aiValuation The AI valuation result
 * @param imageUrl Optional image URL to associate with the items
 * @returns Product analysis result
 */
export const extractProductDetailsFromAiResult = (
  aiValuation: MarketValuation,
  imageUrl: string = ''
): ProductAnalysisResult => {
  // Convert AI response to the requested format
  const items = aiValuation.items && aiValuation.items.length > 0
    ? aiValuation.items.map((item: any) => ({
        id: uuidv4(),
        name: item.name,
        condition: item.condition,
        details: item.details || `${item.name} in ${item.condition.toLowerCase()} condition.`,
        imageUrl
      }))
    : [];
  
  return {
    success: true,
    items,
    rawAiResponse: aiValuation,
  };
};
