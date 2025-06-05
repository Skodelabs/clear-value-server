import { Response } from "express";
import { AuthRequest } from "../../types/AuthRequest";
import { getMarketResearch } from "../../services/marketResearchService";
import {
  generatePDFReport,
  ReportData,
  ReportOptions,
  ReportItem,
} from "../../utils/pdfGeneratorIndex";
import Report from "../../models/Report";
import { getMarketValueWithCondition } from "./marketValueController";
import fs from "fs";
import path from "path";
import { convertToPublicImageUrl } from "../../utils/imageUtils";
import { ReportTypeRequest } from "../../types/ReportType";

/**
 * Generates a report based on the specified report type and subtype
 */
/**
 * Generates a simplified report based on the specified report type and subtype
 * with a focus on a clean, single-page table layout
 */
export const generateTypedReport = async (req: AuthRequest, res: Response) => {
  try {
    const reportRequest: ReportTypeRequest = req.body;

    console.log(req.body);
    // Validate request
    if (
      !reportRequest.items ||
      !Array.isArray(reportRequest.items) ||
      reportRequest.items.length === 0
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: items array with at least one item is required",
      });
    }

    if (!reportRequest.reportType) {
      return res.status(400).json({
        error: "Missing required field: reportType must be specified",
      });
    }

    // For basic reports, validate subtype if provided
    if (reportRequest.reportType === "basic" && reportRequest.subType) {
      const validSubTypes = ["asset", "real-estate", "salvage"];
      if (!validSubTypes.includes(reportRequest.subType)) {
        return res.status(400).json({
          error: `Invalid subType: ${
            reportRequest.subType
          }. Must be one of: ${validSubTypes.join(", ")}`,
        });
      }
    }

    // Set options based on report type
    const options: ReportOptions = {
      reportType: reportRequest.reportType,
      subType: reportRequest.subType,
      currency: reportRequest.currency || "USD",
      language: reportRequest.language || "en",
      wearTear: reportRequest.wearTear || false,
    };

    // For full reports, add additional fields for the appraisal report
    if (reportRequest.reportType === "full") {
      // Format current date as YYYY-MM-DD
      const today = new Date();
      const formattedDate = today.toISOString().split("T")[0];

      // Extract companyInfo if it exists
      const companyInfo = reportRequest.companyInfo || {};
      
      // Log the companyInfo to debug
      console.log("Company Info received:", companyInfo);

      // Add all the appraisal report fields, checking both direct properties and companyInfo
      options.reportDate = reportRequest.reportDate || companyInfo.reportDate || formattedDate;
      options.effectiveDate = reportRequest.effectiveDate || companyInfo.effectiveDate || formattedDate;
      options.recipientName = reportRequest.recipientName || companyInfo.recipientName;
      options.clientName = reportRequest.companyName || companyInfo.companyName || "Client";
      options.appraisedEntity =
        reportRequest.appraisedEntity || companyInfo.appraisedEntity || reportRequest.companyName || companyInfo.companyName;
      options.premise =
        reportRequest.premise || companyInfo.premise || "market value in continued use";
      options.appraiserName = reportRequest.appraiserName || companyInfo.appraiserName || "Appraiser";
      options.appraiserCompany =
        reportRequest.appraiserCompany || companyInfo.appraiserCompany || "ClearValue Appraisals";
      options.inspectorName =
        reportRequest.inspectorName || companyInfo.inspectorName || options.appraiserName;
      options.inspectionDate = reportRequest.inspectionDate || companyInfo.inspectionDate || formattedDate;
      options.ownerName = reportRequest.ownerName || companyInfo.ownerName || options.clientName;
      options.industry = reportRequest.industry || companyInfo.industry;
      options.locationsInspected = reportRequest.locationsInspected || companyInfo.locationsInspected;
      options.companyContacts = reportRequest.companyContacts || companyInfo.companyContacts;
      options.companyWebsite = reportRequest.companyWebsite || companyInfo.companyWebsite;
      options.headOfficeAddress = reportRequest.headOfficeAddress || companyInfo.headOfficeAddress;
      options.valuationMethod =
        reportRequest.valuationMethod || companyInfo.valuationMethod || "Market and Cost Approaches";
      options.assetType = reportRequest.assetType || companyInfo.assetType;
      options.assetCondition = reportRequest.assetCondition || companyInfo.assetCondition || "Average";
      options.informationSource =
        reportRequest.informationSource || companyInfo.informationSource || options.clientName;
      options.appraisalPurpose =
        reportRequest.appraisalPurpose || companyInfo.appraisalPurpose || "Financial Consideration";
      
      // Log the options after processing to debug
      console.log("Processed options for full report:", options);
    }

    // Process items - if price is not provided, try to get market value
    const processedItems: ReportItem[] = await Promise.all(
      reportRequest.items.map(async (item, index) => {
        // Convert id to number or use index + 1
        const itemId: number =
          typeof item.id === "number"
            ? item.id
            : typeof item.id === "string" && !isNaN(Number(item.id))
            ? Number(item.id)
            : index + 1;

        // Use item.name as description if description is not provided
        // For the sample data format, use item.details as the description
        const description = item.details || item.description || item.name;

        // If price is already provided, use it
        if (typeof item.price === "number" && item.price > 0) {
          return {
            id: itemId,
            name: item.name,
            description: description,
            condition: item.condition,
            price: item.price,
            imageUrl: convertToPublicImageUrl(item.imageUrl),
          };
        }

        // Otherwise, try to get market value
        try {
          // First try market research service with language and currency support
          const marketResearch = await getMarketResearch(
            item.name,
            reportRequest.language || "en",
            reportRequest.currency || "USD"
          );

          if (marketResearch.averagePrice && marketResearch.averagePrice > 0) {
            return {
              id: itemId,
              name: item.name,
              description: description,
              condition: item.condition,
              price: marketResearch.averagePrice,
              imageUrl: convertToPublicImageUrl(item.imageUrl),
            };
          }

          // If market research doesn't provide a value, use AI as fallback
          const aiEstimate = await getMarketValueWithCondition(
            item.name,
            item.condition,
            true, // considerCondition
            reportRequest.currency || "USD", // currency
            reportRequest.language || "en", // language
            reportRequest.wearTear || false, // wearTear
            item.details || item.description // details for wear and tear assessment
          );

          // Include repair cost if wear and tear assessment was requested
          return {
            id: itemId,
            name: item.name,
            description: description,
            condition: item.condition,
            price: aiEstimate.value,
            imageUrl: convertToPublicImageUrl(item.imageUrl),
            repairCost: aiEstimate.repairCost,
          };
        } catch (error) {
          console.error(
            `Error getting market value for item ${item.name}:`,
            error
          );
          // Return item with price of 0 if we couldn't get a value
          return {
            id: itemId,
            name: item.name,
            description: description,
            condition: item.condition,
            price: 0,
            imageUrl: convertToPublicImageUrl(item.imageUrl),
          };
        }
      })
    );

    // Prepare data for PDF generation
    const reportData: ReportData = {
      items: processedItems,
      options: options,
    };

    // Generate the PDF report
    let pdfResult;

    // For full reports, we use the new EJS template and puppeteer
    // For basic reports, we continue to use the existing PDF generation
    pdfResult = await generatePDFReport(reportData);

    // Get the generated report path and name from the result
    const reportPath = pdfResult.filePath;
    const reportName = pdfResult.fileName;

    // Calculate total value and number of items based on AI market valuation
    const totalValue = processedItems.reduce((sum, item) => {
      return (
        sum +
        (typeof item.price === "number" && !isNaN(item.price) ? item.price : 0)
      );
    }, 0);

    // For full reports, set the totalValue in the options and populate appraisal-specific fields
    if (reportRequest.reportType === "full") {
      // Format the total value as a currency string using AI market valuation
      const formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: reportRequest.currency || "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      options.totalValue = formatter.format(totalValue);

      // Set default values for appraisal report fields if not provided
      options.reportDate =
        options.reportDate ||
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      options.effectiveDate = options.effectiveDate || options.reportDate;
      options.recipientName = options.recipientName || "Valued Client";
      options.clientName = options.clientName || "Clear Value";
      options.ownerName = options.ownerName || "Asset Owner";
      options.premise = options.premise || "Fair Market Value";
      options.appraiserName = options.appraiserName || "Clear Value Appraiser";
      options.clientName = options.clientName || "Clear Value";
      options.industry = options.industry || "General";
      options.locationsInspected =
        options.locationsInspected || "Item Location";
      options.valuationMethod = options.valuationMethod || "Market Comparison";
      options.assetType = options.assetType || "Personal Property";
      options.assetCondition =
        options.assetCondition || "Various - See Schedule A";
      options.valueEstimate = options.valueEstimate || "Fair Market Value";

      // Set the logo URL for the report
      options.logoUrl =
        options.logoUrl ||
        `${process.env.BASE_URL || "http://localhost:3000"}/logo.png`;

      // Use the appraisal-report.ejs template
      options.templateName = "appraisal-report.ejs";

      // Set valueEstimate based on AI market valuation
      options.valueEstimate = `${options.premise || "Fair Market Value"} of ${
        options.totalValue
      }`;
    }

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required to generate reports",
      });
    }

    // Save report to database with simplified structure and userId
    const report = new Report({
      // File information
      name: reportName,
      path: reportPath,

      // User information
      userId: req.userId, // Associate report with authenticated user

      // Report metadata
      reportName:
        reportRequest.reportName ||
        `Asset Valuation - ${new Date().toLocaleDateString()}`,
      reportType: options.reportType,
      subType: options.subType,
      type: options.reportType, // For backward compatibility
      language: reportRequest.language || "en",
      currency: reportRequest.currency || "USD",

      // Report summary data
      noOfItems: processedItems.length,
      totalValue: totalValue,

      // Items in the report
      items: processedItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        condition: item.condition,
        price: item.price,
        imageUrl: item.imageUrl,
      })),

      // Company information
      companyInfo: {
        name: reportRequest.companyName || "ClearValue Appraisals",
      },
    });

    await report.save();

    return res.json({
      success: true,
      reportId: report._id,
      downloadUrl: `/reports/${report._id}/download`,
      message: "Report generated successfully",
      dashboardRefresh: true, // Flag to tell frontend to refresh the dashboard
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate report",
    });
  }
};
