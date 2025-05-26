import PDFDocument from "pdfkit";
import { 
  ReportData, 
  ReportOptions, 
  addHeader, 
  addFooter, 
  addSectionDivider, 
  addCoverPage,
  createPdfDocument,
  savePdf
} from "./pdfGeneratorCommon";

// Generate a real estate report with specific property-related details
export const generateRealEstateReport = async (data: ReportData): Promise<{ filePath: string, fileName: string }> => {
  try {
    const doc = createPdfDocument();
    
    // Add cover page
    addCoverPage(doc, { ...data.options, subType: 'real-estate' });
    
    // Add header to first content page
    addHeader(doc, "Real Estate Valuation Report");
    
    // Add real estate-specific introduction
    addRealEstateIntroduction(doc);
    
    // Add property items table
    addPropertyItemsTable(doc, data.items, data.options);
    
    // Add real estate-specific details section
    addRealEstateDetailsSection(doc);
    
    // Add footer to all pages
    addFooter(doc);
    
    // Save and return file info
    return savePdf(doc);
  } catch (error) {
    console.error("Error in real estate PDF generation:", error);
    throw error;
  }
};

// Add real estate-specific introduction
const addRealEstateIntroduction = (doc: PDFKit.PDFDocument) => {
  doc.fontSize(12)
     .fillColor("#374151")
     .text("This report provides a valuation of the real estate properties listed below. Each property has been evaluated based on its location, condition, market trends, and comparable sales in the area.", { align: "left" });
  
  doc.moveDown(1);
};

// Add the property items table with ID, description, condition, and price
const addPropertyItemsTable = (doc: PDFKit.PDFDocument, items: any[], options: ReportOptions) => {
  // Set default currency symbol
  const currencySymbol = options.currency === 'CAD' ? 'CA$' : '$';
  
  // Add section divider
  addSectionDivider(doc, "Property Inventory");
  
  // Table layout
  const margin = 40;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - margin * 2;
  
  // Column widths (proportions of table width)
  const colWidths = [0.1, 0.4, 0.3, 0.2];
  
  // Calculate column positions
  const colPositions = [
    margin,
    margin + tableWidth * colWidths[0],
    margin + tableWidth * (colWidths[0] + colWidths[1]),
    margin + tableWidth * (colWidths[0] + colWidths[1] + colWidths[2]),
  ];
  
  const rowHeight = 30;
  let y = doc.y;
  
  // Table header
  doc.save();
  doc.rect(margin, y, tableWidth, rowHeight).fill("#374151");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
  doc.text("ID", colPositions[0] + 5, y + 10, { width: tableWidth * colWidths[0] - 10 });
  doc.text("Property Description", colPositions[1] + 5, y + 10, { width: tableWidth * colWidths[1] - 10 });
  doc.text("Condition", colPositions[2] + 5, y + 10, { width: tableWidth * colWidths[2] - 10 });
  doc.text("Valuation", colPositions[3] + 5, y + 10, { width: tableWidth * colWidths[3] - 10, align: "right" });
  doc.restore();
  
  y += rowHeight;
  
  // Table rows
  let total = 0;
  
  items.forEach((item, index) => {
    // Check if we need a new page
    if (y + rowHeight > doc.page.height - 50) {
      doc.addPage();
      addFooter(doc);
      addHeader(doc, "Real Estate Valuation Report");
      y = doc.y;
    }
    
    // Row background (alternating colors)
    const isEven = index % 2 === 0;
    doc.save();
    doc.rect(margin, y, tableWidth, rowHeight).fill(isEven ? "#f3f4f6" : "#e5e7eb");
    doc.restore();
    
    // Row content
    doc.fillColor("#111827").font("Helvetica").fontSize(11);
    
    // ID column
    doc.text(String(item.id || index + 1), colPositions[0] + 5, y + 10, 
             { width: tableWidth * colWidths[0] - 10 });
    
    // Description column
    doc.text(item.description || "", colPositions[1] + 5, y + 10, 
             { width: tableWidth * colWidths[1] - 10 });
    
    // Condition column
    doc.text(item.condition || "", colPositions[2] + 5, y + 10, 
             { width: tableWidth * colWidths[2] - 10 });
    
    // Price column
    const price = typeof item.price === 'number' ? item.price : 0;
    doc.text(`${currencySymbol}${price.toLocaleString()}`, colPositions[3] + 5, y + 10, 
             { width: tableWidth * colWidths[3] - 10, align: "right" });
    
    total += price;
    y += rowHeight;
  });
  
  // Total row
  doc.save();
  doc.rect(margin, y, tableWidth, rowHeight).fill("#1e40af");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
  doc.text("Total Property Value", colPositions[0] + 5, y + 10, 
           { width: tableWidth * (colWidths[0] + colWidths[1] + colWidths[2]) - 10, align: "right" });
  doc.text(`${currencySymbol}${total.toLocaleString()}`, colPositions[3] + 5, y + 10, 
           { width: tableWidth * colWidths[3] - 10, align: "right" });
  doc.restore();
  
  doc.moveDown(2);
};

// Add real estate-specific details section
const addRealEstateDetailsSection = (doc: PDFKit.PDFDocument) => {
  // Add section divider
  addSectionDivider(doc, "Valuation Methodology");
  
  doc.fontSize(11)
     .fillColor("#374151")
     .text("The real estate valuations in this report are based on a comparative market analysis approach. The following factors were considered in determining the property values:", { align: "left" });
  
  doc.moveDown(0.5);
  
  // Add bullet points
  const bulletPoints = [
    "Recent comparable sales in the same area",
    "Current market trends and demand",
    "Property condition and age",
    "Location factors (neighborhood, proximity to amenities, etc.)",
    "Property size, layout, and special features"
  ];
  
  bulletPoints.forEach(point => {
    doc.fontSize(10)
       .fillColor("#4b5563")
       .text(`• ${point}`, { align: "left", indent: 10 });
    
    doc.moveDown(0.3);
  });
  
  doc.moveDown(1);
  
  // Add disclaimer
  doc.fontSize(9)
     .fillColor("#6b7280")
     .text("Note: This valuation represents an estimated market value as of the report date. It is not an appraisal and should not be used for mortgage financing, tax assessment, or other legal purposes. Actual sale prices may vary based on market conditions, buyer interest, and other factors outside the scope of this assessment.", { align: "left" });
  
  doc.moveDown(1);
};
