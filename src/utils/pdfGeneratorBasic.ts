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

// Generate a basic report with a simple table of items
export const generateBasicReport = async (data: ReportData): Promise<{ filePath: string, fileName: string }> => {
  try {
    const doc = createPdfDocument();
    
    // Add cover page
    addCoverPage(doc, data.options);
    
    // Add header to first content page
    addHeader(doc, getReportTitle(data.options));
    
    // Add introduction
    addIntroduction(doc, data.options);
    
    // Add items table
    addItemsTable(doc, data.items, data.options);
    
    // Add footer to all pages
    addFooter(doc);
    
    // Save and return file info
    return savePdf(doc);
  } catch (error) {
    console.error("Error in basic PDF generation:", error);
    throw error;
  }
};

// Helper function to get report title based on subtype
const getReportTitle = (options: ReportOptions): string => {
  if (!options.subType) return "Basic Valuation Report";
  
  switch (options.subType) {
    case 'asset':
      return "Asset Inventory Report";
    case 'real-estate':
      return "Real Estate Valuation Report";
    case 'salvage':
      return "Salvage Assessment Report";
    default:
      return "Basic Valuation Report";
  }
};

// Add a brief introduction based on report subtype
const addIntroduction = (doc: PDFKit.PDFDocument, options: ReportOptions) => {
  let introText = "This report provides a basic valuation of the items listed below.";
  
  if (options.subType) {
    switch (options.subType) {
      case 'asset':
        introText = "This report provides an inventory and valuation of the assets listed below.";
        break;
      case 'real-estate':
        introText = "This report provides a valuation of the real estate properties listed below.";
        break;
      case 'salvage':
        introText = "This report provides an assessment of the salvage value for the items listed below.";
        break;
    }
  }
  
  doc.fontSize(12)
     .fillColor("#374151")
     .text(introText, { align: "left" });
  
  doc.moveDown(1);
};

// Add the items table with ID, description, condition, and price
const addItemsTable = (doc: PDFKit.PDFDocument, items: any[], options: ReportOptions) => {
  // Set default currency symbol
  const currencySymbol = options.currency === 'CAD' ? 'CA$' : '$';
  
  // Add section divider
  addSectionDivider(doc, "Item Inventory");
  
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
  doc.text("Description", colPositions[1] + 5, y + 10, { width: tableWidth * colWidths[1] - 10 });
  doc.text("Condition", colPositions[2] + 5, y + 10, { width: tableWidth * colWidths[2] - 10 });
  doc.text("Price", colPositions[3] + 5, y + 10, { width: tableWidth * colWidths[3] - 10, align: "right" });
  doc.restore();
  
  y += rowHeight;
  
  // Table rows
  let total = 0;
  
  items.forEach((item, index) => {
    // Check if we need a new page
    if (y + rowHeight > doc.page.height - 50) {
      doc.addPage();
      addFooter(doc);
      addHeader(doc, getReportTitle(options));
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
  doc.text("Total", colPositions[0] + 5, y + 10, 
           { width: tableWidth * (colWidths[0] + colWidths[1] + colWidths[2]) - 10, align: "right" });
  doc.text(`${currencySymbol}${total.toLocaleString()}`, colPositions[3] + 5, y + 10, 
           { width: tableWidth * colWidths[3] - 10, align: "right" });
  doc.restore();
  
  doc.moveDown(2);
};
