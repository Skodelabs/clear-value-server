import { ReportData, ReportOptions, ReportItem } from "./pdfGeneratorCommon";
import { generateBasicReport } from "./pdfGeneratorBasic";
import { generateAssetReport } from "./pdfGeneratorAsset";
import { generateRealEstateReport } from "./pdfGeneratorRealEstate";
import { generateSalvageReport } from "./pdfGeneratorSalvage";
import { generateMainReport } from "./pdfGeneratorMainTailwind";

/**
 * Main function to generate PDF reports based on report type and subtype
 * @param data Report data including items and options
 * @returns Promise with file path and file name
 */
export const generatePDFReport = async (data: ReportData): Promise<{ filePath: string, fileName: string }> => {
  try {
    // Validate the data
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error("Report data must include an array of items");
    }
    
    if (!data.options || !data.options.reportType) {
      throw new Error("Report options must include a reportType");
    }
    
    // Generate the appropriate report based on type and subtype
    if (data.options.reportType === 'full') {
      return generateMainReport(data);
    } else if (data.options.reportType === 'basic') {
      // For basic reports, check the subtype
      if (data.options.subType) {
        switch (data.options.subType) {
          case 'asset':
            return generateAssetReport(data);
          case 'real-estate':
            return generateRealEstateReport(data);
          case 'salvage':
            return generateSalvageReport(data);
          default:
            // Default to basic report if subtype is not recognized
            return generateBasicReport(data);
        }
      } else {
        // If no subtype is specified, use the generic basic report
        return generateBasicReport(data);
      }
    } else {
      throw new Error(`Unsupported report type: ${data.options.reportType}`);
    }
  } catch (error) {
    console.error("Error generating PDF report:", error);
    throw error;
  }
};

// Re-export types and interfaces for use in controllers
export { ReportData, ReportOptions, ReportItem } from "./pdfGeneratorCommon";

// Export individual report generators for direct use if needed
export {
  generateBasicReport,
  generateAssetReport,
  generateRealEstateReport,
  generateSalvageReport,
  generateMainReport
};
