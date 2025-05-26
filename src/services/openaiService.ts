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
    confidence: number;
  }[];
}

// Utility: Enhanced deduplicate items function that better handles different angles and backgrounds
function deduplicateItems(items: any[]): any[] {
  if (!items || items.length === 0) return [];

  // Group similar items using a similarity score approach
  const processedItems: any[] = [];
  const itemGroups: any[][] = [];

  // First pass: Normalize all item names for better comparison
  items.forEach((item) => {
    if (!item.name) return; // Skip items without names

    // Create normalized name for comparison
    const normalizedName = (item.name || "")
      .toLowerCase()
      .replace(/\s+/g, " ") // normalize whitespace
      .replace(/(\d{4})/g, "") // remove years
      .replace(/awd|r\/t|sxt|journey|dodge|model|brand|series/gi, "") // remove common model terms
      .replace(
        /black|white|gray|grey|blue|red|green|yellow|brown|silver|gold/gi,
        ""
      ) // remove colors
      .replace(/small|medium|large|xl|xxl|mini|big/gi, "") // remove size indicators
      .replace(/[^a-z0-9 ]/gi, "") // remove special characters
      .replace(/\b(the|a|an|in|on|at|with|and|or|for)\b/gi, "") // remove common words
      .trim();

    // Extract key features from details for additional matching
    const detailsText = (item.details || "").toLowerCase();

    // Store processed item with normalized data
    processedItems.push({
      original: item,
      normalizedName,
      detailsText,
    });
  });

  // Second pass: Group similar items
  processedItems.forEach((processedItem) => {
    // Check if this item belongs to an existing group
    let foundGroup = false;

    for (const group of itemGroups) {
      const representative = group[0]; // Use first item in group as representative

      // Check for name similarity
      if (isSimilarItem(processedItem, representative)) {
        group.push(processedItem);
        foundGroup = true;
        break;
      }
    }

    // If no matching group found, create a new one
    if (!foundGroup) {
      itemGroups.push([processedItem]);
    }
  });

  // Third pass: Merge items in each group
  return itemGroups.map((group) => {
    if (group.length === 1) {
      return group[0].original; // No merging needed
    }

    // Merge items in this group
    const mergedItem = { ...group[0].original };

    // Combine information from all items in the group
    for (let i = 1; i < group.length; i++) {
      const item = group[i].original;

      // Take the highest value
      if (item.value && (!mergedItem.value || item.value > mergedItem.value)) {
        mergedItem.value = item.value;
      }

      // Combine unique condition information
      if (item.condition && !mergedItem.condition.includes(item.condition)) {
        mergedItem.condition = mergedItem.condition
          ? `${mergedItem.condition}; ${item.condition}`
          : item.condition;
      }

      // Combine unique details
      if (item.details && !mergedItem.details.includes(item.details)) {
        mergedItem.details = mergedItem.details
          ? `${mergedItem.details}; ${item.details}`
          : item.details;
      }

      // Increase confidence if we have multiple sightings of the same item
      if (mergedItem.confidence) {
        mergedItem.confidence = Math.min(0.95, mergedItem.confidence + 0.05);
      }
    }

    return mergedItem;
  });
}

// Helper function to determine if two items are similar
function isSimilarItem(item1: any, item2: any): boolean {
  // Direct name match (after normalization)
  if (item1.normalizedName === item2.normalizedName) return true;

  // Check for substring match (one item name contains the other)
  if (
    item1.normalizedName.includes(item2.normalizedName) ||
    item2.normalizedName.includes(item1.normalizedName)
  ) {
    return true;
  }

  // Check for word overlap (at least 50% of words match)
  const words1 = item1.normalizedName
    .split(" ")
    .filter((w: string) => w.length > 2);
  const words2 = item2.normalizedName
    .split(" ")
    .filter((w: string) => w.length > 2);

  if (words1.length > 0 && words2.length > 0) {
    const commonWords = words1.filter((w: string) => words2.includes(w));
    const overlapRatio1 = commonWords.length / words1.length;
    const overlapRatio2 = commonWords.length / words2.length;

    if (overlapRatio1 > 0.5 || overlapRatio2 > 0.5) return true;
  }

  // Check details for significant overlap
  if (item1.detailsText && item2.detailsText) {
    const detailWords1 = item1.detailsText
      .split(" ")
      .filter((w: string) => w.length > 3);
    const detailWords2 = item2.detailsText
      .split(" ")
      .filter((w: string) => w.length > 3);

    if (detailWords1.length > 0 && detailWords2.length > 0) {
      const commonDetailWords = detailWords1.filter((w: string) =>
        detailWords2.includes(w)
      );
      const detailOverlapRatio =
        commonDetailWords.length /
        Math.min(detailWords1.length, detailWords2.length);

      if (detailOverlapRatio > 0.4) return true;
    }
  }

  return false;
}

export const analyzeImage = async (
  imageBuffer: Buffer
): Promise<MarketValuation> => {
  let retries = 0;
  console.log("Analyzing image with OpenAI");
  console.log(imageBuffer);

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

                text: `You are a professional property appraiser with expertise in identifying valuable items in images. Your task is to identify ALL items in this image, even if they are partially visible, blurry, or in the background.

IMPORTANT INSTRUCTIONS:
1. Identify EVERY item in the image that could have value, no matter how small or partially visible.
2. For unclear or partially visible items, still list them with a descriptive name (e.g., "Black electronic device on shelf", "Wooden furniture in corner").
3. Pay special attention to:
   - Electronics (TVs, computers, appliances)
   - Furniture (sofas, tables, chairs)
   - Decorative items (artwork, sculptures)
   - Tools and equipment
   - Vehicles or vehicle parts
   - Collectibles or unique items

4. For each item provide:
   - name: Be as specific as possible. Include brand, model, color, and size if visible.
   - condition: Describe the visible condition (new, excellent, good, fair, poor, damaged)
   - details: Include any distinguishing features, visible damage, or notable characteristics

5. Use your expertise to identify items even when:
   - They are partially obscured by other objects
   - They are in shadows or poorly lit areas
   - They appear in reflections (mirrors, glass surfaces)
   - They are at unusual angles or perspectives
   - They are in the background of the image

Respond ONLY in this JSON format:
{
  "items": [
    {
      "name": "item_name",
      "condition": "condition_description",
      "details": "item_details"
    }
  ]
}

Remember: It's better to identify an item with a generic description than to miss it entirely.`,
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

        // Add default values for backward compatibility
        const itemsWithDefaults = (parsedValuation.items || []).map(
          (item: any) => ({
            ...item,
            value: item.value || 0,
            confidence: item.confidence || 0.8,
          })
        );

        return {
          description: "Image analysis result",
          estimatedValue: 0,
          confidence: 0.8,
          factors: ["quality", "uniqueness", "market demand"],
          items: itemsWithDefaults,
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
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * retries)
        );
        console.log(`Retry attempt ${retries} for OpenAI multi-image analysis`);
      }
      const messages: any[] = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a professional property appraiser analyzing multiple images of the same space from different angles. Your task is to create a comprehensive inventory of ALL unique items visible across these images.

CRITICAL INSTRUCTIONS:

1. IDENTIFY UNIQUE ITEMS: These images show the same space from different angles. Identify each unique item only ONCE, even if it appears in multiple images.

2. DETECT SAME ITEMS FROM DIFFERENT ANGLES: 
   - Recognize when the same physical item appears in different images, even if:
     * It's photographed from different angles
     * It's in different lighting conditions
     * It's partially visible in some images
     * It's against different backgrounds
     * It appears larger/smaller due to camera distance

3. CAPTURE EVERY ITEM:
   - List ALL items with potential value, even if partially visible or unclear
   - For unclear items, use descriptive names (e.g., "Black electronic device on shelf")
   - Pay special attention to items in backgrounds, corners, reflections, or shadows

4. COMBINE INFORMATION ACROSS IMAGES:
   - If an item appears in multiple images, combine all visible details
   - Use the clearest view for the primary description
   - Add any additional details visible from other angles

5. For each unique item provide:
   - name: Be as specific as possible (brand, model, color, size if visible)
   - condition: Detailed condition assessment (new, excellent, good, fair, poor, damaged)
   - details: Comprehensive description including all visible features from ALL angles

Respond ONLY in this JSON format:
{
  "items": [
    {
      "name": "item_name",
      "condition": "condition_description",
      "details": "item_details"
    }
  ]
}

REMEMBER: It's better to provide a complete inventory with some generic descriptions than to miss items entirely.`,
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
        max_tokens: 80192,
        response_format: { type: "json_object" },
      });
      const analysis = response.choices[0]?.message?.content;
      console.log("Analysis:", analysis);
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

        // Add default values for backward compatibility
        const itemsWithDefaults = dedupedItems.map((item: any) => ({
          ...item,
          value: item.value || 0,
          confidence: item.confidence || 0.8,
        }));
        console.log("Items with defaults:", itemsWithDefaults);

        return {
          description: "Image analysis result",
          estimatedValue: 0,
          confidence: 0.8,
          factors: ["quality", "uniqueness", "market demand"],
          items: itemsWithDefaults,
        };
      } catch (parseError) {
        console.error(
          "Parse Error (multi-image):",
          parseError,
          "Response:",
          analysis
        );
        if (retries < MAX_RETRIES) {
          retries++;
          continue;
        }
        throw new AppError(
          "Failed to parse OpenAI response (multi-image)",
          500
        );
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
        console.log(
          "Using fallback values due to OpenAI API failure (multi-image)"
        );
        return {
          description: "Unable to analyze images - using fallback values",
          estimatedValue: 0,
          confidence: 0.5,
          factors: ["API unavailable"],
          items: [],
        };
      }
      throw new AppError(
        "Failed to analyze images with OpenAI (multi-image)",
        500
      );
    }
  }
  throw new AppError(
    "Maximum retries exceeded for OpenAI multi-image analysis",
    500
  );
};

/**
 * Advanced duplicate detection using OpenAI
 * This function takes the results from image analysis and uses OpenAI to further refine duplicate detection
 * @param analysisResults - The results from image analysis containing items that might have duplicates
 * @returns A refined MarketValuation with duplicates removed
 */
export const detectDuplicateItems = async (
  analysisResults: MarketValuation
): Promise<MarketValuation> => {
  if (!analysisResults.items || analysisResults.items.length <= 1) {
    return analysisResults; // No need for duplicate detection with 0 or 1 items
  }

  let retries = 0;
  while (retries <= MAX_RETRIES) {
    try {
      if (retries > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * retries)
        );
        console.log(`Retry attempt ${retries} for OpenAI duplicate detection`);
      }

      // Format the items for OpenAI analysis
      const itemsJson = JSON.stringify(analysisResults.items, null, 2);

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: `You are an expert in identifying duplicate items in inventory lists. Your task is to analyze a list of items and identify which ones are likely duplicates of the same physical object.

You MUST return your response in this exact JSON format:

{
  "items": [
    {
      "name": "item_name",
      "condition": "condition_description",
      "details": "item_details"
    }
  ]
}

Do not include any other fields or structures in your response.`,
          },
          {
            role: "user",
            content: `I have the following items from an image analysis:

${itemsJson}

Please identify any duplicates in this list and merge them. Two items are duplicates if they are the same physical object, even if they are described differently or have different details. Consider:

1. Similar names with minor variations (e.g., "Black Samsung TV" and "Samsung Television")
2. Same item with different details visible (e.g., "Wooden desk" and "Oak writing desk")
3. Generic descriptions that might refer to the same item (e.g., "Electronic device" and "Black gadget on shelf")
4. Same item photographed from different angles or with different backgrounds

For each set of duplicates, merge them into a single item with:
- The most specific name
- Combined condition information
- Combined details from all duplicates

Example of merging duplicates:

Input items:
[
  {
    "name": "Black Samsung TV",
    "condition": "Good, minor scratches",
    "details": "55-inch display, wall-mounted"
  },
  {
    "name": "Samsung Television",
    "condition": "Working",
    "details": "HDMI ports visible, remote control nearby"
  }
]

Merged output:
{
  "items": [
    {
      "name": "Samsung 55-inch TV",
      "condition": "Good, minor scratches, working",
      "details": "55-inch display, wall-mounted, HDMI ports visible, remote control nearby"
    }
  ]
}

Return ONLY the deduplicated list in exactly the same JSON format shown above, with no duplicates and no additional text or explanations.`,
          },
        ],
        max_tokens: 8192,
        response_format: { type: "json_object" },
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        if (retries < MAX_RETRIES) {
          retries++;
          continue;
        }
        throw new AppError(
          "Empty response from OpenAI duplicate detection",
          500
        );
      }

      try {
        const parsedResponse = JSON.parse(analysis);

        // Ensure the response has the expected format
        if (!parsedResponse.items || !Array.isArray(parsedResponse.items)) {
          throw new Error(
            "Invalid response format from OpenAI duplicate detection"
          );
        }

        // Add default values for backward compatibility
        const itemsWithDefaults = parsedResponse.items.map((item: any) => ({
          ...item,
          value: item.value || 0,
          confidence: item.confidence || 0.8,
        }));

        // Return the refined analysis with duplicates removed
        return {
          ...analysisResults,
          items: itemsWithDefaults,
        };
      } catch (parseError) {
        console.error(
          "Parse Error (duplicate detection):",
          parseError,
          "Response:",
          analysis
        );
        if (retries < MAX_RETRIES) {
          retries++;
          continue;
        }
        throw new AppError(
          "Failed to parse OpenAI duplicate detection response",
          500
        );
      }
    } catch (error: any) {
      console.error("OpenAI Error (duplicate detection):", error);
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

      // If OpenAI fails, fall back to our local deduplication algorithm
      console.log("Falling back to local duplicate detection");
      return {
        ...analysisResults,
        items: deduplicateItems(analysisResults.items),
      };
    }
  }

  throw new AppError(
    "Maximum retries exceeded for OpenAI duplicate detection",
    500
  );
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
