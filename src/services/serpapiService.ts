import axios from "axios";
import { AppError } from "../middleware/errorHandler";

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
 * Helper function to convert language code to country code for SerpAPI
 * This helps in getting more relevant search results for the specific region/language
 */
const getCountryCodeFromLanguage = (language: string): string => {
  const languageToCountry: Record<string, string> = {
    'en': 'us',    // English -> United States
    'fr': 'fr',    // French -> France
    'es': 'es',    // Spanish -> Spain
    'de': 'de',    // German -> Germany
    'it': 'it',    // Italian -> Italy
    'pt': 'pt',    // Portuguese -> Portugal
    'nl': 'nl',    // Dutch -> Netherlands
    'ru': 'ru',    // Russian -> Russia
    'ja': 'jp',    // Japanese -> Japan
    'zh': 'cn',    // Chinese -> China
    'ar': 'ae',    // Arabic -> UAE
    'hi': 'in',    // Hindi -> India
    'ko': 'kr',    // Korean -> South Korea
  };
  
  // Extract the base language code if it contains region (e.g., 'en-US' -> 'en')
  const baseLanguage = language.split('-')[0].toLowerCase();
  
  // Return the country code or default to 'us' if not found
  return languageToCountry[baseLanguage] || 'us';
};

const determineMarketTrend = (prices: number[]): string => {
  if (prices.length < 2) return "stable";
  
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const midPoint = Math.floor(sortedPrices.length / 2);
  const lowerHalf = sortedPrices.slice(0, midPoint);
  const upperHalf = sortedPrices.slice(midPoint);
  
  const lowerAvg = lowerHalf.reduce((sum, price) => sum + price, 0) / lowerHalf.length;
  const upperAvg = upperHalf.reduce((sum, price) => sum + price, 0) / upperHalf.length;
  
  if (upperAvg > lowerAvg * 1.1) return "increasing";
  if (upperAvg < lowerAvg * 0.9) return "decreasing";
  return "stable";
};

export const researchMarketValue = async (
  itemDescription: string,
  language: string = 'en'
): Promise<MarketResearchResult> => {
  try {
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        api_key: process.env.SERPAPI_KEY,
        engine: "google_shopping",
        q: `${itemDescription} price`,
        num: 10,
        hl: language, // Language parameter for search results
        gl: getCountryCodeFromLanguage(language), // Country code based on language
      },
    });

    const results = response.data.shopping_results || [];
    const prices = results
      .map((result: any) => parseFloat(result.price?.replace(/[^0-9.]/g, "")))
      .filter((price: number) => !isNaN(price));

    if (prices.length === 0) {
      throw new AppError("No market data found", 404);
    }

    const averagePrice =
      prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;

    return {
      averagePrice,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
      },
      sources: results.map((result: any) => result.source),
      marketTrend: determineMarketTrend(prices),
    };
  } catch (error) {
    throw new AppError("Failed to research market value", 500);
  }
}; 