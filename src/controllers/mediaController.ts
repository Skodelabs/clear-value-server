import { Request, Response } from "express";
import { processVideo } from "../services/videoService";
import { analyzeProductFromImage, analyzeProductFromImageBatch, ProductItem } from "../services/productAnalysisService";

// Use the ProductAnalysisResult type from the service
import { ProductAnalysisResult } from "../services/productAnalysisService";

// Define video result types
type VideoFrameResult = {
  productAnalysis: ProductAnalysisResult;
  processedImagePath: string;
  frame: string;
};

type ImageResult = {
  type: 'image';
  filename: string | any[];
  productAnalysis: ProductAnalysisResult;
  batchProcessed?: boolean;
  imageCount?: number;
};

type VideoResult = {
  type: 'video';
  filename: string | any[];
  totalFrames: number;
  uniqueFrames: number;
  processedFrames: number;
  results: (VideoFrameResult | null)[];
};

type MediaResult = ImageResult | VideoResult;

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
      singleItem: req.body.singleItem === 'true' || false,       // Single item mode vs. multiple items
      includeTearWear: req.body.includeTearWear === 'true' || false  // Include tear/wear analysis
    };

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const imageFiles = files.filter((file: any) => file.mimetype && file.mimetype.startsWith('image/'));
    const videoFiles = files.filter((file: any) => file.mimetype && file.mimetype.startsWith('video/'));
    
    // Validate: only one video allowed
    if (videoFiles.length > 1) {
      return res.status(400).json({ error: "Only one video can be uploaded per request" });
    }
    
    const results: MediaResult[] = [];

    // Process videos (only one video supported per request)
    let hasVideo = false;
    for (const file of videoFiles) {
      hasVideo = true;
      // Only process if file.path is a string
      if (typeof file.path === 'string') {
        // Pass options to processVideo
        const result = await processVideo(file.path, {
          includeTearWear: options.includeTearWear
        });
        
        // The video service now returns results in the new format
        // No conversion needed as analyzeProductFromImage is already used
        const videoResults = result.results.map(frameResult => {
          if (frameResult) {
            return {
              productAnalysis: frameResult.productAnalysis || {
                success: false,
                items: [],
                rawAiResponse: { items: [], description: '', estimatedValue: 0, confidence: 0, factors: [] }
              },
              processedImagePath: frameResult.processedImagePath || '',
              frame: frameResult.frame
            };
          }
          return null;
        });
        
        results.push({
          type: 'video',
          filename: file.originalname,
          totalFrames: result.totalFrames,
          uniqueFrames: result.uniqueFrames,
          processedFrames: result.processedFrames,
          results: videoResults
        });
      }
    }

    // Process images (multiple allowed)
    // Use singleItem option or batch parameter to determine processing mode
    const processBatchParam = req.query.batch === 'true' || options.singleItem;
    
    if (processBatchParam && imageFiles.length > 1) {
      // Process all images as a batch (different angles of the same item)
      const imagePaths = imageFiles
        .filter((file: any) => typeof file.path === 'string')
        .map((file: any) => file.path as string);
      
      if (imagePaths.length > 0) {
        // Pass options to analyzeProductFromImageBatch
        const result = await analyzeProductFromImageBatch(imagePaths, {
          includeTearWear: options.includeTearWear,
          singleItem: true
        });
      
        results.push({
          type: 'image',
          filename: imageFiles.map((file: any) => file.originalname),
          productAnalysis: result,
          batchProcessed: true,
          imageCount: imagePaths.length
        });
      }
    } else {
      // Process each image individually
      for (const file of imageFiles) {
        if (typeof file.path === 'string') {
          // Pass options to analyzeProductFromImage
          const result = await analyzeProductFromImage(file.path, {
            includeTearWear: options.includeTearWear
          });
        
          results.push({
            type: 'image',
            filename: file.originalname,
            productAnalysis: result
          });
        }
      }
    }

    // Extract product names with confidence levels first
    let productSummary = results.flatMap(result => {
      // Handle image results
      if (result.type === 'image' && result.productAnalysis.rawAiResponse && Array.isArray(result.productAnalysis.rawAiResponse.items)) {
        const aiValuation = result.productAnalysis.rawAiResponse.items.map((item: { name: string; confidence: number; value: number; condition: string }) => ({
          name: item.name,
          confidence: item.confidence,
          value: item.value,
          condition: item.condition,
          source: result.batchProcessed ? 'image-batch' : 'image',
          filename: typeof result.filename === 'string' ? result.filename : 'multiple-files'
        }));
        return aiValuation;
      }
      // Handle video results which have nested structure
      if (result.type === 'video' && (result as VideoResult).results && Array.isArray((result as VideoResult).results)) {
        return (result as VideoResult).results.flatMap(frameResult => {
          if (frameResult && frameResult.productAnalysis && frameResult.productAnalysis.rawAiResponse && Array.isArray(frameResult.productAnalysis.rawAiResponse.items)) {
            const aiValuation = frameResult.productAnalysis.rawAiResponse.items.map((item: { name: string; confidence: number; value: number; condition: string }) => ({
              name: item.name,
              confidence: item.confidence,
              value: item.value,
              condition: item.condition,
              source: 'video-frame',
              filename: `${typeof result.filename === 'string' ? result.filename : 'video'}-frame-${frameResult.frame}`
            }));
            return aiValuation;
          }
          return [];
        });
      }
      return [];
    });
    
    // If single item mode is enabled, consolidate all items into a single item
    if (options.singleItem && productSummary.length > 0) {
      // Find the most confident item to use as the main item
      productSummary.sort((a, b) => b.confidence - a.confidence);
      const mainItem = productSummary[0];
      
      // Calculate total value from all items
      const totalValue = productSummary.reduce((sum, item) => sum + (item.value || 0), 0);
      
      // Combine conditions from all items
      const allConditions = new Set(productSummary.map(item => item.condition).filter(Boolean));
      const combinedCondition = Array.from(allConditions).join('; ');
      
      // Create a single consolidated item
      productSummary = [{
        name: mainItem.name,
        confidence: mainItem.confidence,
        value: totalValue,
        condition: combinedCondition || mainItem.condition,
        source: 'consolidated',
        filename: 'multiple-files',
        // Add these as custom properties with type assertion
        ...({
          originalItems: productSummary.length,
          itemDetails: productSummary
        } as any)
      }];
    }
    
    // Sort by confidence level (highest first)
    productSummary.sort((a, b) => b.confidence - a.confidence);
    console.log("Product summary:", productSummary);
    
    // If we're not in single item mode, group similar items
    // Otherwise, we've already consolidated everything into a single item
    let consolidatedProducts;
    
    if (!options.singleItem) {
      // Group similar items (same name with different confidence levels)
      const groupedProducts = productSummary.reduce((groups: any, item) => {
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
        groups[normalizedName].totalValue += item.value;
        if (item.confidence > groups[normalizedName].highestConfidence) {
          groups[normalizedName].highestConfidence = item.confidence;
        }
        return groups;
      }, {});
      
      // Convert back to array and sort by highest confidence
      consolidatedProducts = Object.values(groupedProducts).sort((a: any, b: any) => 
        b.highestConfidence - a.highestConfidence
      );
    } else {
      // In single item mode, we've already consolidated everything
      // Just format it to match the expected structure
      consolidatedProducts = productSummary.map(item => ({
        name: item.name,
        instances: [item],
        highestConfidence: item.confidence,
        totalValue: item.value,
        isSingleItem: true,
        // Add these as custom properties with type assertion
        ...({
          originalItems: (item as any).originalItems || 1,
          itemDetails: (item as any).itemDetails || [item]
        } as any)
      }));
    }
    
    // Return product analysis results in the new format
    // Collect all items from all processed results
    const allItems = results.flatMap(result => {
      if (result.type === 'image' && result.productAnalysis && result.productAnalysis.items) {
        return result.productAnalysis.items;
      } else if (result.type === 'video' && result.results) {
        // Collect items from video frames
        return result.results
          .filter(frameResult => frameResult && frameResult.productAnalysis && frameResult.productAnalysis.items)
          .flatMap(frameResult => frameResult!.productAnalysis.items);
      }
      return [];
    });
    
    return res.json({
      success: true,
      items: allItems,
    });
  } catch (error) {
    console.error("Error processing media:", error);
    return res.status(500).json({ error: "Failed to process media" });
  }
};
