import { Request, Response } from "express";
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

// Helper function to convert local file paths to public URLs
const convertToPublicImageUrl = (
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

/**
 * Interface for the new report generation request with support for different report types
 */
export interface ReportTypeRequest {
  // Items array - the products to be included in the report
  items: {
    id?: string | number;
    name: string;
    description?: string;
    details?: string;
    condition: string;
    price?: number;
    imageUrl?: string;
  }[];

  // Report configuration options
  reportType: "full" | "basic";
  subType?: "asset" | "real-estate" | "salvage";
  currency: "USD" | "CAD";
  reportName?: string; // User-friendly report name

  // Additional options
  language?: string;
  wearTear?: boolean;
  companyName?: string;

  // Additional fields for main report (appraisal report)
  reportDate?: string;
  effectiveDate?: string;
  recipientName?: string;
  appraisedEntity?: string;
  premise?: string;
  appraiserName?: string;
  appraiserCompany?: string;
  totalValue?: string;
  inspectorName?: string;
  inspectionDate?: string;
  ownerName?: string;
  industry?: string;
  locationsInspected?: string;
  companyContacts?: string;
  companyWebsite?: string;
  headOfficeAddress?: string;
  valuationMethod?: string;
  assetType?: string;
  assetCondition?: string;
  valueEstimate?: string;
  informationSource?: string;
  appraisalPurpose?: string;
}

/**
 * Generates a report based on the specified report type and subtype
 */
/**
 * Generates a simplified report based on the specified report type and subtype
 * with a focus on a clean, single-page table layout
 */
export const generateTypedReport = async (req: Request, res: Response) => {
  try {
    const reportRequest: ReportTypeRequest = req.body;
    console.log(
      "Report request received:",
      JSON.stringify(reportRequest, null, 2)
    );

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

    // For main reports, add additional fields for the appraisal report
    if (reportRequest.reportType === "full") {
      // Format current date as YYYY-MM-DD
      const today = new Date();
      const formattedDate = today.toISOString().split("T")[0];

      // Add all the appraisal report fields
      options.reportDate = reportRequest.reportDate || formattedDate;
      options.effectiveDate = reportRequest.effectiveDate || formattedDate;
      options.recipientName = reportRequest.recipientName;
      options.clientName = reportRequest.companyName || "Client";
      options.appraisedEntity =
        reportRequest.appraisedEntity || reportRequest.companyName;
      options.premise =
        reportRequest.premise || "market value in continued use";
      options.appraiserName = reportRequest.appraiserName || "Appraiser";
      options.appraiserCompany =
        reportRequest.appraiserCompany || "ClearValue Appraisals";
      options.inspectorName =
        reportRequest.inspectorName || reportRequest.appraiserName;
      options.inspectionDate = reportRequest.inspectionDate || formattedDate;
      options.ownerName = reportRequest.ownerName || reportRequest.companyName;
      options.industry = reportRequest.industry;
      options.locationsInspected = reportRequest.locationsInspected;
      options.companyContacts = reportRequest.companyContacts;
      options.companyWebsite = reportRequest.companyWebsite;
      options.headOfficeAddress = reportRequest.headOfficeAddress;
      options.valuationMethod =
        reportRequest.valuationMethod || "Market and Cost Approaches";
      options.assetType = reportRequest.assetType;
      options.assetCondition = reportRequest.assetCondition || "Average";
      options.informationSource =
        reportRequest.informationSource || reportRequest.companyName;
      options.appraisalPurpose =
        reportRequest.appraisalPurpose || "Financial Consideration";
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
          // First try market research service with language support
          const marketResearch = await getMarketResearch(item.name, reportRequest.language || 'en');

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

    // For main reports, we use the new EJS template and puppeteer
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

    // For main reports, set the totalValue in the options and populate appraisal-specific fields
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
        `${process.env.BASE_URL || "http://localhost:5000"}/logo.png`;

      // Use the appraisal-report.ejs template
      options.templateName = "appraisal-report.ejs";

      // Set valueEstimate based on AI market valuation
      options.valueEstimate = `${options.premise || "Fair Market Value"} of ${options.totalValue}`;
    }

    // Save report to database with simplified structure
    const report = new Report({
      // File information
      name: reportName,
      path: reportPath,

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
