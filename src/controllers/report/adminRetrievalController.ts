import { Response } from "express";
import { AuthRequest } from "../../types/AuthRequest";
import Report from "../../models/Report";
import { calculateTotalValue } from "./utilsController";

/**
 * Get all reports across all users with pagination and filtering options
 * This controller is intended for admin use only
 */
export const getAllReports = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is authenticated and is an admin
    if (!req.userId || !req.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required to access all reports'
      });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter query (without userId filter)
    const filterQuery: any = {};

    // Apply type filter if provided
    if (req.query.type) {
      filterQuery.type = req.query.type;
    }

    // Apply date range filter if provided
    if (req.query.startDate || req.query.endDate) {
      filterQuery.createdAt = {};

      if (req.query.startDate) {
        filterQuery.createdAt.$gte = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        filterQuery.createdAt.$lte = new Date(req.query.endDate as string);
      }
    }

    // Apply search filter if provided
    if (req.query.search) {
      const searchTerm = req.query.search as string;
      filterQuery.$or = [
        { "reportName": { $regex: searchTerm, $options: "i" } },
        { "items.name": { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Apply user filter if provided (admin-specific feature)
    if (req.query.userId) {
      filterQuery.userId = req.query.userId;
    }

    // Get total count for pagination
    const totalCount = await Report.countDocuments(filterQuery);

    // Get reports with pagination
    const reports = await Report.find(filterQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'fullName email'); // Populate user information

    // Format the response
    const formattedReports = reports.map((report) => ({
      id: report._id,
      name: report.name,
      reportName: report.reportName,
      type: report.type || report.reportType,
      createdAt: report.createdAt,
      downloadUrl: `/reports/${report._id}/download`,
      totalValue: calculateTotalValue(report),
      noOfItems: report.noOfItems || (report.items?.length || 0),
      // Include user information for admin view
      user: report.userId ? {
        id: (report.userId as any)._id,
        fullName: (report.userId as any).fullName,
        email: (report.userId as any).email
      } : null
    }));

    return res.json({
      success: true,
      data: formattedReports,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all reports:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch reports",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
