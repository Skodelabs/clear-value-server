import { Request, Response } from "express";
import Report, { IReport } from "../../models/Report";
import mongoose from "mongoose";
import { calculateTotalValue } from "./utilsController";

/**
 * Get all reports with pagination and filtering options
 */
export const getReports = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter query
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

    // Get total count for pagination
    const totalCount = await Report.countDocuments(filterQuery);

    // Get reports with pagination
    const reports = await Report.find(filterQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
    console.error("Error fetching reports:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch reports",
    });
  }
};

/**
 * Get a specific report by ID with detailed information
 */
export const getReportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid report ID format",
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    // Format the response to include all necessary details
    const reportDetails = {
      id: report._id,
      name: report.name,
      type: report.type,
      createdAt: report.createdAt,
      downloadUrl: `/reports/${report._id}/download`,
      totalValue: calculateTotalValue(report),
    };

    return res.json({
      success: true,
      data: reportDetails,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch report",
    });
  }
};
