/**
 * Types related to market valuation and product analysis
 */

export interface MarketValuationItem {
  name: string;
  condition: string;
  details?: string;
  value?: number;
  confidence?: number;
  imageIndex?: number;
  imageId?: string;
  position?: string;
  color?: string;
  background?: string;
  [key: string]: any; // For additional properties
}

export interface MarketValuation {
  description: string;
  estimatedValue: number;
  confidence: number;
  factors: string[];
  items: MarketValuationItem[];
}
