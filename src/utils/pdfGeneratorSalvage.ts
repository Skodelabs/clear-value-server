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

// Generate a salvage report with specific salvage-related details
export const generateSalvageReport = async (data: ReportData): Promise<{ filePath: string, fileName: string }> => {
  try {
    const doc = createPdfDocument();
    
    // Add cover page
    addCoverPage(doc, { ...data.options, subType: 'salvage' });
    
    // Add header to first content page
    addHeader(doc, "Salvage Assessment Report");
    
    // Add salvage-specific introduction
    addSalvageIntroduction(doc);
    
    // Add salvage items table
    addSalvageItemsTable(doc, data.items, data.options);
    
    // Add salvage-specific details section
    addSalvageDetailsSection(doc);
    
    // Add footer to all pages
    addFooter(doc);
    
    // Save and return file info
    return savePdf(doc);
  } catch (error) {
    console.error("Error in salvage PDF generation:", error);
    throw error;
  }
};

// Add salvage-specific introduction
const addSalvageIntroduction = (doc: PDFKit.PDFDocument) => {
  doc.fontSize(12)
     .fillColor("#374151")
     .text("This report provides an assessment of the salvage value for the items listed below. Each item has been evaluated based on its current condition, material value, and potential for reclamation or recycling.", { align: "left" });
  
  doc.moveDown(1);
};

// Add the salvage items table with ID, description, condition, and price
const addSalvageItemsTable = (doc: PDFKit.PDFDocument, items: any[], options: ReportOptions) => {
  // Set default currency symbol
  const currencySymbol = options.currency === 'CAD' ? 'CA$' : '$';
  
  // Add section divider
  addSectionDivider(doc, "Salvage Inventory");
  
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
  doc.text("Item Description", colPositions[1] + 5, y + 10, { width: tableWidth * colWidths[1] - 10 });
  doc.text("Condition", colPositions[2] + 5, y + 10, { width: tableWidth * colWidths[2] - 10 });
  doc.text("Salvage Value", colPositions[3] + 5, y + 10, { width: tableWidth * colWidths[3] - 10, align: "right" });
  doc.restore();
  
  y += rowHeight;
  
  // Table rows
  let total = 0;
  
  items.forEach((item, index) => {
    // Check if we need a new page
    if (y + rowHeight > doc.page.height - 50) {
      doc.addPage();
      addFooter(doc);
      addHeader(doc, "Salvage Assessment Report");
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
  doc.text("Total Salvage Value", colPositions[0] + 5, y + 10, 
           { width: tableWidth * (colWidths[0] + colWidths[1] + colWidths[2]) - 10, align: "right" });
  doc.text(`${currencySymbol}${total.toLocaleString()}`, colPositions[3] + 5, y + 10, 
           { width: tableWidth * colWidths[3] - 10, align: "right" });
  doc.restore();
  
  doc.moveDown(2);
};

// Add salvage-specific details section
const addSalvageDetailsSection = (doc: PDFKit.PDFDocument) => {
  // Add section divider
  addSectionDivider(doc, "Salvage Valuation Notes");
  
  doc.fontSize(11)
     .fillColor("#374151")
     .text("The salvage valuations in this report represent the estimated recoverable value of the items in their current condition. The following factors were considered in determining the salvage values:", { align: "left" });
  
  doc.moveDown(0.5);
  
  // Add bullet points
  const bulletPoints = [
    "Material composition and current market rates for recyclable materials",
    "Potential for parts reclamation and reuse",
    "Labor costs associated with dismantling and processing",
    "Current condition and extent of damage or deterioration",
    "Environmental considerations and disposal requirements"
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
     .text("Note: Salvage valuations represent estimated recoverable value as of the report date. Actual realized values may vary based on market conditions for recyclable materials, labor costs, and other factors outside the scope of this assessment.", { align: "left" });
  
  doc.moveDown(1);
};
