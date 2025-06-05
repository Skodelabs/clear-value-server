import { Request, Response } from "express";
import { processVideo } from "../services/videoService";
import {
  analyzeProductFromImageBatch,
  ProductItem,
} from "../services/productAnalysisService";
import {
  convertToPublicImageUrl,
  extractImageIndex,
} from "../utils/imageUtils";
import { MediaResult } from "../types/mediaTypes";
import path from "path";
import {
  generateProductSummary,
  consolidateToSingleItem,
  groupSimilarItems,
  formatSingleItemResults,
} from "../services/mediaSummaryService";

/**
 * Processes media files (images/videos) and returns AI analysis of products
 * This controller focuses only on product identification and analysis
 */
export const processMedia = async (req: Request, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    console.log("Received files:", req.files);

    // Parse options from front-end with default values
    const options = {
      singleItem: req.body.singleItem === "true" || false, // Single item mode vs. multiple items
      includeTearWear: req.body.includeTearWear === "true" || false, // Include tear/wear analysis
      language: req.body.language || 'en', // Language for AI responses (default: English)
    };

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const imageFiles = files.filter(
      (file: any) => file.mimetype && file.mimetype.startsWith("image/")
    );
    const videoFiles = files.filter(
      (file: any) => file.mimetype && file.mimetype.startsWith("video/")
    );

    // Validate: only one video allowed
    if (videoFiles.length > 1) {
      return res
        .status(400)
        .json({ error: "Only one video can be uploaded per request" });
    }

    // Validate: maximum number of images (50)
    const MAX_IMAGES = 50;
    if (imageFiles.length > MAX_IMAGES) {
      console.log(
        `User attempted to upload ${imageFiles.length} images, limiting to ${MAX_IMAGES}`
      );
      // We'll just use the first MAX_IMAGES images rather than returning an error
      imageFiles.splice(MAX_IMAGES);
    }

    const results: MediaResult[] = [];

    // Process videos (only one video supported per request)
    for (const file of videoFiles) {
      // Only process if file.path is a string
      if (typeof file.path === "string") {
        // Pass options to processVideo
        const result = await processVideo(file.path, {
          includeTearWear: options.includeTearWear,
        });

        // The video service now returns results in the new format
        const videoResults = result.results.map((frameResult) => {
          if (frameResult) {
            return {
              productAnalysis: frameResult.productAnalysis || {
                success: false,
                items: [],
                rawAiResponse: null,
                processedImagePath: "",
              },
              processedImagePath: frameResult.processedImagePath,
              frame: frameResult.frame,
            };
          }
          return null;
        });

        results.push({
          type: "video",
          filename: file.originalname,
          totalFrames: result.totalFrames,
          uniqueFrames: result.uniqueFrames,
          processedFrames: result.processedFrames,
          results: videoResults,
        });
      }
    }

    // Process all images
    await processImages(imageFiles, options, results);

    // Generate product summary from results
    let productSummary = generateProductSummary(results);

    // If single item mode is enabled, consolidate all items into a single item
    if (options.singleItem && productSummary.length > 1) {
      productSummary = consolidateToSingleItem(productSummary);
    }

    // Sort by confidence level (highest first)
    productSummary.sort((a, b) => b.confidence - a.confidence);
    
    // Clean up the product summary for logging
    const cleanSummary = productSummary.map(item => {
      // Make sure details is populated
      const details = item.details || `${item.name} in ${item.condition.toLowerCase()} condition.`;
      
      return {
        name: item.name,
        condition: item.condition,
        details: details,
        imageUrl: item.imageUrl
      };
    });
    console.log("Product summary:", cleanSummary);

    // Group similar items or format single item results
    const consolidatedProducts = !options.singleItem
      ? groupSimilarItems(productSummary)
      : formatSingleItemResults(productSummary);

    // Collect all items from all processed results
    const allItems = collectAllItems(results);

    // Make sure all items have public URLs
    const itemsWithPublicUrls = ensurePublicUrls(allItems);
    
    // Normalize and standardize product items for consistent response format
    const normalizedItems = normalizeProductItems(itemsWithPublicUrls);
    
    return res.json({
      success: true,
      items: normalizedItems,
    });
  } catch (error) {
    console.error("Error processing media:", error);
    return res.status(500).json({ error: "Failed to process media" });
  }
};

/**
 * Processes image files and adds results to the results array
 * @param imageFiles Array of image files
 * @param options Processing options
 * @param results Results array to append to
 */
async function processImages(
  imageFiles: any[],
  options: { includeTearWear: boolean; singleItem: boolean; language?: string },
  results: MediaResult[]
) {
  // Collect all valid image paths and their original filenames
  const imageFiles2 = imageFiles.filter(
    (file: any) => typeof file.path === "string"
  );
  const imagePaths = imageFiles2.map((file: any) => file.path as string);
  const originalFilenames = imageFiles2.map(
    (file: any) => file.originalname as string
  );

  // Create a mapping of image paths to original filenames
  const imagePathToFilename: Record<string, string> = {};
  imagePaths.forEach((path, index) => {
    imagePathToFilename[path] = originalFilenames[index];
  });

  if (imagePaths.length > 0) {
    // Always use the batch processing function to send all images in one API call
    const result = await analyzeProductFromImageBatch(imagePaths, {
      includeTearWear: options.includeTearWear,
      // Force singleItem to false to ensure we get all items from all images
      singleItem: false,
      // Pass the original filenames mapping
      originalFilenames: imagePathToFilename,
      // Pass language parameter for localized AI responses
      language: options.language || 'en',
    });

    // Ensure each item is associated with the correct image based on imageIndex
    if (result.items && result.items.length > 0) {
      result.items = result.items.map((item) => {
        // Use the imageIndex property directly if available, otherwise extract from imageId
        const imageIndex = typeof item.imageIndex === 'number' ? 
          item.imageIndex : 
          extractImageIndex(item.imageId);

        // Get the correct image path using the image index
        const imagePath =
          imagePaths[Math.min(imageIndex, imagePaths.length - 1)];

        // Get the original filename for this image path
        const originalFilename = imagePathToFilename[imagePath];
        
        // Use the actual uploaded filename for the URL, not the original filename
        const uploadedFilename = path.basename(imagePath);
        
        // Create a clean item with only the required fields
        return {
          id: item.id, // Keep the id field as it's required by the ProductItem interface
          name: item.name,
          condition: item.condition,
          details: item.details || `${item.name} in ${item.condition.toLowerCase()} condition.`,
          imageUrl: convertToPublicImageUrl(imagePath, uploadedFilename)
        };
      });
    }

    results.push({
      type: "image",
      filename: imageFiles.map((file: any) => file.originalname),
      productAnalysis: result,
      imageCount: imagePaths.length,
    });
  }
}

/**
 * Collects all items from all processed results
 * @param results Array of media results
 * @returns Array of all product items
 */
function collectAllItems(results: MediaResult[]): ProductItem[] {
  return results.flatMap((result) => {
    if (
      result.type === "image" &&
      result.productAnalysis &&
      result.productAnalysis.items
    ) {
      return result.productAnalysis.items;
    } else if (result.type === "video" && result.results) {
      // Collect items from video frames
      return result.results
        .filter(
          (frameResult) =>
            frameResult &&
            frameResult.productAnalysis &&
            frameResult.productAnalysis.items
        )
        .flatMap((frameResult) => frameResult!.productAnalysis.items);
    }
    return [];
  });
}

/**
 * Ensures all items have public URLs and only include essential fields
 * @param items Array of product items
 * @returns Array of items with public URLs and only essential fields
 */
function ensurePublicUrls(items: ProductItem[]): ProductItem[] {
  return items.map((item) => {
    // Only convert if the URL doesn't already start with http:// or https://
    const publicImageUrl = item.imageUrl && 
      !item.imageUrl.startsWith("http://") && 
      !item.imageUrl.startsWith("https://") ?
      convertToPublicImageUrl(item.imageUrl, item.originalFilename) :
      item.imageUrl;
    
    // Return ONLY the essential fields (name, condition, details, imageUrl)
    // We need to keep the id for internal tracking
    return {
      id: item.id,
      name: item.name,
      condition: item.condition,
      details: item.details,
      imageUrl: publicImageUrl
    };
  });
}

/**
 * Normalizes product items to ensure consistent response format
 * @param items Array of product items to normalize
 * @returns Array of normalized product items
 */
function normalizeProductItems(items: ProductItem[]): ProductItem[] {
  if (!items || items.length === 0) return [];

  // First, clean up each item individually
  const cleanedItems = items.map((item) => {
    // Clean up item name - remove unnecessary prefixes, suffixes, and standardize format
    let name = item.name || "";
    name = name
      .trim()
      .replace(/^(a|an|the)\s+/i, "") // Remove articles from beginning
      .replace(/\s{2,}/g, " ") // Replace multiple spaces with single space
      .replace(/^\d+\.\s*/, "") // Remove numbering (e.g., "1. Item" -> "Item")
      .replace(/\([^)]*\)/g, "") // Remove parenthetical descriptions
      .trim();

    // Capitalize first letter of name
    name = name.charAt(0).toUpperCase() + name.slice(1);

    // Ensure condition is standardized
    let condition = (item.condition || "").toLowerCase().trim();
    if (!condition) condition = "good"; // Default condition

    // Standardize condition values
    if (
      condition.includes("excellent") ||
      condition.includes("perfect") ||
      condition.includes("mint")
    ) {
      condition = "excellent";
    } else if (condition.includes("good") || condition.includes("fine")) {
      condition = "good";
    } else if (condition.includes("fair") || condition.includes("average")) {
      condition = "fair";
    } else if (
      condition.includes("poor") ||
      condition.includes("bad") ||
      condition.includes("worn")
    ) {
      condition = "poor";
    } else {
      condition = "good"; // Default to good if unrecognized
    }

    // Ensure details are present and formatted
    let details = item.details || "";
    if (!details) {
      details = `${name} in ${condition} condition.`;
    }

    // Return ONLY the essential fields (name, condition, details, imageUrl)
    // We need to keep the id for internal tracking
    return {
      id: item.id,
      name,
      condition,
      details,
      imageUrl: item.imageUrl
    };
  });

  // Second, perform additional deduplication to ensure no duplicate items
  const uniqueItems: ProductItem[] = [];
  const seenNames = new Set<string>();

  for (const item of cleanedItems) {
    // Create a normalized name for comparison
    const normalizedName = item.name.toLowerCase().trim();

    // Skip if we've already seen this item
    if (seenNames.has(normalizedName)) continue;

    // Add to our unique items and mark as seen
    uniqueItems.push(item);
    seenNames.add(normalizedName);
  }

  return uniqueItems;
}
