import { researchMarketValue } from "./serpapiService";

export interface MarketResearchResult {
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  sources: string[];
  marketTrend: string;
}

export const getMarketResearch = async (description?: string, language: string = 'en') => {
  try {
    const marketResearch = await researchMarketValue(description || "", language);
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
 