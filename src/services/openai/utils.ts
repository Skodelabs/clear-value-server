import { AppError } from "../../middleware/errorHandler";

// Utility: Enhanced deduplicate items function that better handles different angles and backgrounds
export function deduplicateItems(items: any[]): any[] {
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
export function isSimilarItem(item1: any, item2: any): boolean {
  // Direct name match (after normalization)
  if (item1.normalizedName === item2.normalizedName) {
    return true;
  }

  // Check if one name contains the other (for partial matches)
  if (
    item1.normalizedName.includes(item2.normalizedName) ||
    item2.normalizedName.includes(item1.normalizedName)
  ) {
    return true;
  }

  // Check for word overlap in names (if at least 50% of words match)
  const words1 = item1.normalizedName.split(" ").filter((w: string) => w.length > 2);
  const words2 = item2.normalizedName.split(" ").filter((w: string) => w.length > 2);
  
  if (words1.length > 0 && words2.length > 0) {
    let matchCount = 0;
    for (const word of words1) {
      if (words2.includes(word)) {
        matchCount++;
      }
    }
    
    const matchRatio1 = matchCount / words1.length;
    const matchRatio2 = matchCount / words2.length;
    
    if (matchRatio1 > 0.5 || matchRatio2 > 0.5) {
      return true;
    }
  }

  // Check for similarity in details text
  if (
    item1.detailsText &&
    item2.detailsText &&
    (item1.detailsText.includes(item2.detailsText) ||
      item2.detailsText.includes(item1.detailsText))
  ) {
    return true;
  }

  return false;
}

// Helper function for fallback image analysis
export function fallbackImageAnalysis(): any {
  return {
    description: "Fallback analysis - OpenAI service unavailable",
    estimatedValue: 0,
    confidence: 0.5,
    factors: ["Fallback analysis"],
    items: [],
  };
}

// OpenAI API configuration
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // milliseconds
