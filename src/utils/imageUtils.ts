import path from "path";

/**
 * Converts local file paths to public URLs
 * @param imagePath The local file path
 * @param originalFilename Optional original filename to use instead of extracting from path
 * @returns Public URL for the image
 */
export const convertToPublicImageUrl = (imagePath: string | undefined, originalFilename?: string): string | undefined => {
  if (!imagePath) return undefined;
  
  // Check if it's already a URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  try {
    // Use the original filename if provided, otherwise extract from path
    const filename = originalFilename || path.basename(imagePath);
    
    // Create public URL - this is the path that worked before
    const baseUrl = process.env.BASE_URL || 'http://192.168.8.186:3000';
    return `${baseUrl}/uploads/${filename}`;
  } catch (error) {
    console.error('Error converting image path to URL:', error);
    return undefined;
  }
};

/**
 * Extracts the image index from an imageId string (format: image_X)
 * @param imageId The imageId string
 * @returns The extracted index (0-based)
 */
export const extractImageIndex = (imageId?: string): number => {
  if (!imageId) return 0;
  
  const match = imageId.match(/image_([0-9]+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10) - 1; // Convert to 0-based index
  }
  return 0;
};
