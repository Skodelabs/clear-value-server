import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { addFooter } from "./enhancedPdfGenerator";

const REPORTS_DIR = path.join(process.cwd(), "uploads", "reports");

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

const addHeader = (doc: PDFKit.PDFDocument) => {
  // Add a professional header with logo placeholder and better typography
  doc.save();
  
  // Add a subtle header background
  doc.rect(0, 0, doc.page.width, 60).fill("#f8fafc");
  
  // Logo placeholder (left side)
  doc.rect(40, 15, 30, 30).lineWidth(1).stroke("#94a3b8");
  doc.fontSize(10).fillColor("#64748b").text("LOGO", 40, 25, { width: 30, align: "center" });
  
  // Report title (center)
  doc
    .fontSize(22)
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .text("Market Valuation Report", 100, 20, { align: "center" });
  
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
  doc.moveDown(2.5); // Space after header
};

const addSectionHeader = (doc: PDFKit.PDFDocument, title: string) => {
  doc.fontSize(16).text(title, { underline: true }).moveDown(0.5);
};

const addCoverPage = (doc: PDFKit.PDFDocument, reportType: string, options?: ReportOptions) => {
  doc.addPage({ size: "A3", margin: 40 });
  doc.fillColor("#23395d").rect(0, 0, doc.page.width, doc.page.height).fill();
  
  // Title based on report type
  let title = "Market Valuation Report";
  if (options?.reportType === 'asset-listing') {
    title = "Asset Listing Report";
  }
  
  doc
    .fillColor("#fff")
    .font("Helvetica-Bold")
    .fontSize(44)
    .text(title, { align: "center" });
  doc.moveDown(2);
  
  // Subtitle based on report type
  let subtitle = reportType.toUpperCase();
  if (options?.reportType) {
    switch (options.reportType) {
      case 'full':
        subtitle = "COMPREHENSIVE VALUATION";
        break;
      case 'standard':
        subtitle = "STANDARD VALUATION";
        break;
      case 'asset-listing':
        subtitle = "ASSET INVENTORY";
        break;
    }
  }
  
  doc
    .fontSize(24)
    .text(`${subtitle}`, { align: "center" });
  doc.moveDown(2);
  doc
    .fontSize(16)
    .font("Helvetica")
    .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
  doc.addPage();
};

const addSectionDivider = (doc: PDFKit.PDFDocument, title: string) => {
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

const addSummarySection = (doc: PDFKit.PDFDocument, items: any[], options?: ReportData['options']) => {
  // Set default currency symbol
  const currencySymbol = options?.currency === 'CAD' ? 'CA$' : '$';
  addSectionDivider(doc, "Summary of Identified Items");
  
  // Sort items by confidence (highest first)
  const sortedItems = [...items].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  
  // Take top 5 most confident items
  const topItems = sortedItems.slice(0, 5);
  
  // Calculate total estimated value
  const totalValue = topItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  
  // Add a summary box with total value
  doc.save();
  doc.roundedRect(doc.page.width - 240, doc.y, 200, 50, 5)
     .lineWidth(1)
     .fillAndStroke('#f0f9ff', '#bae6fd');
  
  doc.fillColor('#0369a1')
     .font('Helvetica-Bold')
     .fontSize(12)
     .text('Total Estimated Value:', doc.page.width - 230, doc.y - 40, { width: 180 });
  
  doc.fillColor('#0c4a6e')
     .font('Helvetica-Bold')
     .fontSize(16)
     .text(`${currencySymbol}${totalValue.toLocaleString()}`, doc.page.width - 230, doc.y + 5, { width: 180 });
  
  doc.restore();
  
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor("#23395d").text("Top Identified Items", { align: "left" });
  doc.moveDown(0.5);
  
  // Create a modern table for the summary
  const pageWidth = doc.page.width;
  const margin = 40; // Reduced margin for more space
  const tableWidth = pageWidth - margin * 2;
  
  // Table header
  doc.save();
  doc.rect(margin, doc.y, tableWidth, 30).fill("#e0f2fe");
  doc.fillColor("#0c4a6e").fontSize(12).font('Helvetica-Bold')
     .text("Item", margin + 10, doc.y + 10, { width: tableWidth * 0.4 });
  doc.text("Condition", margin + tableWidth * 0.4, doc.y - 12, { width: tableWidth * 0.3 });
  doc.text("Value", margin + tableWidth * 0.7, doc.y - 12, { width: tableWidth * 0.15 });
  doc.text("Confidence", margin + tableWidth * 0.85, doc.y - 12, { width: tableWidth * 0.15 });
  doc.restore();
  doc.moveDown(1);
  
  // Table rows
  topItems.forEach((item, idx) => {
    const confidence = Number(item.confidence) || 0;
    let confidenceColor = '#ef4444'; // Red for low confidence
    if (confidence >= 0.8) confidenceColor = '#22c55e'; // Green for high confidence
    else if (confidence >= 0.5) confidenceColor = '#f59e0b'; // Yellow for medium confidence
    
    // Row background
    doc.save();
    doc.rect(margin, doc.y, tableWidth, 30)
       .fill(idx % 2 === 0 ? '#f9fafb' : '#f3f4f6');
    doc.restore();
    
    // Item name
    doc.fillColor("#111827").fontSize(11).font('Helvetica-Bold')
       .text(item.name, margin + 10, doc.y + 10, { width: tableWidth * 0.4 });
    
    // Condition
    doc.fillColor("#374151").fontSize(11).font('Helvetica')
       .text(item.condition || 'Unknown', margin + tableWidth * 0.4, doc.y - 12, { width: tableWidth * 0.3 });
    
    // Value
    doc.fillColor("#374151").fontSize(11).font('Helvetica')
       .text(`${currencySymbol}${Number(item.value).toLocaleString()}`, 
             margin + tableWidth * 0.7, doc.y - 12, { width: tableWidth * 0.15 });
    
    // Confidence indicator
    doc.fillColor(confidenceColor).fontSize(11).font('Helvetica')
       .text(`${(confidence * 100).toFixed(0)}%`, 
             margin + tableWidth * 0.85, doc.y - 12, { width: tableWidth * 0.15 });
    
    doc.moveDown(1);
  });
  
  // Add a note about confidence levels
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor("#64748b").font('Helvetica-Oblique')
     .text("Note: Confidence levels indicate the reliability of the valuation. Higher percentages represent greater certainty.", 
           margin, doc.y, { align: "left" });
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

interface CustomReportData {
  mainProduct: {
    name: string;
    condition: string;
    details: string;
    confidence: number;
    marketResearch: any;
  };
  additionalProducts?: {
    name: string;
    condition: string;
    details: string;
    confidence: number;
    marketResearch: any;
  }[];
}

type ReportType = "image" | "video" | "custom";

interface ReportOptions {
  reportType?: 'full' | 'standard' | 'asset-listing';  // Type of report to generate
  singleItem?: boolean;      // Single item mode
  currency?: string;
  includeTearWear?: boolean;
  includeMarketComparison?: boolean;
  includeConditionDetails?: boolean;
  includePriceHistory?: boolean;
}

interface ReportData {
  type: ReportType;
  results?: any[];
  marketResearch?: any;
  customData?: CustomReportData;
  options?: ReportOptions;
}

export const generatePDFReport = async (data: ReportData): Promise<{ filePath: string, fileName: string }> => {
  // Validate the data based on report type
  if (data.type === "custom" && !data.customData) {
    throw new Error("Custom report type requires customData");
  }
  
  if ((data.type === "image" || data.type === "video") && !data.results) {
    throw new Error(`${data.type} report type requires results array`);
  }
  try {
    const doc = new PDFDocument({
      size: "A3",
      margin: 40,
      autoFirstPage: true, // Create first page automatically to avoid page numbering issues
    });
    const timestamp = new Date().getTime();
    const filename = `report_${timestamp}.pdf`;
    const outputPath = path.join(REPORTS_DIR, filename);
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);
    
    // Add cover page with report options
    addCoverPage(doc, data.type, data.options);

    // Add header to first content page
    addHeader(doc);
    
    // Add title based on report type
    let title = "Market Valuation Report";
    let subtitle = "";
    
    if (data.options?.reportType) {
      switch (data.options.reportType) {
        case 'full':
          title = "Comprehensive Market Valuation";
          subtitle = "DETAILED ANALYSIS & MARKET RESEARCH";
          break;
        case 'standard':
          title = "Standard Market Valuation";
          subtitle = "MARKET OVERVIEW & CONDITION ASSESSMENT";
          break;
        case 'asset-listing':
          title = "Asset Inventory Report";
          subtitle = "ITEM LISTING & BASIC VALUATION";
          break;
      }
    } else if (data.options?.singleItem) {
      subtitle = "SINGLE ITEM ANALYSIS";
    } else {
      subtitle = `${data.type.toUpperCase()} ANALYSIS`;
    }
    
    doc.fontSize(30).fillColor("#23395d").text(title, {
      align: "center"
    });
    doc.moveDown(1);
    
    doc.fontSize(18).fillColor("#333").text(subtitle, {
      align: "center"
    });
    
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

    // Gather all items based on report type
    let allItems: any[] = [];
    
    if (data.type === "custom" && data.customData) {
      // For custom reports, use the provided product data
      const mainProduct = data.customData.mainProduct;
      allItems.push({
        name: mainProduct.name,
        condition: mainProduct.condition,
        value: mainProduct.marketResearch?.averagePrice || 0,
        confidence: mainProduct.confidence,
        source: 'main-product'
      });
      
      // Add additional products if available
      if (data.customData.additionalProducts && data.customData.additionalProducts.length > 0) {
        data.customData.additionalProducts.forEach(product => {
          allItems.push({
            name: product.name,
            condition: product.condition,
            value: product.marketResearch?.averagePrice || 0,
            confidence: product.confidence,
            source: 'additional-product'
          });
        });
      }
    } else if (Array.isArray(data.results)) {
      // For image/video reports, extract items from AI analysis results
      data.results.forEach((result: any) => {
        // Handle direct items from image results
        if (result.productAnalysis && result.productAnalysis.rawAiResponse && 
            Array.isArray(result.productAnalysis.rawAiResponse.items)) {
          allItems = allItems.concat(
            result.productAnalysis.rawAiResponse.items.map((item: any) => ({
              ...item,
              name: item.name,
              source: result.filename || 'unknown'
            }))
          );
        }
        
        // Handle nested items from video results
        if (result.results && Array.isArray(result.results)) {
          result.results.forEach((frameResult: any) => {
            if (frameResult && frameResult.productAnalysis && 
                frameResult.productAnalysis.rawAiResponse && 
                Array.isArray(frameResult.productAnalysis.rawAiResponse.items)) {
              allItems = allItems.concat(
                frameResult.productAnalysis.rawAiResponse.items.map((item: any) => ({
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
    
    // Determine which sections to include based on report type and options
    const reportType = data.options?.reportType || 'standard';
    
    // Create report based on report type
    switch (reportType) {
      case 'full':
        // Full report includes all possible sections
        
        // Add market comparison section
        if (data.options?.includeMarketComparison) {
          doc.addPage();
          addSectionDivider(doc, "Market Comparison");
          doc.fontSize(12).fillColor("#374151")
             .text("This section compares the identified items with similar items in the current market.", {
               align: "left"
             });
          doc.moveDown(1);
          
          // Add detailed market comparison content here
          doc.fontSize(11).fillColor("#4b5563")
             .text("The market analysis shows how these items compare to similar products in the current market, including price trends and demand factors.", {
               align: "left"
             });
          doc.moveDown(1);
        }
        
        // Add condition details section
        if (data.options?.includeConditionDetails) {
          doc.addPage();
          addSectionDivider(doc, "Condition Details & Wear Analysis");
          doc.fontSize(12).fillColor("#374151")
             .text("This section provides detailed analysis of the condition and wear/tear of each item.", {
               align: "left"
             });
          doc.moveDown(1);
          
          // Add detailed condition content here
          if (data.options?.includeTearWear) {
            doc.fontSize(11).fillColor("#4b5563")
               .text("Wear and tear analysis includes assessment of cosmetic and functional condition factors that may affect valuation.", {
                 align: "left"
               });
            doc.moveDown(1);
          }
        }
        
        // Add price history section
        if (data.options?.includePriceHistory) {
          doc.addPage();
          addSectionDivider(doc, "Price History");
          doc.fontSize(12).fillColor("#374151")
             .text("This section shows historical price trends for similar items.", {
               align: "left"
             });
          doc.moveDown(1);
          
          // Add price history content here
          doc.fontSize(11).fillColor("#4b5563")
             .text("Historical pricing data shows how the value of these items has changed over time, helping to predict future value trends.", {
               align: "left"
             });
          doc.moveDown(1);
        }
        break;
        
      case 'standard':
        // Enhanced standard report with better layout and no empty spaces
        
        // Add market comparison section with actual content
        if (data.options?.includeMarketComparison) {
          // Check if we need a new page based on remaining space
          if (doc.y > doc.page.height - 250) {
            doc.addPage();
            addFooter(doc);
          } else {
            doc.moveDown(1);
          }
          
          addSectionDivider(doc, "Market Overview");
          
          // Add market trend visualization
          doc.fontSize(12).fillColor("#334155")
             .text("Current Market Trends", { align: "left" });
          doc.moveDown(0.5);
          
          // Create a market trend box
          const margin = 40;
          const boxWidth = doc.page.width - margin * 2;
          
          doc.save();
          doc.roundedRect(margin, doc.y, boxWidth, 80, 5)
             .fillAndStroke('#f0f9ff', '#bae6fd');
          
          // Market trend title
          doc.fillColor('#0c4a6e').font('Helvetica-Bold').fontSize(14)
             .text("Market Analysis Summary", margin + 20, doc.y + 15, { width: boxWidth - 40 });
          
          // Market trend description
          doc.fillColor('#334155').font('Helvetica').fontSize(11)
             .text(
               "Based on current market data, similar items have shown stable pricing with slight variations based on condition and rarity. Market demand remains consistent for these types of items.",
               margin + 20, doc.y + 10, { width: boxWidth - 40 }
             );
          
          doc.restore();
          doc.moveDown(4.5);
          
          // Add price comparison table
          doc.fontSize(12).fillColor("#334155")
             .text("Comparative Market Analysis", { align: "left" });
          doc.moveDown(0.5);
          
          // Create a simple comparison table header
          doc.save();
          doc.rect(margin, doc.y, boxWidth, 30).fill("#e0f2fe");
          doc.fillColor("#0c4a6e").fontSize(11).font('Helvetica-Bold')
             .text("Condition", margin + 10, doc.y + 10, { width: boxWidth * 0.25 });
          doc.text("Average Market Price", margin + boxWidth * 0.25 + 10, doc.y - 12, { width: boxWidth * 0.25 });
          doc.text("Price Range", margin + boxWidth * 0.5 + 10, doc.y - 12, { width: boxWidth * 0.25 });
          doc.text("Market Trend", margin + boxWidth * 0.75 + 10, doc.y - 12, { width: boxWidth * 0.25 });
          doc.restore();
          doc.moveDown(1.5);
          
          // Sample data for different conditions
          const conditions = ['Excellent', 'Good', 'Fair', 'Poor'];
          const currencySymbol = data.options?.currency === 'CAD' ? 'CA$' : '$';
          
          conditions.forEach((condition, idx) => {
            // Row background
            doc.save();
            doc.rect(margin, doc.y, boxWidth, 30)
               .fill(idx % 2 === 0 ? '#f9fafb' : '#f3f4f6');
            doc.restore();
            
            // Condition
            doc.fillColor("#334155").fontSize(10).font('Helvetica')
               .text(condition, margin + 10, doc.y + 10, { width: boxWidth * 0.25 });
            
            // Get a sample price based on condition
            let avgPrice = 0;
            let minPrice = 0;
            let maxPrice = 0;
            let trend = 'Stable';
            
            // Use the first item's value as a base and adjust by condition
            if (data.results && data.results.length > 0) {
              const baseValue = Number(data.results[0].value) || 1000;
              
              switch(condition) {
                case 'Excellent':
                  avgPrice = baseValue * 1.2;
                  minPrice = baseValue * 1.1;
                  maxPrice = baseValue * 1.3;
                  trend = 'Upward';
                  break;
                case 'Good':
                  avgPrice = baseValue;
                  minPrice = baseValue * 0.9;
                  maxPrice = baseValue * 1.1;
                  trend = 'Stable';
                  break;
                case 'Fair':
                  avgPrice = baseValue * 0.8;
                  minPrice = baseValue * 0.7;
                  maxPrice = baseValue * 0.9;
                  trend = 'Stable';
                  break;
                case 'Poor':
                  avgPrice = baseValue * 0.6;
                  minPrice = baseValue * 0.5;
                  maxPrice = baseValue * 0.7;
                  trend = 'Downward';
                  break;
              }
            }
            
            // Average price
            doc.fillColor("#334155").fontSize(10).font('Helvetica')
               .text(`${currencySymbol}${avgPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}`
                    , margin + boxWidth * 0.25 + 10, doc.y - 12, { width: boxWidth * 0.25 });
            
            // Price range
            doc.fillColor("#334155").fontSize(10).font('Helvetica')
               .text(`${currencySymbol}${minPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} - ${currencySymbol}${maxPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}`
                    , margin + boxWidth * 0.5 + 10, doc.y - 12, { width: boxWidth * 0.25 });
            
            // Market trend with color coding
            let trendColor = '#22c55e'; // Green for upward
            if (trend === 'Downward') trendColor = '#ef4444'; // Red for downward
            else if (trend === 'Stable') trendColor = '#f59e0b'; // Yellow for stable
            
            doc.fillColor(trendColor).fontSize(10).font('Helvetica-Bold')
               .text(trend, margin + boxWidth * 0.75 + 10, doc.y - 12, { width: boxWidth * 0.25 });
            
            doc.moveDown(1.5);
          });
        }
        
        // Add enhanced condition section
        if (data.options?.includeConditionDetails) {
          // Check if we need a new page based on remaining space
          if (doc.y > doc.page.height - 250) {
            doc.addPage();
            addFooter(doc);
          } else {
            doc.moveDown(1);
          }
          
          addSectionDivider(doc, "Condition Analysis");
          
          const margin = 40;
          const boxWidth = doc.page.width - margin * 2;
          
          doc.fontSize(12).fillColor("#334155")
             .text("How Condition Affects Value", { align: "left" });
          doc.moveDown(0.5);
          
          // Create a condition impact table
          doc.save();
          doc.rect(margin, doc.y, boxWidth, 30).fill("#e0f2fe");
          doc.fillColor("#0c4a6e").fontSize(11).font('Helvetica-Bold')
             .text("Condition Grade", margin + 10, doc.y + 10, { width: boxWidth * 0.25 });
          doc.text("Description", margin + boxWidth * 0.25 + 10, doc.y - 12, { width: boxWidth * 0.5 });
          doc.text("Value Impact", margin + boxWidth * 0.75 + 10, doc.y - 12, { width: boxWidth * 0.25 });
          doc.restore();
          doc.moveDown(1.5);
          
          // Condition descriptions
          const conditions = [
            {
              grade: 'Excellent',
              description: 'Item appears new or like new with minimal signs of use or wear. All original components intact and functioning perfectly.',
              impact: '+20% to +30%'
            },
            {
              grade: 'Good',
              description: 'Item shows normal signs of use but remains in good working condition with no significant defects or damage.',
              impact: 'Base Value'
            },
            {
              grade: 'Fair',
              description: 'Item shows noticeable wear and may have minor functional issues or cosmetic damage that doesn\'t affect core functionality.',
              impact: '-10% to -20%'
            },
            {
              grade: 'Poor',
              description: 'Item has significant wear, damage, or functional issues that affect its usability or appearance substantially.',
              impact: '-30% to -50%'
            }
          ];
          
          conditions.forEach((condition, idx) => {
            // Row background
            doc.save();
            doc.rect(margin, doc.y, boxWidth, 50)
               .fill(idx % 2 === 0 ? '#f9fafb' : '#f3f4f6');
            doc.restore();
            
            // Condition grade with badge
            doc.save();
            doc.roundedRect(margin + 10, doc.y + 15, boxWidth * 0.2, 20, 3)
               .fillAndStroke('#f1f5f9', '#cbd5e1');
            
            doc.fillColor("#334155").fontSize(10).font('Helvetica-Bold')
               .text(condition.grade, margin + 10, doc.y + 19, 
                     { width: boxWidth * 0.2, align: 'center' });
            doc.restore();
            
            // Description
            doc.fillColor("#334155").fontSize(10).font('Helvetica')
               .text(condition.description, margin + boxWidth * 0.25 + 10, doc.y + 10, 
                     { width: boxWidth * 0.5, align: 'left' });
            
            // Value impact
            let impactColor = '#334155';
            if (condition.impact.includes('+')) impactColor = '#22c55e'; // Green for positive
            else if (condition.impact.includes('-')) impactColor = '#ef4444'; // Red for negative
            
            doc.fillColor(impactColor).fontSize(10).font('Helvetica-Bold')
               .text(condition.impact, margin + boxWidth * 0.75 + 10, doc.y + 19, 
                     { width: boxWidth * 0.25, align: 'left' });
            
            doc.moveDown(2.5);
          });
          
          // Add condition care tips
          doc.moveDown(0.5);
          doc.fontSize(12).fillColor("#334155")
             .text("Condition Care Tips", { align: "left" });
          doc.moveDown(0.5);
          
          doc.fontSize(10).fillColor("#475569").font('Helvetica')
             .text("• Store items in a climate-controlled environment away from direct sunlight", 
                   margin + 10, doc.y, { continued: false });
          doc.moveDown(0.5);
          
          doc.fontSize(10).fillColor("#475569").font('Helvetica')
             .text("• Clean and maintain items according to manufacturer recommendations", 
                   margin + 10, doc.y, { continued: false });
          doc.moveDown(0.5);
          
          doc.fontSize(10).fillColor("#475569").font('Helvetica')
             .text("• Keep original packaging and documentation when possible as they can increase value", 
                   margin + 10, doc.y, { continued: false });
          doc.moveDown(0.5);
        }
        break;
        
      case 'asset-listing':
        // Asset listing is minimal, just showing the items and their values
        // No additional sections beyond the summary and item table
        break;
    }
    
    // Add market research if available
    if (data.type === "custom" && data.customData) {
      // For custom reports, add market research from the main product
      if (data.customData.mainProduct.marketResearch && 
          data.customData.mainProduct.marketResearch.sources) {
        doc.addPage();
        addSectionDivider(doc, "Market Research");
        
        // Add market trend information
        const marketResearch = data.customData.mainProduct.marketResearch;
        doc.fontSize(14).fillColor("#23395d")
           .text(`Market Trend: ${marketResearch.marketTrend || 'Unknown'}`, { align: "left" });
        doc.moveDown(0.5);
        
        // Add price range information
        const currencySymbol = data.options?.currency === 'CAD' ? 'CA$' : '$';
        doc.fontSize(12).fillColor("#374151")
           .text(`Average Market Price: ${currencySymbol}${marketResearch.averagePrice?.toLocaleString() || '0'}`, { align: "left" });
        doc.moveDown(0.25);
        
        doc.fontSize(12).fillColor("#374151")
           .text(`Price Range: ${currencySymbol}${marketResearch.priceRange?.min?.toLocaleString() || '0'} - ${currencySymbol}${marketResearch.priceRange?.max?.toLocaleString() || '0'}`, { align: "left" });
        doc.moveDown(1);
        
        // Add sources
        addSources(doc, marketResearch.sources);
      }
    } else if (data.marketResearch && data.marketResearch.sources) {
      doc.addPage();
      addSources(doc, data.marketResearch.sources);
    }
    
    // Completely remove any page switching to avoid errors
    // We'll just let PDFKit handle the pages naturally

    doc.end();
    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => resolve({ filePath: outputPath, fileName: filename }));
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
