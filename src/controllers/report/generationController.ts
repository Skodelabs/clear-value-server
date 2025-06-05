import { Response } from "express";
import { AuthRequest } from "../../types/AuthRequest";
import { getMarketResearch } from "../../services/marketResearchService";
import { generatePDFReport } from "../../utils/enhancedPdfGenerator";
import Report from "../../models/Report";
import path from "path";
import fs from "fs";
import { getMarketValueWithCondition } from "./marketValueController";

/**
 * Interface for report generation request
 */
export interface ReportRequest {
  // Items array - the main products to be included in the report
  items: {
    id?: string;
    name: string;
    condition: string;
    details: string;
    imageUrl?: string;
  }[];
  
  // Report configuration options
  reportType: 'full' | 'standard' | 'asset-listing';
  language?: string;
  currency: 'USD' | 'CAD';
  wearTearAnalysis: boolean;
  
  // Company and appraiser information (required for full reports)
  assetOwner?: string;
  appraiserName?: string;
  companyName?: string;
  industry?: string;
  companyContacts?: string;
  companyWebsite?: string;
  headOfficeAddress?: string;
}



/**
 * Generates a market report based on product details and saves it to the database
 */
export const generateMarketReport = async (req: AuthRequest, res: Response) => {
  try {
    const reportRequest: ReportRequest = req.body;
    console.log('Report request received:', JSON.stringify(reportRequest, null, 2));
    
    // Validate request
    if (!reportRequest.items || !Array.isArray(reportRequest.items) || reportRequest.items.length === 0) {
      return res.status(400).json({ 
        error: "Missing required fields: items array with at least one item is required" 
      });
    }
    
    // Set options based on report type
    const options = {
      reportType: reportRequest.reportType,
      currency: reportRequest.currency,
      language: reportRequest.language || 'en',
      includeMarketComparison: true,
      includeConditionDetails: true,
      includePriceHistory: reportRequest.reportType === 'full',
      includeTearWear: reportRequest.wearTearAnalysis,
      
      // Company and appraiser information
      assetOwner: reportRequest.assetOwner || '',
      appraiserName: reportRequest.appraiserName || '',
      companyName: reportRequest.companyName || 'ClearValue Appraisals',
      industry: reportRequest.industry || '',
      companyContacts: reportRequest.companyContacts || '',
      companyWebsite: reportRequest.companyWebsite || '',
      headOfficeAddress: reportRequest.headOfficeAddress || '',
    };
    
    // Process each item to get market research
    const processedItems = await Promise.all(reportRequest.items.map(async (item) => {
      // Get market research for each item with language and currency support
      const marketResearch = await getMarketResearch(
        item.name,
        options.language || 'en',
        options.currency || 'USD'
      );
      
      // If market research doesn't provide a value, use OpenAI as fallback
      let marketValue = marketResearch.averagePrice;
      let confidence = 0.8; // Default confidence
      
      if (!marketValue || marketValue <= 0) {
        const aiEstimate = await getMarketValueWithCondition(
          item.name,
          item.condition,
          true, // considerCondition
          options.currency || 'USD',
          options.language || 'en',
          options.includeTearWear || false,
          item.details // details for wear and tear assessment
        );
        marketValue = aiEstimate.value;
        confidence = aiEstimate.confidence;
      }
      
      return {
        ...item,
        marketResearch,
        value: marketValue,
        confidence
      };
    }));
    
    // Sort items by value (highest first)
    processedItems.sort((a, b) => (b.value || 0) - (a.value || 0));
    
    // Generate PDF report
    const mainProduct = processedItems[0];
    const additionalProducts = processedItems.slice(1);
    
    // Generate the PDF - the function will create its own filename and path
    const pdfResult = await generatePDFReport({
      type: "custom",
      customData: {
        mainProduct,
        additionalProducts
      },
      options
    });
    
    // Get the generated report path and name from the result
    const reportPath = pdfResult.filePath;
    const reportName = pdfResult.fileName;
    
    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to generate reports'
      });
    }
    
    // Save report to database with userId
    const report = new Report({
      name: reportName,
      path: reportPath,
      userId: req.userId, // Associate report with authenticated user
      type: options.reportType,
      language: options.language,
      mainProduct: {
        name: mainProduct.name,
        condition: mainProduct.condition,
        details: mainProduct.details,
        value: mainProduct.value,
        imageUrl: mainProduct.imageUrl
      },
      additionalProducts: additionalProducts.map(product => ({
        name: product.name,
        condition: product.condition,
        details: product.details,
        value: product.value,
        imageUrl: product.imageUrl
      })),
      companyInfo: {
        name: options.companyName,
        industry: options.industry,
        contacts: options.companyContacts,
        website: options.companyWebsite,
        address: options.headOfficeAddress
      },
      appraiserName: options.appraiserName,
      assetOwner: options.assetOwner,
      downloadCount: 0
    });
    
    await report.save();
    
    return res.json({
      success: true,
      reportId: report._id,
      downloadUrl: `/reports/${report._id}/download`,
      message: 'Report generated successfully'
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to generate report' 
    });
  }
};
