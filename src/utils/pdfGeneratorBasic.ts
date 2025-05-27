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
    
    // Add header to first content page only
    const title = getReportTitle(data.options);
    addHeader(doc, title);
    
    // Add introduction
    addIntroduction(doc, data.options);
    
    // Add items table - pass isFirstPage=true to indicate this is the first content page
    addItemsTable(doc, data.items, data.options, true);
    
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
const addItemsTable = (doc: PDFKit.PDFDocument, items: any[], options: ReportOptions, isFirstPage: boolean = false) => {
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
  
  // Function to draw table header
  const drawTableHeader = () => {
    doc.save();
    doc.rect(margin, y, tableWidth, rowHeight).fill("#374151");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
    doc.text("ID", colPositions[0] + 5, y + 10, { width: tableWidth * colWidths[0] - 10 });
    doc.text("Description", colPositions[1] + 5, y + 10, { width: tableWidth * colWidths[1] - 10 });
    doc.text("Condition", colPositions[2] + 5, y + 10, { width: tableWidth * colWidths[2] - 10 });
    doc.text("Price", colPositions[3] + 5, y + 10, { width: tableWidth * colWidths[3] - 10, align: "right" });
    doc.restore();
    y += rowHeight;
  };
  
  // Draw initial table header
  drawTableHeader();
  
  // Table rows
  let total = 0;
  let currentPage = doc.bufferedPageRange().count;
  
  items.forEach((item, index) => {
    // Check if we need a new page
    if (y + rowHeight > doc.page.height - 100) {
      // End current page properly
      doc.addPage();
      
      // Reset Y position for the new page
      y = 100; // Start below the header
      
      // Only add page number and minimal header on subsequent pages
      // We don't want to repeat the main heading
      doc.font('Helvetica')
         .fontSize(10)
         .text(`Page ${doc.bufferedPageRange().count}`, doc.page.width / 2, 40, { align: 'center' });
      
      // Redraw table header on the new page
      drawTableHeader();
      
      // Add footer to the new page
      addFooter(doc);
      
      // Track that we're on a new page
      currentPage = doc.bufferedPageRange().count;
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
    
    // Description column - truncate if too long
    const description = item.description || item.name || "";
    doc.text(description, colPositions[1] + 5, y + 10, 
             { width: tableWidth * colWidths[1] - 10, ellipsis: true });
    
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
  
  // Check if total row needs a new page
  if (y + rowHeight > doc.page.height - 100) {
    doc.addPage();
    y = 100; // Start below the header
    
    // Only add page number on subsequent pages, not the main heading
    doc.font('Helvetica')
       .fontSize(10)
       .text(`Page ${doc.bufferedPageRange().count}`, doc.page.width / 2, 40, { align: 'center' });
       
    addFooter(doc);
  }
  
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
