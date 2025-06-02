import path from "path";
import fs from "fs";
// Import Jimp properly to work with TypeScript
import { Jimp } from "jimp";

export const processImage = async (filePath: string): Promise<string> => {
  try {
    // Remove any existing extension from the filename
    const fileNameWithoutExt = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(
      path.dirname(filePath),
      `processed_${fileNameWithoutExt}`
    );

    // Process image with Jimp
    const image = await Jimp.read(filePath);

    // Resize image while maintaining aspect ratio
    // Only resize if image is larger than 800x800
    if (image.bitmap.width > 800 || image.bitmap.height > 800) {
      image.resize({ w: 800 });
    }

    // Save the processed image
    await image.write(`${outputPath}.jpg`);
    return `${outputPath}.jpg`;
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
};
