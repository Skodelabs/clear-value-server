import path from "path";
import fs from "fs";

// Define the reports directory
export const REPORTS_DIR = path.join(process.cwd(), "uploads", "reports");

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Common interfaces for report generation
export interface ReportItem {
  id: number;
  name: string;
  description: string;
  condition: string;
  price: number;
  imageUrl?: string;
  repairCost?: number;
}

export interface ReportOptions {
  reportType: 'full' | 'basic';
  subType?: 'asset' | 'real-estate' | 'salvage' | 'appraisal';
  currency?: 'USD' | 'CAD';
  language?: string;
  wearTear?: boolean;
  templateName?: string;
  title?: string;
  introText?: string;
  
  // Image URLs
  coverImageUrl?: string;
  companyLogoUrl?: string;
  
  // Additional options for appraisal reports
  reportDate?: string;
  effectiveDate?: string;
  recipientName?: string;
  clientName?: string;
  appraisedEntity?: string;
  premise?: string;
  appraiserName?: string;
  appraiserCompany?: string;
  totalValue?: string | number;
  inspectorName?: string;
  inspectionDate?: string;
  ownerName?: string;
  industry?: string;
  locationsInspected?: string;
  companyContacts?: string;
  companyWebsite?: string;
  companyEmail?: string;
  headOfficeAddress?: string;
  companyAddress?: string;
  
  // Appendix content
  additionalPhotos?: Array<{
    url: string;
    description?: string;
    itemId?: string | number;
  }>;
  supportingDocuments?: Array<{
    title: string;
    description?: string;
  }>;
  
  // Report content and styling
  marketAnalysis?: string;
  marketTrend?: string;
  marketPeriod?: string;
  valuationMethod?: string;
  assetType?: string;
  assetCondition?: string;
  valueEstimate?: string;
  informationSource?: string;
  appraisalPurpose?: string;
  
  // Images and branding
  logoUrl?: string;
  propertyImageUrl?: string;
  signatureImageUrl?: string;
  certificationSignatureUrl?: string;
  watermarkUrl?: string;
  watermarkLogoUrl?: string;
  
  // Additional text content
  transmittalLetterText?: string;
  certificationText?: string;
  legalDisclaimer?: string;
}

export interface ReportData {
  items: ReportItem[];
  options: ReportOptions;
}

// Helper function to save PDF and return file info
export const savePdf = (filePath: string, fileName: string): Promise<{ filePath: string, fileName: string }> => {
  const outputPath = path.join(REPORTS_DIR, fileName);
  const writeStream = fs.createWriteStream(outputPath);
  
  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => resolve({ filePath: outputPath, fileName: fileName }));
    writeStream.on("error", (err) => {
      console.error("Error generating PDF:", err);
      reject(err);
    });
  });
};
