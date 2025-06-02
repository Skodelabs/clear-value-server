import { ProductItem } from "./productAnalysisService";
import { convertToPublicImageUrl, extractImageIndex } from "../utils/imageUtils";
import { MediaResult, ProductSummaryItem, ConsolidatedProduct } from "../types/mediaTypes";

/**
 * Generates a product summary from media results
 * @param results The media processing results
 * @returns Array of product summary items
 */
export const generateProductSummary = (results: MediaResult[]): ProductSummaryItem[] => {
  return results.flatMap((result: MediaResult) => {
    // Handle image results
    if (result.type === 'image' && result.productAnalysis.rawAiResponse && 
        Array.isArray(result.productAnalysis.rawAiResponse.items)) {
      // Get the array of filenames
      const filenames = Array.isArray(result.filename) ? result.filename : [result.filename];
      
      // Map each item to its corresponding filename using the imageId or imageIndex
      return result.productAnalysis.items.map((item) => {
        // Extract the image index from imageId (format: image_X)
        const imageIndex = extractImageIndex(item.imageId);
        
        // Use the originalFilename property if available, otherwise fall back to the array of filenames
        const filename = item.originalFilename || filenames[Math.min(imageIndex, filenames.length - 1)];
        
        // Create the public image URL using the correct filename
        const imageUrl = convertToPublicImageUrl(item.imageUrl, filename);
        
        return {
          name: item.name,
          confidence: item.confidence || 0.8,
          value: item.value || 0,
          condition: item.condition,
          source: result.batchProcessed ? 'image-batch' : 'image',
          filename: filename || 'unknown',
          position: item.position,
          color: item.color,
          imageId: item.imageId,
          imageUrl: imageUrl
        };
      });
    }
    // Handle video results
    else if (result.type === 'video' && result.results) {
      return result.results
        .filter(frameResult => frameResult && frameResult.productAnalysis && frameResult.productAnalysis.items)
        .flatMap((frameResult, frameIndex) => {
          return frameResult!.productAnalysis.items.map((item: ProductItem) => {
            // Create a proper filename for the frame
            const filename = `frame_${frameIndex + 1}`;
            
            // Create the public image URL using the frame filename
            const imageUrl = convertToPublicImageUrl(item.imageUrl, filename);
            
            return {
              name: item.name,
              confidence: item.confidence || 0.8,
              value: item.value || 0,
              condition: item.condition,
              source: 'video',
              filename: filename,
              position: item.position || 'unknown',
              color: item.color || 'unknown',
              imageId: item.imageId || `video_frame_${frameIndex + 1}`,
              imageUrl: imageUrl
            };
          });
        });
    }
    return [] as ProductSummaryItem[];
  });
};

/**
 * Consolidates product items into a single item (for single item mode)
 * @param productSummary Array of product summary items
 * @returns Consolidated array with a single item
 */
export const consolidateToSingleItem = (productSummary: ProductSummaryItem[]): ProductSummaryItem[] => {
  // Sort by confidence to find the main item
  productSummary.sort((a, b) => b.confidence - a.confidence);
  const mainItem = productSummary[0];
  
  // Calculate total value from all items
  const totalValue = productSummary.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Combine conditions from all items
  const allConditions = new Set(productSummary.map(item => item.condition).filter(Boolean));
  const combinedCondition = Array.from(allConditions).join('; ');
  
  // Create a single consolidated item
  return [{
    name: mainItem.name,
    confidence: mainItem.confidence,
    value: totalValue,
    condition: combinedCondition || mainItem.condition,
    source: 'consolidated',
    filename: 'multiple-files',
    originalItems: productSummary.length,
    itemDetails: productSummary
  }];
};

/**
 * Groups similar items together
 * @param productSummary Array of product summary items
 * @returns Array of consolidated product groups
 */
export const groupSimilarItems = (productSummary: ProductSummaryItem[]): ConsolidatedProduct[] => {
  // Group similar items (same name with different confidence levels)
  const groupedProducts = productSummary.reduce((groups: Record<string, ConsolidatedProduct>, item) => {
    // Normalize the name for grouping
    const normalizedName = item.name.toLowerCase().trim();
    if (!groups[normalizedName]) {
      groups[normalizedName] = {
        name: item.name,
        instances: [],
        highestConfidence: item.confidence,
        totalValue: 0
      };
    }
    groups[normalizedName].instances.push(item);
    groups[normalizedName].totalValue += item.value || 0;
    if (item.confidence > groups[normalizedName].highestConfidence) {
      groups[normalizedName].highestConfidence = item.confidence;
    }
    return groups;
  }, {});
  
  // Convert back to array and sort by highest confidence
  return Object.values(groupedProducts).sort((a, b) => 
    b.highestConfidence - a.highestConfidence
  );
};

/**
 * Formats single item mode results to match the expected structure
 * @param productSummary Array of product summary items
 * @returns Array of consolidated product groups
 */
export const formatSingleItemResults = (productSummary: ProductSummaryItem[]): ConsolidatedProduct[] => {
  return productSummary.map(item => ({
    name: item.name,
    instances: [item],
    highestConfidence: item.confidence,
    totalValue: item.value || 0,
    isSingleItem: true,
    originalItems: item.originalItems || 1,
    itemDetails: item.itemDetails || [item]
  }));
};
