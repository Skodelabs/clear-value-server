import { analyzeImagesBatch, analyzeImage } from "./openaiService";
import { processImage as processImageFile } from "../utils/imageProcessor";
import fs from "fs";

export const processImage = async (filePath: string) => {
  try {
    const processedImage = await processImageFile(filePath);
    const imageBuffer = fs.readFileSync(processedImage);
    const aiValuation = await analyzeImage(imageBuffer);
    
    return {
      aiValuation,
      processedImagePath: processedImage,
    };
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}; 

// New: Process multiple images as different angles of the same item
// Accepts an array of image file paths, processes all as a batch for the same item
export const processImageBatch = async (filePaths: string[]) => {
  try {
    // Preprocess and buffer all images
    const processedImages = await Promise.all(filePaths.map(processImageFile));
    const imageBuffers = processedImages.map((imgPath) => fs.readFileSync(imgPath));
    const aiValuation = await analyzeImagesBatch(imageBuffers);
    return {
      aiValuation,
      processedImagePaths: processedImages,
    };
  } catch (error) {
    console.error("Error processing image batch:", error);
    throw error;
  }
};