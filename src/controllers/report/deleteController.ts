import { Request, Response } from "express";
import Report from "../../models/Report";
import mongoose from "mongoose";
import fs from "fs";

/**
 * Delete a report by ID
 */
export const deleteReport = async (req: Request, res: Response) => {
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
    
    // Delete the file from the filesystem
    if (fs.existsSync(report.path)) {
      fs.unlinkSync(report.path);
    }
    
    // Delete the report from the database
    await Report.findByIdAndDelete(id);
    
    return res.json({
      success: true,
      message: 'Report deleted successfully',
      dashboardRefresh: true // Flag to tell frontend to refresh the dashboard
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to delete report' 
    });
  }
};
