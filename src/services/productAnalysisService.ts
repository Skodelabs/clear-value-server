import {
  analyzeImagesBatch,
  analyzeImage,
  MarketValuation,
} from "./openaiService";
import { processImage as processImageFile } from "../utils/imageProcessor";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Define options interface for product analysis
export interface ProductAnalysisOptions {
  includeTearWear?: boolean;
  singleItem?: boolean;
  originalFilenames?: Record<string, string>; // Mapping of image paths to original filenames
  language?: string; // Language code (e.g., 'en', 'fr') for localized AI responses
}

export interface ProductItem {
  id: string;
  name: string;
  condition: string;
  details: string;
  imageUrl: string | undefined;
  // Add properties needed for product summary
  confidence?: number;
  value?: number;
  // New metadata fields for better item tracking
  imageId?: string;
  imageIndex?: number; // Index of the image in the batch
  position?: string;
  color?: string;
  background?: string;
  originalFilename?: string;
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
    const aiValuation = await analyzeImage(imageBuffer, options?.language || 'en');

    // Apply deduplication if needed
    const processedValuation = aiValuation;

    // Convert AI response to the requested format
    const items =
      processedValuation.items && processedValuation.items.length > 0
        ? aiValuation.items.map((item: any) => {
            // Create item with ONLY the exact fields requested: name, condition, details, and imageUrl
            const cleanItem: ProductItem = {
              id: uuidv4(), // We still need ID for internal tracking
              name: item.name,
              condition: item.condition,
              details: item.details || `${item.name} in ${item.condition.toLowerCase()} condition.`,
              imageUrl: filePath
            };
            
            return cleanItem;
          })
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
      processedImagePath: filePath,
    };
  }
};

/**
 * Analyzes multiple images in a single API call
 * @param filePaths Array of paths to image files
 * @param options Analysis options
 * @returns Product analysis result with items array containing id, name, condition, details and imageUrl
 */
export const analyzeProductFromImageBatch = async (
  filePaths: string[],
  options?: ProductAnalysisOptions
): Promise<ProductAnalysisResult> => {
  try {
    console.log(`Analyzing ${filePaths.length} images in a single API call`);

    // Preprocess and buffer all images
    const processedImages = await Promise.all(filePaths.map(processImageFile));
    const imageBuffers = processedImages.map((imgPath) =>
      fs.readFileSync(imgPath)
    );

    // Analyze all images in a single API call to OpenAI
    const aiValuation = await analyzeImagesBatch(imageBuffers, options?.language || 'en');

    // Skip duplicate detection if singleItem is false
    let finalValuation = aiValuation;
    if (options?.singleItem) {
      // Only apply duplicate detection if we're looking for a single item from multiple angles
      finalValuation = aiValuation;
    }

    // Convert AI response to the requested format with correct image associations
    const items =
      finalValuation.items && finalValuation.items.length > 0
        ? finalValuation.items.map((item: any) => {
            // Use the imageIndex property added in imageAnalysis.ts to get the correct image
            // Default to the first image if imageIndex is not available
            const imageIndex =
              typeof item.imageIndex === "number" ? item.imageIndex : 0;

            // Get the correct image path based on the image index
            const imagePath =
              filePaths[Math.min(imageIndex, filePaths.length - 1)];

            // Get the original filename for this image path
            const originalFilename =
              options?.originalFilenames?.[imagePath] || path.basename(imagePath);

            // Create item with ONLY the exact fields requested: name, condition, details, and imageUrl
            // Store the file path in imageUrl - it will be converted to a public URL later
            const cleanItem: ProductItem = {
              id: uuidv4(), // We still need ID for internal tracking
              name: item.name,
              condition: item.condition,
              details: item.details || `${item.name} in ${item.condition.toLowerCase()} condition.`,
              imageUrl: imagePath,
              imageIndex: imageIndex // Add imageIndex to help with URL conversion later
            };
            
            return cleanItem;
          })
        : [];

    return {
      success: true,
      items,
      rawAiResponse: finalValuation,
      processedImagePaths: processedImages,
    };
  } catch (error) {
    console.error("Error analyzing product from image batch:", error);
    return {
      success: false,
      items: [],
      processedImagePaths: filePaths,
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
  imageUrl: string = ""
): ProductAnalysisResult => {
  // Convert AI response to the requested format
  const items =
    aiValuation.items && aiValuation.items.length > 0
      ? aiValuation.items.map((item: any) => ({
          id: uuidv4(),
          name: item.name,
          condition: item.condition,
          details:
            item.details ||
            `${item.name} in ${item.condition.toLowerCase()} condition.`,
          imageUrl,
        }))
      : [];

  return {
    success: true,
    items,
    rawAiResponse: aiValuation,
  };
};
