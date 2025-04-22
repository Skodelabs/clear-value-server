import axios from "axios";
import { AppError } from "../middleware/errorHandler";
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

export const getMarketResearch = async (description?: string) => {
  try {
    const marketResearch = await researchMarketValue(description || "");
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

const determineMarketTrend = (prices: number[]): string => {
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  if (median > average) {
    return "upward";
  } else if (median < average) {
    return "downward";
  } else {
    return "stable";
  }
}; 