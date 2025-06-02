import { ProductAnalysisResult, ProductItem } from "../services/productAnalysisService";

// Define video result types
export type VideoFrameResult = {
  productAnalysis: ProductAnalysisResult;
  processedImagePath: string;
  frame: string;
};

export type ImageResult = {
  type: 'image';
  filename: string | any[];
  productAnalysis: ProductAnalysisResult;
  batchProcessed?: boolean;
  imageCount?: number;
};

export type VideoResult = {
  type: 'video';
  filename: string | any[];
  totalFrames: number;
  uniqueFrames: number;
  processedFrames: number;
  results: (VideoFrameResult | null)[];
};

export type MediaResult = ImageResult | VideoResult;

// Define a type for the product summary items
export interface ProductSummaryItem {
  name: string;
  confidence: number;
  value: number;
  condition: string;
  source: string;
  filename: string;
  position?: string;
  color?: string;
  imageId?: string;
  imageUrl?: string;
  [key: string]: any; // For additional properties
}

// Define a type for consolidated product groups
export interface ConsolidatedProduct {
  name: string;
  instances: ProductSummaryItem[];
  highestConfidence: number;
  totalValue: number;
  isSingleItem?: boolean;
  originalItems?: number;
  itemDetails?: ProductSummaryItem[];
}
