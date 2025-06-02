import { extractFrames } from "../utils/videoProcessor";
import { analyzeProductFromImage } from "./productAnalysisService";
import path from "path";
import fs from "fs";
// Import Jimp properly to work with TypeScript
import { Jimp, intToRGBA } from "jimp";

const calculateImageHash = async (imagePath: string): Promise<string> => {
  // Read the image with Jimp
  const image = await Jimp.read(imagePath);

  // Resize to 8x8 for perceptual hash
  image.resize({ w: 8, h: 8 });

  // Convert to grayscale
  image.greyscale();

  // Extract pixel data
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const pixels: number[] = [];

  // Get grayscale values for each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelColor = intToRGBA(image.getPixelColor(x, y));
      // For grayscale, r, g, and b values are the same
      pixels.push(pixelColor.r);
    }
  }

  // Calculate average pixel value
  const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;

  // Generate hash string (1 for pixels above average, 0 for below)
  return pixels.map((pixel) => (pixel > avg ? "1" : "0")).join("");
};

// Import the options interface from productAnalysisService
import { ProductAnalysisOptions } from "./productAnalysisService";

// Define video processing options interface extending the product analysis options
export interface VideoProcessingOptions extends ProductAnalysisOptions {
  frameInterval?: number; // Optional frame interval in seconds
}

export const processVideo = async (
  filePath: string,
  options?: VideoProcessingOptions
) => {
  try {
    const frames = await extractFrames(filePath);
    const uniqueFrames = [];
    const seenHashes = new Set<string>();

    // Filter out duplicate frames
    for (const frame of frames) {
      const hash = await calculateImageHash(frame);
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        uniqueFrames.push(frame);
      } else {
        // Delete duplicate frame
        fs.unlinkSync(frame);
      }
    }

    const results = [];
    const MAX_CONCURRENT_PROCESSING = 3;

    for (let i = 0; i < uniqueFrames.length; i += MAX_CONCURRENT_PROCESSING) {
      const batch = uniqueFrames.slice(i, i + MAX_CONCURRENT_PROCESSING);
      const batchResults = await Promise.all(
        batch.map(async (framePath) => {
          try {
            const result = await analyzeProductFromImage(framePath, options);
            return {
              frame: path.basename(framePath),
              productAnalysis: result,
              processedImagePath: result.processedImagePath || "",
            };
          } catch (error) {
            console.error(`Error processing frame ${framePath}:`, error);
            return null;
          }
        })
      );
      results.push(...batchResults.filter(Boolean));
    }

    // Clean up remaining frames
    for (const frame of uniqueFrames) {
      fs.unlinkSync(frame);
    }

    return {
      totalFrames: frames.length,
      uniqueFrames: uniqueFrames.length,
      processedFrames: results.length,
      results,
    };
  } catch (error) {
    console.error("Error processing video:", error);
    throw error;
  }
};
