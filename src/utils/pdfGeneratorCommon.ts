import PDFDocument from "pdfkit";
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
  headOfficeAddress?: string;
  valuationMethod?: string;
  assetType?: string;
  assetCondition?: string;
  valueEstimate?: string;
  informationSource?: string;
  appraisalPurpose?: string;
  marketAnalysis?: string;
  logoUrl?: string;
  
  // Additional fields for transmittal letter and certification
  propertyImageUrl?: string;
  transmittalLetterText?: string;
  certificationText?: string;
  certificationSignatureUrl?: string;
  signatureImageUrl?: string;
  legalDisclaimer?: string;
  watermarkUrl?: string;
  watermarkLogoUrl?: string;
}

export interface ReportData {
  items: ReportItem[];
  options: ReportOptions;
}

// Common utility functions
export const addHeader = (doc: PDFKit.PDFDocument, title: string = "Market Valuation Report") => {
  doc.save();
  
  // Add a subtle header background
  doc.rect(0, 0, doc.page.width, 60).fill("#f8fafc");
  
  // Report title (left aligned for better consistency with table)
  doc
    .fontSize(18)
    .fillColor("#1e40af")
    .font("Helvetica-Bold")
    .text(title, 40, 20, { align: "left" });
  
  // Date (right side)
  const dateText = `Generated: ${new Date().toLocaleDateString("en-US", { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })}`;
  
  doc
    .fontSize(10)
    .fillColor("#64748b")
    .font("Helvetica")
    .text(dateText, doc.page.width - 150, 25, { align: "right" });
  
  doc.restore();
  doc.moveDown(2); // Reduced space after header for better page utilization
};

export const addFooter = (doc: PDFKit.PDFDocument) => {
  const pageNumber = doc.bufferedPageRange().count;
  
  doc.save();
  // Add a subtle footer line
  doc.rect(40, doc.page.height - 30, doc.page.width - 80, 0.5).fill("#e2e8f0");
  
  doc.fontSize(8)
     .fillColor("#64748b")
     .text(
       `Page ${pageNumber} | Clear Value Report | Confidential`,
       doc.page.margins.left,
       doc.page.height - 20,
       { align: "center" }
     );
  doc.restore();
};

export const addSectionDivider = (doc: PDFKit.PDFDocument, title: string) => {
  // Avoid extra space before section dividers
  if (doc.y > 100) { // Only move down if we're not near the top of the page
    doc.moveDown(0.5);
  }
  doc.save();
  doc.rect(0, doc.y - 2, doc.page.width, 30).fill("#e3e6f7");
  doc
    .fillColor("#23395d")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(title, 40, doc.y - 28, { align: "left" });
  doc.restore();
  doc.moveDown(1); // Reduced space after divider
};

export const addCoverPage = (doc: PDFKit.PDFDocument, options: ReportOptions) => {
  doc.addPage({ size: "A4", margin: 40 });
  doc.fillColor("#23395d").rect(0, 0, doc.page.width, doc.page.height).fill();
  
  // Title based on report type
  let title = "Market Valuation Report";
  let subtitle = "";
  
  if (options.reportType === 'full') {
    title = "Comprehensive Market Valuation";
    subtitle = "DETAILED ANALYSIS & MARKET RESEARCH";
  } else if (options.reportType === 'basic') {
    title = "Basic Valuation Report";
    
    switch (options.subType) {
      case 'asset':
        subtitle = "ASSET INVENTORY & VALUATION";
        break;
      case 'real-estate':
        subtitle = "REAL ESTATE VALUATION";
        break;
      case 'salvage':
        subtitle = "SALVAGE ASSESSMENT";
        break;
      default:
        subtitle = "BASIC VALUATION";
    }
  }
  
  doc
    .fillColor("#fff")
    .font("Helvetica-Bold")
    .fontSize(44)
    .text(title, { align: "center" });
  doc.moveDown(2);
  
  doc
    .fontSize(24)
    .text(subtitle, { align: "center" });
  doc.moveDown(2);
  
  doc
    .fontSize(16)
    .font("Helvetica")
    .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
  
  // Add currency info if specified
  if (options.currency) {
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor("#f8fafc").text(`Currency: ${options.currency}`, {
      align: "center"
    });
  }
  
  doc.addPage();
};

// Helper function to create a new PDF document
export const createPdfDocument = () => {
  return new PDFDocument({
    size: "A4",
    margin: 40,
    autoFirstPage: true,
  });
};

// Helper function to save PDF and return file info
export const savePdf = (doc: PDFKit.PDFDocument): Promise<{ filePath: string, fileName: string }> => {
  const timestamp = new Date().getTime();
  const filename = `report_${timestamp}.pdf`;
  const outputPath = path.join(REPORTS_DIR, filename);
  const writeStream = fs.createWriteStream(outputPath);
  
  doc.pipe(writeStream);
  doc.end();
  
  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => resolve({ filePath: outputPath, fileName: filename }));
    writeStream.on("error", (err) => {
      console.error("Error generating PDF:", err);
      reject(err);
    });
  });
};
