import { searchMarketPrices } from "./marketSearchService";

export interface MarketResearchResult {
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  sources: string[];
  marketTrend: string;
}

/**
 * Get market research data for an item using OpenAI web search
 * @param description - Description of the item to research
 * @param language - Language code (e.g., 'en', 'fr')
 * @param currency - Currency code (e.g., 'USD', 'CAD')
 * @returns Market research data including average price, price range, and market trend
 */
export const getMarketResearch = async (
  description?: string, 
  language: string = 'en',
  currency: string = 'USD'
) => {
  try {
    if (!description) {
      throw new Error("Item description is required");
    }
    
    // Use OpenAI web search to get market prices
    const marketResearch = await searchMarketPrices(description, language, currency);
    
    return {
      averagePrice: marketResearch.averagePrice,
      priceRange: marketResearch.priceRange,
      marketTrend: marketResearch.marketTrend,
      sources: marketResearch.sources,
    };
  } catch (error) {
    console.error("Error getting market research:", error);
    return {
      averagePrice: 0,
      priceRange: { min: 0, max: 0 },
      marketTrend: "unknown",
      sources: [],
    };
  }
};
 