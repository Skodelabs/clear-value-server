import { configDotenv } from "dotenv";
import path from "path";
configDotenv();
// Helper function to convert local file paths to public URLs
export const convertToPublicImageUrl = (
  imagePath: string | undefined
): string | undefined => {
  if (!imagePath) return undefined;

  // Check if it's already a URL
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    // If it's already a URL but doesn't have /image/ in the path, check if it's a local URL
    if (
      !imagePath.includes("/image/") &&
      (imagePath.includes("localhost") ||
        imagePath.includes("127.0.0.1") ||
        imagePath.includes("192.168."))
    ) {
      // Extract the filename from the URL
      const urlParts = imagePath.split("/");
      const filename = urlParts[urlParts.length - 1];

      // Create proper public URL
      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      return `${baseUrl}/image/${filename}`;
    }
    return imagePath;
  }

  try {
    // Extract filename from path
    const filename = path.basename(imagePath);

    // Create public URL
    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    return `${baseUrl}/image/${filename}`;
  } catch (error) {
    console.error("Error converting image path to URL:", error);
    return undefined;
  }
};
