import OpenAI from "openai";
import { AppError } from "../../middleware/errorHandler";
import { IMAGE_ANALYSIS_SYSTEM_PROMPT } from "./promptTemplates";
import { MAX_RETRIES, RETRY_DELAY, fallbackImageAnalysis } from "./utils";

import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze a single image using OpenAI Vision API
 * @param imageBuffer - Buffer containing the image data
 * @param language - Language code (e.g., 'en', 'fr') for the response
 * @returns Market valuation data including identified items
 */
export async function analyzeImage(
  imageBuffer: Buffer,
  language: string = 'en'
): Promise<any>{
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
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
            role: "system",
            content: IMAGE_ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and identify all items visible. Skip items that are cut off at image borders (less than 50% visible). ${language !== 'en' ? `Respond in ${language} language.` : ''} For vehicles or equipment, include all visible details, specifications,mileage and condition information.`,
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
        max_tokens: 16000,
        response_format: { type: "json_object" },
      });

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
        const items = Array.isArray(parsedValuation.items)
          ? parsedValuation.items
          : [];

        // Add default values for items
        const itemsWithDefaults = items.map(
          (item: {
            name: string;
            value?: number;
            condition: string;
            confidence?: number;
            details?: string;
          }) => ({
            ...item,
            value: item.value || 0,
            confidence: item.confidence || 0.8,
          })
        );

        return {
          description: "Image analysis completed successfully",
          estimatedValue: itemsWithDefaults.reduce(
            (sum: number, item: { value?: number }) => sum + (item.value || 0),
            0
          ),
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
        console.log("Using fallback values due to OpenAI API failure");
        return fallbackImageAnalysis();
      }

      throw new AppError("Failed to analyze image with OpenAI", 500);
    }
  }

  throw new AppError("Maximum retries exceeded for OpenAI", 500);
}

/**
 * Process images individually to maintain correct image URLs and add metadata
 * @param imageBuffers - Array of image buffers to analyze
 * @param language - Language code (e.g., 'en', 'fr') for the response
 * @returns Market valuation data including identified items from all images
 */
export async function analyzeImagesBatch(
  imageBuffers: Buffer[],
  language: string = 'en'
): Promise<any> {
  if (!imageBuffers || imageBuffers.length === 0) {
    return {
      description: "No images provided for analysis",
      estimatedValue: 0,
      confidence: 0,
      factors: ["no images"],
      items: [],
    };
  }

  try {
    // Process each image individually to maintain correct image URLs
    const allItems: any[] = [];
    const previousItemsContext: string[] = [];

    // Process images one by one instead of batches
    for (let i = 0; i < imageBuffers.length; i++) {
      console.log(`Processing image ${i + 1} of ${imageBuffers.length}`);

      // Process single image with enhanced metadata
      const imageItems = await processIndividualImage(
        imageBuffers[i],
        i, // Image index for tracking
        previousItemsContext,
        language // Pass language parameter
      );

      // Add new items to the overall list
      allItems.push(...imageItems);

      // Update context for the next image with names of items we've already found
      imageItems.forEach((item: { name: string; details?: string }) => {
        previousItemsContext.push(`${item.name} - ${item.details || ""}`);
      });
    }

    // Calculate total estimated value
    const totalValue = allItems.reduce(
      (sum: number, item: { value?: number }) => sum + (item.value || 0),
      0
    );

    // Add default values for items
    const itemsWithDefaults = allItems.map((item) => ({
      ...item,
      value: item.value || 0,
      confidence: item.confidence || 0.8,
    }));

    // Perform enhanced duplicate detection using the new metadata fields
    const deduplicatedItems = deduplicateEnhancedItems(itemsWithDefaults);

    return {
      description: "Multi-image analysis completed successfully",
      estimatedValue: totalValue,
      confidence: 0.8,
      factors: ["quality", "uniqueness", "market demand"],
      items: deduplicatedItems,
    };
  } catch (error: any) {
    console.error("Batch processing error:", error);

    if (process.env.USE_FALLBACK_VALUES === "true") {
      console.log(
        "Using fallback values due to OpenAI API failure (multi-image)"
      );
      return fallbackImageAnalysis();
    }

    throw new AppError(
      "Failed to analyze images with OpenAI (multi-image)",
      500
    );
  }
}

/**
 * Process a single batch of images
 * @param imageBuffers - Array of image buffers to analyze in this batch
 * @param previousItemsContext - Context of previously identified items to avoid duplicates
 * @returns Array of identified items from this batch
 */
/**
 * Process a single image with enhanced metadata
 * @param imageBuffer - Buffer containing the image data
 * @param imageIndex - Index of the image in the original array
 * @param previousItemsContext - Context of previously identified items to avoid duplicates
 * @returns Array of identified items with enhanced metadata
 */
async function processIndividualImage(
  imageBuffer: Buffer,
  imageIndex: number,
  previousItemsContext: string[] = [],
  language: string = 'en'
): Promise<any[]> {
  let retries = 0;

  // Generate a unique image identifier
  const imageId = `image_${imageIndex + 1}`;

  while (retries <= MAX_RETRIES) {
    try {
      if (retries > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * retries)
        );
        console.log(
          `Retry attempt ${retries} for OpenAI image analysis (${imageId})`
        );
      }

      // Construct the context from previous items if available
      let contextText = "";
      if (previousItemsContext.length > 0) {
        contextText = `\n\nPREVIOUSLY IDENTIFIED ITEMS (DO NOT REPEAT THESE):\n${previousItemsContext
          .map((desc, i) => `${i + 1}. ${desc}`)
          .join("\n")}\n\n`;
      }

      const messages: any[] = [
        {
          role: "system",
          content: IMAGE_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and identify all items visible. Skip items that are cut off at image borders (less than 50% visible). For each item, include its position in the image (top-left, center, bottom-right, etc.), nearby items, background description, and dominant color. For vehicles or equipment, include all visible details, specifications, and condition information. ${language !== 'en' ? `Respond in ${language} language.` : ''} ${contextText}.
              Do not remove similar items from different images - analyze position, background, and color to distinguish them.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
              },
            },
          ],
        },
      ];

      // Call the OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: messages as any,
        max_tokens: 8192,
        response_format: { type: "json_object" },
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        if (retries < MAX_RETRIES) {
          retries++;
          continue;
        }
        throw new AppError(`Empty response from OpenAI for ${imageId}`, 500);
      }

      try {
        const parsedValuation = JSON.parse(analysis);
        const items = Array.isArray(parsedValuation.items)
          ? parsedValuation.items
          : [];

        // Add image metadata to each item
        const enhancedItems = items.map((item: any) => ({
          ...item,
          imageId,
          imageIndex,
          position: item.position || "unknown",
          nearestItems: item.nearestItems || [],
          background: item.background || "unknown",
          color: item.color || "unknown",
        }));

        console.log(`Image ${imageId} returned ${enhancedItems.length} items`);
        return enhancedItems;
      } catch (parseError) {
        console.error(
          `Parse Error (${imageId}):`,
          parseError,
          "Response:",
          analysis
        );
        if (retries < MAX_RETRIES) {
          retries++;
          continue;
        }
        throw new AppError(
          `Failed to parse OpenAI response for ${imageId}`,
          500
        );
      }
    } catch (error: any) {
      console.error(`OpenAI Error (${imageId}):`, error);

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
          `Using fallback empty array due to OpenAI API failure for ${imageId}`
        );
        return [];
      }

      throw new AppError(
        `Failed to analyze image with OpenAI (${imageId})`,
        500
      );
    }
  }

  // This ensures all code paths return a value
  return [];
}

/**
 * Enhanced deduplication that uses position, color, and other metadata
 * @param items - Array of items with enhanced metadata
 * @returns Deduplicated array of items
 */
export function deduplicateEnhancedItems(items: any[]): any[] {
  if (!items || items.length === 0) return [];

  // Group similar items using a similarity score approach
  const itemGroups: any[][] = [];

  // First pass: Group items by similarity
  items.forEach((item) => {
    // Check if this item belongs to an existing group
    let foundGroup = false;

    for (const group of itemGroups) {
      const representative = group[0];

      // Check for similarity using enhanced metadata
      if (isEnhancedSimilarItem(item, representative)) {
        group.push(item);
        foundGroup = true;
        break;
      }
    }

    // If no matching group found, create a new one
    if (!foundGroup) {
      itemGroups.push([item]);
    }
  });

  // Second pass: Merge items in each group
  return itemGroups.map((group) => {
    if (group.length === 1) {
      return group[0]; // No merging needed
    }

    // Merge items in this group
    const mergedItem = { ...group[0] };

    // Combine information from all items in the group
    for (let i = 1; i < group.length; i++) {
      const item = group[i];

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

      // Store all image IDs this item appears in
      if (!mergedItem.appearsIn) {
        mergedItem.appearsIn = [mergedItem.imageId];
      }
      if (!mergedItem.appearsIn.includes(item.imageId)) {
        mergedItem.appearsIn.push(item.imageId);
      }
    }

    return mergedItem;
  });
}

/**
 * Enhanced similarity check using position, color, and other metadata
 * @param item1 - First item to compare
 * @param item2 - Second item to compare
 * @returns True if items are similar
 */
export function isEnhancedSimilarItem(item1: any, item2: any): boolean {
  // If items are from the same image and have different positions, they're different items
  if (item1.imageId === item2.imageId) {
    return false; // Items in the same image are never duplicates
  }

  // Direct name match
  const name1 = (item1.name || "").toLowerCase();
  const name2 = (item2.name || "").toLowerCase();

  if (name1 === name2) return true;

  // Check for substring match (one item name contains the other)
  if (name1.includes(name2) || name2.includes(name1)) {
    // If names are similar, check other attributes
    let similarityScore = 0;

    // Check color similarity
    if (
      item1.color &&
      item2.color &&
      item1.color.toLowerCase() === item2.color.toLowerCase()
    ) {
      similarityScore += 0.3;
    }

    // Check details for significant overlap
    const details1 = (item1.details || "").toLowerCase();
    const details2 = (item2.details || "").toLowerCase();

    if (details1 && details2) {
      if (details1.includes(details2) || details2.includes(details1)) {
        similarityScore += 0.3;
      } else {
        // Check for word overlap
        const words1 = details1.split(" ").filter((w: string) => w.length > 3);
        const words2 = details2.split(" ").filter((w: string) => w.length > 3);

        if (words1.length > 0 && words2.length > 0) {
          const commonWords = words1.filter((w: string) => words2.includes(w));
          const overlapRatio =
            commonWords.length / Math.min(words1.length, words2.length);

          if (overlapRatio > 0.3) {
            similarityScore += 0.2 + overlapRatio * 0.3; // Up to 0.5 total
          }
        }
      }
    }

    // If we have enough similarity, consider them the same item
    return similarityScore >= 0.5;
  }

  return false;
}
