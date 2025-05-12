import { Request, Response } from "express";
import { processImage, processImageBatch } from "../services/imageService";
import { generatePDFReport } from "../utils/pdfGenerator";
import { getMarketResearch } from "../services/marketResearchService";
import { processVideo } from "../services/videoService";
import { MarketValuation } from "../services/openaiService";

// Define result types to fix TypeScript errors
type ImageResult = {
  type: 'image';
  filename: string | any[];
  aiValuation: MarketValuation;
  processedImagePath?: string;
  processedImagePaths?: string[];
  batchProcessed?: boolean;
  imageCount?: number;
};

type VideoResult = {
  type: 'video';
  filename: string | any[];
  totalFrames: number;
  uniqueFrames: number;
  processedFrames: number;
  results: ({
    aiValuation: MarketValuation;
    processedImagePath: string;
    frame: string;
  } | null)[];
};

type MediaResult = ImageResult | VideoResult;

export const processMedia = async (req: Request, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    
    // Parse toggle options from front-end with default values
    const options = {
      singleItem: req.body.singleItem === 'true' || false,       // Single item mode vs. multiple items
      fullReport: req.body.fullReport === 'true' || false,       // Generate full detailed report
      currency: (req.body.currency || 'USD').toUpperCase(),      // USD or CAD
      includeTearWear: req.body.includeTearWear === 'true' || false,  // Include tear/wear analysis
      
      // Additional report options if fullReport is true
      reportOptions: {
        includeMarketComparison: req.body.includeMarketComparison === 'true' || false,
        includeConditionDetails: req.body.includeConditionDetails === 'true' || false,
        includePriceHistory: req.body.includePriceHistory === 'true' || false
      }
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
          includeTearWear: options.includeTearWear,
          currency: options.currency
        });
        results.push({
          type: 'video',
          filename: file.originalname,
          ...result,
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
        // Pass options to processImageBatch
        const batchResult = await processImageBatch(imagePaths, {
          includeTearWear: options.includeTearWear,
          currency: options.currency,
          singleItem: options.singleItem
        });
        results.push({
          type: 'image',
          filename: imageFiles.map((f: any) => f.originalname),
          batchProcessed: true,
          imageCount: imagePaths.length,
          ...batchResult,
        });
      }
    } else {
      // Process each image individually
      for (const file of imageFiles) {
        if (typeof file.path === 'string') {
          // Pass options to processImage
          const result = await processImage(file.path, {
            includeTearWear: options.includeTearWear,
            currency: options.currency
          });
          results.push({
            type: 'image',
            filename: file.originalname,
            ...result,
          });
        }
      }
    }

    // Extract product names with confidence levels first
    let productSummary = results.flatMap(result => {
      // Handle image results
      if (result.type === 'image' && result.aiValuation && Array.isArray(result.aiValuation.items)) {
        return result.aiValuation.items.map((item: { name: string; confidence: number; value: number; condition: string }) => ({
          name: item.name,
          confidence: item.confidence,
          value: item.value,
          condition: item.condition,
          source: result.batchProcessed ? 'image-batch' : 'image',
          filename: typeof result.filename === 'string' ? result.filename : 'multiple-files'
        }));
      }
      // Handle video results which have nested structure
      if (result.type === 'video' && (result as VideoResult).results && Array.isArray((result as VideoResult).results)) {
        return (result as VideoResult).results.flatMap((frameResult: any) => {
          if (frameResult && frameResult.aiValuation && Array.isArray(frameResult.aiValuation.items)) {
            return frameResult.aiValuation.items.map((item: { name: string; confidence: number; value: number; condition: string }) => ({
              name: item.name,
              confidence: item.confidence,
              value: item.value,
              condition: item.condition,
              source: `${result.type} (frame: ${frameResult.frame || 'unknown'})`,
              filename: typeof result.filename === 'string' ? result.filename : 'multiple-files'
            }));
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
        originalItems: productSummary.length,
        itemDetails: productSummary
      }];
    }
    
    // Sort by confidence level (highest first)
    productSummary.sort((a, b) => b.confidence - a.confidence);
    
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
        originalItems: item.originalItems || 1,
        itemDetails: item.itemDetails || [item]
      }));
    }
    
    // Generate reports
    if (hasVideo) {
      // For videos, generate a single comprehensive report
      const videoResults = results.filter((r) => r.type === 'video');
      const marketResearch = await getMarketResearch();
      const reportPath = await generatePDFReport({
        type: 'video',
        results: videoResults,
        marketResearch,
        options: {
          fullReport: options.fullReport,
          currency: options.currency,
          includeTearWear: options.includeTearWear,
          ...options.reportOptions
        }
      });
      return res.json({
        status: 'success',
        type: 'video',
        totalFiles: files.length,
        processedFiles: results.length,
        consolidatedProducts,  // Grouped products with highest confidence
        productSummary,        // Detailed product list
        reportPath,
        results: videoResults,
      });
    } else {
      // For images, generate a single comprehensive report for all images
      const marketResearch = await getMarketResearch();
      const reportPath = await generatePDFReport({
        type: 'image',
        results, // All image results
        marketResearch,
        options: {
          fullReport: options.fullReport,
          currency: options.currency,
          includeTearWear: options.includeTearWear,
          ...options.reportOptions
        }
      });
      return res.json({
        status: 'success',
        type: 'image',
        totalFiles: files.length,
        processedFiles: results.length,
        consolidatedProducts,  // Grouped products with highest confidence
        productSummary,        // Detailed product list
        reportPath,
        results,
      });
    }
  } catch (error) {
    console.error("Error processing media:", error);
    return res.status(500).json({ error: "Failed to process media" });
  }
};
