import sharp from "sharp";
import path from "path";
import fs from "fs";

export const processImage = async (filePath: string): Promise<string> => {
  try {
    const outputPath = path.join(
      path.dirname(filePath),
      `processed_${path.basename(filePath)}`
    );

    // Process image with sharp
    await sharp(filePath)
      .resize(800, 800, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}; 