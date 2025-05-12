import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { MarketValuation } from "../services/openaiService";
import { MarketResearchResult } from "../services/marketResearchService";

const REPORTS_DIR = path.join(process.cwd(), "uploads", "reports");

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

const addHeader = (doc: PDFKit.PDFDocument) => {
  doc
    .fontSize(25)
    .text("Market Valuation Report", { align: "center" })
    .moveDown(0.5)
    .fontSize(12)
    .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" })
    .moveDown(1);
};

const addSectionHeader = (doc: PDFKit.PDFDocument, title: string) => {
  doc.fontSize(16).text(title, { underline: true }).moveDown(0.5);
};

const addCoverPage = (doc: PDFKit.PDFDocument, reportType: string) => {
  doc.addPage({ size: "A3", margin: 40 });
  doc.fillColor("#23395d").rect(0, 0, doc.page.width, doc.page.height).fill();
  doc
    .fillColor("#fff")
    .font("Helvetica-Bold")
    .fontSize(44)
    .text("Market Valuation Report", { align: "center" });
  doc.moveDown(2);
  doc
    .fontSize(24)
    .text(`${reportType.toUpperCase()} REPORT`, { align: "center" });
  doc.moveDown(2);
  doc
    .fontSize(16)
    .font("Helvetica")
    .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
  doc.addPage();
};

const addSectionDivider = (doc: PDFKit.PDFDocument, title: string) => {
  doc.moveDown(1);
  doc.save();
  doc.rect(0, doc.y - 2, doc.page.width, 30).fill("#e3e6f7");
  doc
    .fillColor("#23395d")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(title, 40, doc.y - 28, { align: "left" });
  doc.restore();
  doc.moveDown(1.5);
};

const addSummarySection = (doc: PDFKit.PDFDocument, items: any[], options?: ReportData['options']) => {
  // Set default currency symbol
  const currencySymbol = options?.currency === 'CAD' ? 'CA$' : '$';
  addSectionDivider(doc, "Summary of Identified Items");
  
  // Sort items by confidence (highest first)
  const sortedItems = [...items].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  
  // Take top 5 most confident items
  const topItems = sortedItems.slice(0, 5);
  
  doc.fontSize(14).fillColor("#23395d").text("Top Identified Items (by confidence)", { align: "left" });
  doc.moveDown(0.5);
  
  // Create a simple table for the summary
  const pageWidth = doc.page.width;
  const margin = 60;
  const tableWidth = pageWidth - margin * 2;
  
  topItems.forEach((item, idx) => {
    const confidence = Number(item.confidence) || 0;
    let confidenceColor = '#ef4444'; // Red for low confidence
    if (confidence >= 0.8) confidenceColor = '#22c55e'; // Green for high confidence
    else if (confidence >= 0.5) confidenceColor = '#f59e0b'; // Yellow for medium confidence
    
    doc.save();
    doc.roundedRect(margin, doc.y, tableWidth, 40, 6)
       .fill(idx % 2 === 0 ? '#f9fafb' : '#f3f4f6');
    doc.restore();
    
    doc.fillColor("#111827").fontSize(13).font('Helvetica-Bold')
       .text(item.name, margin + 10, doc.y + 5, { continued: true });
    
    doc.fillColor(confidenceColor).fontSize(12).font('Helvetica')
       .text(` (${(confidence * 100).toFixed(0)}% confidence)`, { align: "left" });
    
    doc.fillColor("#374151").fontSize(12).font('Helvetica')
       .text(`${currencySymbol}${Number(item.value).toLocaleString()} - ${item.condition || 'Unknown condition'}`, 
             margin + 20, doc.y + 3, { align: "left" });
             
    // Add tear/wear analysis if option is enabled
    if (options?.includeTearWear && item.tearWear) {
      doc.fillColor("#4b5563").fontSize(10).font('Helvetica')
         .text(`Wear & Tear: ${item.tearWear}`, margin + 25, doc.y + 3, { align: "left" });
    }
    
    doc.moveDown(1.5);
  });
  
  doc.moveDown(1);
};

// Simplified footer function that only adds a footer to the current page
// This avoids page switching issues
const addFooter = (doc: PDFKit.PDFDocument) => {
  try {
    // Only add footer to current page
    doc.fontSize(10)
       .fillColor("#999")
       .text("Market Valuation Report", 0, doc.page.height - 30, {
         align: "center",
       });
  } catch (error) {
    console.error("Error adding footer:", error);
    // Continue without footer if there's an error
  }
};

const addItemTable = (doc: PDFKit.PDFDocument, items: any[], options?: ReportData['options']) => {
  // Set default currency symbol
  const currencySymbol = options?.currency === 'CAD' ? 'CA$' : '$';
  const pageWidth = doc.page.width;
  const margin = 60; // Enhanced margin
  const tableWidth = pageWidth - margin * 2;
  // Updated column widths to include confidence
  const colWidths = [0.06, 0.22, 0.36, 0.16, 0.20];
  const colPositions = [
    margin,
    margin + tableWidth * colWidths[0],
    margin + tableWidth * (colWidths[0] + colWidths[1]),
    margin + tableWidth * (colWidths[0] + colWidths[1] + colWidths[2]),
    margin + tableWidth * (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]),
  ];
  const rowHeight = 34; // More vertical space
  let y = doc.y + 10; // Extra top padding

  // Header
  doc.save();
  doc.roundedRect(margin, y, tableWidth, rowHeight, 8).fill('#374151'); // dark header
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(15);
  doc.text('ID', colPositions[0], y + 9, { width: tableWidth * colWidths[0], align: 'left' });
  doc.text('Title', colPositions[1], y + 9, { width: tableWidth * colWidths[1], align: 'left' });
  doc.text('Description', colPositions[2], y + 9, { width: tableWidth * colWidths[2], align: 'left' });
  doc.text('Confidence', colPositions[3], y + 9, { width: tableWidth * colWidths[3], align: 'center' });
  doc.text('Price', colPositions[4], y + 9, { width: tableWidth * colWidths[4], align: 'right' });
  doc.restore();
  y += rowHeight;
  let total = 0;
  items.forEach((item: any, idx: number) => {
    const isEven = idx % 2 === 0;
    doc.save();
    doc.roundedRect(margin, y, tableWidth, rowHeight, 6).fill(isEven ? '#f3f4f6' : '#e0e7ef'); // subtle zebra rows
    doc.restore();
    doc.fillColor('#222').font('Helvetica').fontSize(13);
    doc.text(`${idx + 1}`, colPositions[0], y + 8, { width: tableWidth * colWidths[0], align: 'left' });
    doc.text(item.name || '', colPositions[1], y + 8, { width: tableWidth * colWidths[1], align: 'left' });
    doc.text(item.condition || item.description || '', colPositions[2], y + 8, { width: tableWidth * colWidths[2], align: 'left' });
    
    // Add confidence level with color coding
    const confidence = Number(item.confidence) || 0;
    let confidenceColor = '#ef4444'; // Red for low confidence
    if (confidence >= 0.8) confidenceColor = '#22c55e'; // Green for high confidence
    else if (confidence >= 0.5) confidenceColor = '#f59e0b'; // Yellow for medium confidence
    
    doc.fillColor(confidenceColor).text(`${(confidence * 100).toFixed(0)}%`, colPositions[3], y + 8, { width: tableWidth * colWidths[3], align: 'center' });
    doc.fillColor('#222').text(`${currencySymbol}${item.value?.toLocaleString() || '0'}`, colPositions[4], y + 8, { width: tableWidth * colWidths[4], align: 'right' });
    total += Number(item.value) || 0;
    y += rowHeight + 2; // More space between rows
    if (y + rowHeight > doc.page.height - margin) {
      doc.addPage();
      y = margin + 10;
    }
  });
  // Total row
  doc.save();
  doc.roundedRect(margin, y, tableWidth, rowHeight, 8).fill('#2563eb'); // blue total
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(15);
  doc.text('Total', colPositions[0], y + 9, { width: tableWidth * (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]), align: 'right' });
  doc.text(`${currencySymbol}${total.toLocaleString()}`, colPositions[4], y + 9, { width: tableWidth * colWidths[4], align: 'right' });
  doc.restore();
  doc.moveDown(2);
};

const addSources = (doc: PDFKit.PDFDocument, sources: string[]) => {
  addSectionDivider(doc, "Market Research Sources");
  doc.fontSize(12).fillColor("#23395d");
  sources.forEach((source, idx) => {
    doc
      .circle(50, doc.y + 7, 2)
      .fill("#23395d")
      .stroke();
    doc.fillColor("#222").text(` ${source}`, 60, doc.y, { continued: false });
    doc.moveDown(0.2);
  });
  doc.moveDown(1);
};

interface ReportData {
  type: "image" | "video";
  results: any[];
  marketResearch: any;
  options?: {
    singleItem?: boolean;      // Single item mode
    fullReport?: boolean;
    currency?: string;
    includeTearWear?: boolean;
    includeMarketComparison?: boolean;
    includeConditionDetails?: boolean;
    includePriceHistory?: boolean;
  };
}

export const generatePDFReport = async (data: ReportData): Promise<string> => {
  try {
    const doc = new PDFDocument({
      size: "A3",
      margin: 40,
      autoFirstPage: true, // Create first page automatically to avoid page numbering issues
    });
    const outputPath = path.join(
      REPORTS_DIR,
      `${Date.now()}_${data.type}_report.pdf`
    );
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Add title to first page
    doc.fontSize(30).fillColor("#23395d").text("Market Valuation Report", {
      align: "center"
    });
    doc.moveDown(1);
    
    // If single item mode is enabled, show that in the title
    if (data.options?.singleItem) {
      doc.fontSize(18).fillColor("#333").text(`SINGLE ITEM ${data.type.toUpperCase()} ANALYSIS`, {
        align: "center"
      });
    } else {
      doc.fontSize(18).fillColor("#333").text(`${data.type.toUpperCase()} ANALYSIS`, {
        align: "center"
      });
    }
    
    // Add currency info if specified
    if (data.options?.currency) {
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor("#4b5563").text(`Currency: ${data.options.currency}`, {
        align: "center"
      });
    }
    doc.moveDown(1);
    doc.fontSize(14).text(`Generated on: ${new Date().toLocaleString()}`, {
      align: "center"
    });

    // Gather all items from all images/videos
    let allItems: any[] = [];
    if (Array.isArray(data.results)) {
      data.results.forEach((result: any) => {
        // Handle direct items from image results
        if (result.aiValuation && Array.isArray(result.aiValuation.items)) {
          allItems = allItems.concat(
            result.aiValuation.items.map((item: any) => ({
              ...item,
              name: item.name,
              source: result.filename || 'unknown'
            }))
          );
        }
        
        // Handle nested items from video results
        if (result.results && Array.isArray(result.results)) {
          result.results.forEach((frameResult: any) => {
            if (frameResult && frameResult.aiValuation && Array.isArray(frameResult.aiValuation.items)) {
              allItems = allItems.concat(
                frameResult.aiValuation.items.map((item: any) => ({
                  ...item,
                  name: item.name,
                  source: `${result.filename || 'unknown'} (frame: ${frameResult.frame || 'unknown'})`
                }))
              );
            }
          });
        }
      });
    }
    
    // Add summary section with top confident items
    if (allItems.length > 0) {
      doc.addPage();
      addSummarySection(doc, allItems, data.options);
    }
    
    // Add detailed items table
    doc.addPage();
    addSectionDivider(doc, "Detailed Item Analysis");
    addItemTable(doc, allItems, data.options);
    
    // Add additional sections based on options
    if (data.options?.fullReport) {
      // Add market comparison if requested
      if (data.options?.includeMarketComparison) {
        doc.addPage();
        addSectionDivider(doc, "Market Comparison");
        doc.fontSize(12).fillColor("#374151")
           .text("This section compares the identified items with similar items in the current market.", {
             align: "left"
           });
        doc.moveDown(1);
      }
      
      // Add condition details if requested
      if (data.options?.includeConditionDetails && data.options?.includeTearWear) {
        doc.addPage();
        addSectionDivider(doc, "Condition Details & Wear Analysis");
        doc.fontSize(12).fillColor("#374151")
           .text("This section provides detailed analysis of the condition and wear/tear of each item.", {
             align: "left"
           });
        doc.moveDown(1);
      }
      
      // Add price history if requested
      if (data.options?.includePriceHistory) {
        doc.addPage();
        addSectionDivider(doc, "Price History");
        doc.fontSize(12).fillColor("#374151")
           .text("This section shows historical price trends for similar items.", {
             align: "left"
           });
        doc.moveDown(1);
      }
    }
    
    // Add market research if available
    if (data.marketResearch && data.marketResearch.sources) {
      doc.addPage();
      addSources(doc, data.marketResearch.sources);
    }
    
    // Completely remove any page switching to avoid errors
    // We'll just let PDFKit handle the pages naturally

    doc.end();
    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => resolve(outputPath));
      writeStream.on("error", (err) => {
        console.error("Error generating PDF:", err);
        reject(err);
      });
    });
  } catch (error) {
    console.error("Error in PDF generation:", error);
    throw error;
  }
};
