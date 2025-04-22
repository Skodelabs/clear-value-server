import { Request, Response } from "express";
import { processImage } from "../services/imageService";
import { generatePDFReport } from "../utils/pdfGenerator";
import { getMarketResearch } from "../services/marketResearchService";
import { processVideo } from "../services/videoService";

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

export const processMedia = async (req: Request, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const imageFiles = files.filter((file: any) => file.mimetype && file.mimetype.startsWith('image/'));
    const videoFiles = files.filter((file: any) => file.mimetype && file.mimetype.startsWith('video/'));
    const results = [];

    // Process videos (only one video supported per request)
    let hasVideo = false;
    for (const file of videoFiles) {
      hasVideo = true;
      // Only process if file.path is a string
      if (typeof file.path === 'string') {
        const result = await processVideo(file.path);
        results.push({
          type: 'video',
          filename: file.originalname,
          ...result,
        });
      }
    }

    // Process images (multiple allowed)
    for (const file of imageFiles) {
      if (typeof file.path === 'string') {
        const result = await processImage(file.path);
        results.push({
          type: 'image',
          filename: file.originalname,
          ...result,
        });
      }
    }

    // Generate reports
    if (hasVideo) {
      // For videos, generate a single comprehensive report
      const videoResults = results.filter((r) => r.type === 'video');
      const marketResearch = await getMarketResearch();
      const reportPath = await generatePDFReport({
        type: 'video',
        results: videoResults,
        marketResearch,
      });
      return res.json({
        status: 'success',
        type: 'video',
        totalFiles: files.length,
        processedFiles: results.length,
        reportPath,
        results: videoResults,
      });
    } else {
      // For images, generate a single comprehensive report for all images
      const marketResearch = await getMarketResearch();
      const reportPath = await generatePDFReport({
        type: 'image',
        results, // All image results
        marketResearch,
      });
      return res.json({
        status: 'success',
        type: 'image',
        totalFiles: files.length,
        processedFiles: results.length,
        reportPath,
        results,
      });
    }
  } catch (error) {
    console.error("Error processing media:", error);
    return res.status(500).json({ error: "Failed to process media" });
  }
};
