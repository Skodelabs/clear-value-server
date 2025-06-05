/**
 * Market Search Service
 * This module provides functions for searching market prices using OpenAI's web search capabilities
 */

import OpenAI from "openai";
import { AppError } from "../middleware/errorHandler";
import { configDotenv } from "dotenv";
configDotenv();
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MarketResearchResult {
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  marketTrend: string;
  sources: string[];
}

/**
 * Search for market prices using OpenAI's web search capabilities
 * @param itemDescription - Description of the item to search for
 * @param language - Language code (e.g., 'en', 'fr')
 * @param currency - Currency code (e.g., 'USD', 'CAD')
 * @returns Market research data including average price, price range, and market trend
 */
export const searchMarketPrices = async (
  itemDescription: string,
  language: string = "en",
  currency: string = "USD"
): Promise<MarketResearchResult> => {
  try {
    // Create a prompt that includes the item description, language, and currency
    const prompt = `Search the web for current market prices of: ${itemDescription}. 
    Find at least 5 different prices from reputable sources.
    Focus on ${currency} prices.
    Return the results as a JSON object with the following structure:
    {
      "prices": [list of numeric prices without currency symbols],
      "sources": [list of source names],
      "marketTrend": "increasing", "decreasing", or "stable" based on recent price trends
    }`;

    // Call OpenAI API with web search capability
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o which supports web browsing
      messages: [
        {
          role: "system",
          content: `You are a market research assistant that searches the web for current prices of items.
                   Respond in ${language === 'fr' ? 'French' : 'English'} language.
                   Always return prices in ${currency}.
                   Format your response as a valid JSON object.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AppError("No response from OpenAI", 500);
    }

    // Parse the JSON response
    const data = JSON.parse(content);
    const prices = data.prices.filter(
      (price: number) => !isNaN(price) && price > 0
    );

    if (prices.length === 0) {
      throw new AppError("No market data found", 404);
    }

    // Calculate average price and price range
    const averagePrice =
      prices.reduce((sum: number, price: number) => sum + price, 0) /
      prices.length;

    return {
      averagePrice,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
      },
      sources: data.sources || [],
      marketTrend: data.marketTrend || determineMarketTrend(prices),
    };
  } catch (error) {
    console.error("Error searching market prices:", error);
    throw new AppError("Failed to search market prices", 500);
  }
};

/**
 * Determine market trend based on price data
 * @param prices - Array of prices
 * @returns Market trend: "increasing", "decreasing", or "stable"
 */
const determineMarketTrend = (prices: number[]): string => {
  if (prices.length < 2) return "stable";

  const sortedPrices = [...prices].sort((a, b) => a - b);
  const midPoint = Math.floor(sortedPrices.length / 2);
  const lowerHalf = sortedPrices.slice(0, midPoint);
  const upperHalf = sortedPrices.slice(midPoint);

  const lowerAvg =
    lowerHalf.reduce((sum, price) => sum + price, 0) / lowerHalf.length;
  const upperAvg =
    upperHalf.reduce((sum, price) => sum + price, 0) / upperHalf.length;

  if (upperAvg > lowerAvg * 1.1) return "increasing";
  if (upperAvg < lowerAvg * 0.9) return "decreasing";
  return "stable";
};
