import OpenAI from "openai";
import { AppError } from "../middleware/errorHandler";
import dotenv from "dotenv";

dotenv.config();

// OpenAI API configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 seconds timeout
});

export interface MarketValuation {
  description: string;
  estimatedValue: number;
  confidence: number;
  factors: string[];
  items: {
    name: string;
    value: number;
    condition: string;
  }[];
}

// Utility: Deduplicate items by normalized name
function deduplicateItems(items: any[]): any[] {
  const seen = new Map<string, any>();
  for (const item of items) {
    // Normalize name for comparison
    const normName = (item.name || "")
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/(\d{4})/g, '') // remove years
      .replace(/awd|r\/t|sxt|journey|dodge/gi, '') // remove model trims/brand for car
      .replace(/[^a-z0-9 ]/gi, '')
      .trim();
    if (!seen.has(normName)) {
      seen.set(normName, { ...item });
    } else {
      // Optionally, merge/average values or keep the highest value/condition
      const existing = seen.get(normName);
      existing.value = Math.max(existing.value, item.value);
      existing.condition += `; ${item.condition}`;
    }
  }
  return Array.from(seen.values());
}

export const analyzeImage = async (
  imageBuffer: Buffer
): Promise<MarketValuation> => {
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      // If we're retrying, add a delay
      if (retries > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * retries)
        );
        console.log(`Retry attempt ${retries} for OpenAI image analysis`);
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Identify and list all significant items in this image that contribute to the property's value. For each item, provide:
                - name (be specific, include brand/model if visible)
                - estimated market value (numeric)
                - condition (short description)

                Important: the item name should be more defined and it's brand/model should be included if visible.
                -the items name for market valuation so its should be more defined.
                - your a pro real estate appraizer.
                Respond in this JSON format:
                {
                  "items": [
                    {
                      "name": "item_name",
                      "value": estimated_value,
                      "condition": "condition_description"
                    }
                  ]
                }
                Only include items that are relevant to property value. Do not add any explanations or extra text.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBuffer.toString(
                    "base64"
                  )}`,
                },
              },
            ],
          },
        ],
        max_tokens: 8192,
        response_format: { type: "json_object" },
      });

      // Check for valid response
      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        if (retries < MAX_RETRIES) {
          retries++;
          continue;
        }
        throw new AppError("Empty response from OpenAI", 500);
      }

      try {
        const parsedValuation = JSON.parse(analysis);
        return {
          description: "Image analysis result",
          estimatedValue: 0,
          confidence: 0.8,
          factors: ["quality", "uniqueness", "market demand"],
          items: Array.isArray(parsedValuation.items)
            ? parsedValuation.items.map((item: any) => ({
                name: item.name || "Unknown Item",
                value: Number(item.value) || 0,
                condition: item.condition || "Unknown Condition",
              }))
            : [],
        };
      } catch (parseError) {
        console.error("Parse Error:", parseError, "Response:", analysis);

        if (retries < MAX_RETRIES) {
          retries++;
          continue;
        }
        throw new AppError("Failed to parse OpenAI response", 500);
      }
    } catch (error: any) {
      console.error("OpenAI Error:", error);

      // Determine if we should retry based on error type
      const shouldRetry =
        retries < MAX_RETRIES &&
        (error.status === 429 || // Rate limit error
          error.status === 500 || // OpenAI server error
          error.status === 503 || // Service unavailable
          error.code === "ETIMEDOUT" ||
          error.code === "ECONNRESET" ||
          error.code === "ECONNREFUSED" ||
          error.message?.includes("network") ||
          error.message?.includes("timeout"));

      if (shouldRetry) {
        retries++;
        continue;
      }

      // Use fallback values if API fails completely
      if (process.env.USE_FALLBACK_VALUES === "true") {
        console.log("Using fallback values due to OpenAI API failure");
        return {
          description: "Unable to analyze image - using fallback values",
          estimatedValue: 0,
          confidence: 0.5,
          factors: ["API unavailable"],
          items: [],
        };
      }

      throw new AppError("Failed to analyze image with OpenAI", 500);
    }
  }

  // This should not be reached due to the throw in the last retry, but TypeScript needs it
  throw new AppError("Maximum retries exceeded for OpenAI image analysis", 500);
};

// New: Analyze multiple images as different angles of the same item
export const analyzeImagesBatch = async (
  imageBuffers: Buffer[]
): Promise<MarketValuation> => {
  let retries = 0;
  while (retries <= MAX_RETRIES) {
    try {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * retries));
        console.log(`Retry attempt ${retries} for OpenAI multi-image analysis`);
      }
      const messages: any[] = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `These images show different angles of the same car and its accessories. Provide a single entry for each unique item, even if it appears in multiple images. Do not list the same car or accessory more than once. Group all information about each item together. For each item, provide:\n- name (be specific, include brand/model if visible)\n- estimated market value (numeric)\n- condition (short description)\nRespond in this JSON format:\n{\n  \"items\": [\n    {\n      \"name\": \"item_name\",\n      \"value\": estimated_value,\n      \"condition\": \"condition_description\"\n    }\n  ]\n}\nOnly include items that are relevant to property value. Do not add any explanations or extra text.`,
            },
            ...imageBuffers.map((imageBuffer) => ({
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
              },
            })),
          ],
        },
      ];
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: messages as any, // Fix for strict typing
        max_tokens: 8192,
        response_format: { type: "json_object" },
      });
      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        if (retries < MAX_RETRIES) {
          retries++;
          continue;
        }
        throw new AppError("Empty response from OpenAI (multi-image)", 500);
      }
      try {
        const parsedValuation = JSON.parse(analysis);
        // Deduplicate items before returning
        const dedupedItems = Array.isArray(parsedValuation.items)
          ? deduplicateItems(parsedValuation.items)
          : [];
        return {
          description: "Image analysis result",
          estimatedValue: 0,
          confidence: 0.8,
          factors: ["quality", "uniqueness", "market demand"],
          items: dedupedItems,
        };
      } catch (parseError) {
        console.error("Parse Error (multi-image):", parseError, "Response:", analysis);
        if (retries < MAX_RETRIES) {
          retries++;
          continue;
        }
        throw new AppError("Failed to parse OpenAI response (multi-image)", 500);
      }
    } catch (error: any) {
      console.error("OpenAI Error (multi-image):", error);
      const shouldRetry =
        retries < MAX_RETRIES &&
        (error.status === 429 ||
          error.status === 500 ||
          error.status === 503 ||
          error.code === "ETIMEDOUT" ||
          error.code === "ECONNRESET" ||
          error.code === "ECONNREFUSED" ||
          error.message?.includes("network") ||
          error.message?.includes("timeout"));
      if (shouldRetry) {
        retries++;
        continue;
      }
      if (process.env.USE_FALLBACK_VALUES === "true") {
        console.log("Using fallback values due to OpenAI API failure (multi-image)");
        return {
          description: "Unable to analyze images - using fallback values",
          estimatedValue: 0,
          confidence: 0.5,
          factors: ["API unavailable"],
          items: [],
        };
      }
      throw new AppError("Failed to analyze images with OpenAI (multi-image)", 500);
    }
  }
  throw new AppError("Maximum retries exceeded for OpenAI multi-image analysis", 500);
};

// Helper function for fallback image analysis if you want to implement one later
export const fallbackImageAnalysis = (imageBuffer: Buffer): MarketValuation => {
  return {
    description: "Fallback analysis - OpenAI service unavailable",
    estimatedValue: 0,
    confidence: 0.5,
    factors: ["Fallback analysis"],
    items: [],
  };
};
