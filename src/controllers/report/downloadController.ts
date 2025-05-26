import { Request, Response } from "express";
import Report from "../../models/Report";
import mongoose from "mongoose";
import fs from "fs";

/**
 * Download a report by ID
 */
export const downloadReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid report ID format' 
      });
    }
    
    const report = await Report.findById(id);
    
    if (!report) {
      return res.status(404).json({ 
        success: false,
        error: 'Report not found' 
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(report.path)) {
      return res.status(404).json({ 
        success: false,
        error: 'Report file not found on server' 
      });
    }
    
    // Update download count
    report.downloadCount = (report.downloadCount || 0) + 1;
    await report.save();
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${report.name}`);
    
    // Stream the file
    const fileStream = fs.createReadStream(report.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading report:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to download report' 
    });
  }
};
