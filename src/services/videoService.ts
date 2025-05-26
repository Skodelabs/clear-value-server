import { extractFrames } from "../utils/videoProcessor";
import { analyzeProductFromImage } from "./productAnalysisService";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const calculateImageHash = async (imagePath: string): Promise<string> => {
  const image = sharp(imagePath);
  const { data } = await image
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  return Array.from(pixels)
    .map((pixel) => (pixel > avg ? "1" : "0"))
    .join("");
};

// Import the options interface from productAnalysisService
import { ProductAnalysisOptions } from "./productAnalysisService";

// Define video processing options interface extending the product analysis options
export interface VideoProcessingOptions extends ProductAnalysisOptions {
  frameInterval?: number; // Optional frame interval in seconds
}

export const processVideo = async (filePath: string, options?: VideoProcessingOptions) => {
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
              processedImagePath: result.processedImagePath || ''
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
