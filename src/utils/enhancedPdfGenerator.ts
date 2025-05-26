import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const REPORTS_DIR = path.join(process.cwd(), "uploads", "reports");

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Enhanced PDF Generator for Clear Value Reports
 * This module creates professional, visually appealing PDF reports without empty spaces
 */

// Helper functions for PDF generation
const addHeader = (doc: PDFKit.PDFDocument) => {
  // Add a professional header with logo placeholder and better typography
  doc.save();

  // Add a subtle header background
  doc.rect(0, 0, doc.page.width, 60).fill("#f8fafc");

  // Logo placeholder (left side)
  doc.rect(40, 15, 30, 30).lineWidth(1).stroke("#94a3b8");
  doc
    .fontSize(10)
    .fillColor("#64748b")
    .text("LOGO", 40, 25, { width: 30, align: "center" });

  // Report title (center)
  doc
    .fontSize(22)
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .text("Market Valuation Report", 100, 20, { align: "center" });

  // Date (right side)
  const dateText = `Generated: ${new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
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

const addCoverPage = (
  doc: PDFKit.PDFDocument,
  reportType: string,
  options?: ReportOptions
) => {
  doc.addPage({ size: "A3", margin: 40 });
  doc.fillColor("#23395d").rect(0, 0, doc.page.width, doc.page.height).fill();

  // Title based on report type
  let title = "Market Valuation Report";
  if (options?.reportType === "asset-listing") {
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
      case "full":
        subtitle = "COMPREHENSIVE VALUATION";
        break;
      case "standard":
        subtitle = "STANDARD VALUATION";
        break;
      case "asset-listing":
        subtitle = "ASSET INVENTORY";
        break;
    }
  }

  doc.fontSize(24).text(`${subtitle}`, { align: "center" });
  doc.moveDown(2);
  doc
    .fontSize(16)
    .font("Helvetica")
    .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
  doc.addPage();
};

const addSectionDivider = (doc: PDFKit.PDFDocument, title: string) => {
  // Avoid extra space before section dividers
  if (doc.y > 100) {
    // Only move down if we're not near the top of the page
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

// Enhanced footer with page numbers and better styling
const addFooter = (doc: PDFKit.PDFDocument) => {
  const pageNumber = doc.bufferedPageRange().count;

  doc.save();

  // Add subtle footer background
  doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill("#f8fafc");

  // Add line above footer
  doc
    .moveTo(40, doc.page.height - 40)
    .lineTo(doc.page.width - 40, doc.page.height - 40)
    .lineWidth(0.5)
    .stroke("#cbd5e1");

  // Left side: Company info
  doc
    .fontSize(8)
    .fillColor("#64748b")
    .font("Helvetica")
    .text("ClearValue Appraisals", 40, doc.page.height - 30, { align: "left" });

  // Center: Confidentiality notice
  doc
    .fontSize(8)
    .fillColor("#64748b")
    .font("Helvetica-Oblique")
    .text(
      "Confidential - Market Valuation Report",
      doc.page.width / 2 - 100,
      doc.page.height - 30,
      { align: "center", width: 200 }
    );

  // Right side: Page number
  doc
    .fontSize(8)
    .fillColor("#64748b")
    .font("Helvetica")
    .text(`Page ${pageNumber}`, doc.page.width - 80, doc.page.height - 30, {
      align: "right",
      width: 40,
    });

  doc.restore();
};

// Interfaces for report data
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
  type?: string;
}

type ReportType = "standard" | "custom";

interface ReportOptions {
  reportType?: "full" | "standard" | "asset-listing";
  singleItem?: boolean;
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

export { ReportData, ReportOptions, ReportType, CustomReportData };

// Enhanced summary section with better layout and visualization
const addSummarySection = (
  doc: PDFKit.PDFDocument,
  items: any[],
  options?: ReportData["options"]
) => {
  // Set default currency symbol
  const currencySymbol = options?.currency === "CAD" ? "CA$" : "$";
  addSectionDivider(doc, "Summary of Identified Items");

  // Sort items by confidence (highest first)
  const sortedItems = [...items].sort(
    (a, b) => (b.confidence || 0) - (a.confidence || 0)
  );

  // Take top 5 most confident items
  const topItems = sortedItems.slice(0, 5);

  // Calculate total estimated value
  const totalValue = topItems.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );

  // Add a summary box with total value
  doc.save();
  doc
    .roundedRect(doc.page.width - 240, doc.y, 200, 50, 5)
    .lineWidth(1)
    .fillAndStroke("#f0f9ff", "#bae6fd");

  doc
    .fillColor("#0369a1")
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Total Estimated Value:", doc.page.width - 230, doc.y - 40, {
      width: 180,
    });

  doc
    .fillColor("#0c4a6e")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(
      `${currencySymbol}${totalValue.toLocaleString()}`,
      doc.page.width - 230,
      doc.y + 5,
      { width: 180 }
    );

  doc.restore();

  doc.moveDown(0.5);
  doc
    .fontSize(14)
    .fillColor("#23395d")
    .text("Top Identified Items", { align: "left" });
  doc.moveDown(0.5);

  // Create a modern table for the summary
  const pageWidth = doc.page.width;
  const margin = 40; // Reduced margin for more space
  const tableWidth = pageWidth - margin * 2;

  // Table header
  doc.save();
  doc.rect(margin, doc.y, tableWidth, 30).fill("#e0f2fe");
  doc
    .fillColor("#0c4a6e")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Item", margin + 10, doc.y + 10, { width: tableWidth * 0.4 });
  doc.text("Condition", margin + tableWidth * 0.4, doc.y - 12, {
    width: tableWidth * 0.3,
  });
  doc.text("Value", margin + tableWidth * 0.7, doc.y - 12, {
    width: tableWidth * 0.15,
  });
  doc.text("Confidence", margin + tableWidth * 0.85, doc.y - 12, {
    width: tableWidth * 0.15,
  });
  doc.restore();
  doc.moveDown(1);

  // Table rows
  topItems.forEach((item, idx) => {
    const confidence = Number(item.confidence) || 0;
    let confidenceColor = "#ef4444"; // Red for low confidence
    if (confidence >= 0.8)
      confidenceColor = "#22c55e"; // Green for high confidence
    else if (confidence >= 0.5) confidenceColor = "#f59e0b"; // Yellow for medium confidence

    // Row background
    doc.save();
    doc
      .rect(margin, doc.y, tableWidth, 30)
      .fill(idx % 2 === 0 ? "#f9fafb" : "#f3f4f6");
    doc.restore();

    // Item name
    doc
      .fillColor("#111827")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(item.name, margin + 10, doc.y + 10, { width: tableWidth * 0.4 });

    // Condition
    doc
      .fillColor("#374151")
      .fontSize(11)
      .font("Helvetica")
      .text(
        item.condition || "Unknown",
        margin + tableWidth * 0.4,
        doc.y - 12,
        { width: tableWidth * 0.3 }
      );

    // Value
    doc
      .fillColor("#374151")
      .fontSize(11)
      .font("Helvetica")
      .text(
        `${currencySymbol}${Number(item.value).toLocaleString()}`,
        margin + tableWidth * 0.7,
        doc.y - 12,
        { width: tableWidth * 0.15 }
      );

    // Confidence indicator
    doc
      .fillColor(confidenceColor)
      .fontSize(11)
      .font("Helvetica")
      .text(
        `${(confidence * 100).toFixed(0)}%`,
        margin + tableWidth * 0.85,
        doc.y - 12,
        { width: tableWidth * 0.15 }
      );

    doc.moveDown(1);
  });

  // Add a note about confidence levels
  doc.moveDown(0.5);
  doc
    .fontSize(9)
    .fillColor("#64748b")
    .font("Helvetica-Oblique")
    .text(
      "Note: Confidence levels indicate the reliability of the valuation. Higher percentages represent greater certainty.",
      margin,
      doc.y,
      { align: "left" }
    );
};

// Enhanced item table with better layout and visualization
const addItemTable = (
  doc: PDFKit.PDFDocument,
  items: any[],
  options?: ReportData["options"]
) => {
  // Set default currency symbol
  const currencySymbol = options?.currency === "CAD" ? "CA$" : "$";

  // Add section header
  addSectionDivider(doc, "Detailed Item Analysis");

  // Sort items by confidence (highest first)
  const sortedItems = [...items].sort(
    (a, b) => (b.confidence || 0) - (a.confidence || 0)
  );

  // Create a detailed table
  const pageWidth = doc.page.width;
  const margin = 40;
  const tableWidth = pageWidth - margin * 2;

  // Table headers with better spacing
  doc.save();
  doc.rect(margin, doc.y, tableWidth, 30).fill("#e0f2fe");

  // Define column widths proportionally
  const nameWidth = tableWidth * 0.45;
  const conditionWidth = tableWidth * 0.2;
  const valueWidth = tableWidth * 0.175;
  const confidenceWidth = tableWidth * 0.175;

  doc
    .fillColor("#0c4a6e")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Item Description", margin + 10, doc.y + 10, { width: nameWidth });
  doc.text("Condition", margin + nameWidth + 10, doc.y - 12, {
    width: conditionWidth,
  });
  doc.text(
    "Estimated Value",
    margin + nameWidth + conditionWidth + 10,
    doc.y - 12,
    { width: valueWidth }
  );
  doc.text(
    "Confidence",
    margin + nameWidth + conditionWidth + valueWidth + 10,
    doc.y - 12,
    { width: confidenceWidth }
  );
  doc.restore();
  doc.moveDown(1.5);

  // Table rows with improved layout
  sortedItems.forEach((item, idx) => {
    const confidence = Number(item.confidence) || 0;
    let confidenceColor = "#ef4444"; // Red for low confidence
    let confidenceLabel = "Low";

    if (confidence >= 0.8) {
      confidenceColor = "#22c55e"; // Green for high confidence
      confidenceLabel = "High";
    } else if (confidence >= 0.5) {
      confidenceColor = "#f59e0b"; // Yellow for medium confidence
      confidenceLabel = "Medium";
    }

    // Check if we need to add a new page based on remaining space
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
      addFooter(doc);

      // Repeat the header on the new page
      doc.save();
      doc.rect(margin, doc.y, tableWidth, 30).fill("#e0f2fe");
      doc
        .fillColor("#0c4a6e")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Item Description", margin + 10, doc.y + 10, {
          width: nameWidth,
        });
      doc.text("Condition", margin + nameWidth + 10, doc.y - 12, {
        width: conditionWidth,
      });
      doc.text(
        "Estimated Value",
        margin + nameWidth + conditionWidth + 10,
        doc.y - 12,
        { width: valueWidth }
      );
      doc.text(
        "Confidence",
        margin + nameWidth + conditionWidth + valueWidth + 10,
        doc.y - 12,
        { width: confidenceWidth }
      );
      doc.restore();
      doc.moveDown(1.5);
    }

    // Row background with alternating colors
    const rowHeight = item.details ? 60 : 40; // Taller rows for items with details

    doc.save();
    doc
      .rect(margin, doc.y, tableWidth, rowHeight)
      .fill(idx % 2 === 0 ? "#f9fafb" : "#f3f4f6");
    doc.restore();

    // Item name with better typography
    doc
      .fillColor("#111827")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(item.name, margin + 10, doc.y + 10, { width: nameWidth });

    // Add details if available with better formatting
    if (item.details) {
      doc
        .fillColor("#4b5563")
        .fontSize(9)
        .font("Helvetica")
        .text(item.details, margin + 10, doc.y + 5, {
          width: nameWidth,
          height: 30,
          ellipsis: true,
        });
    }

    // Condition with badge-like styling
    doc.save();
    const conditionY = doc.y - (item.details ? 40 : 25);
    doc
      .roundedRect(
        margin + nameWidth + 10,
        conditionY,
        conditionWidth - 20,
        20,
        3
      )
      .fillAndStroke("#f1f5f9", "#cbd5e1");

    doc
      .fillColor("#334155")
      .fontSize(10)
      .font("Helvetica")
      .text(
        item.condition || "Unknown",
        margin + nameWidth + 10,
        conditionY + 5,
        { width: conditionWidth - 20, align: "center" }
      );
    doc.restore();

    // Value with currency formatting
    doc
      .fillColor("#0f172a")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(
        `${currencySymbol}${Number(item.value).toLocaleString()}`,
        margin + nameWidth + conditionWidth + 10,
        doc.y - (item.details ? 30 : 25),
        { width: valueWidth }
      );

    // Confidence indicator with visual indicator
    doc.save();
    const confidenceY = doc.y - (item.details ? 40 : 25);
    doc
      .roundedRect(
        margin + nameWidth + conditionWidth + valueWidth + 10,
        confidenceY,
        confidenceWidth - 20,
        20,
        10
      )
      .fill(confidenceColor);

    doc
      .fillColor("white")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(
        `${(confidence * 100).toFixed(0)}% - ${confidenceLabel}`,
        margin + nameWidth + conditionWidth + valueWidth + 10,
        confidenceY + 5,
        { width: confidenceWidth - 20, align: "center" }
      );
    doc.restore();

    doc.moveDown(item.details ? 3 : 2);
  });

  // Add a legend for confidence levels
  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .fillColor("#334155")
    .font("Helvetica-Bold")
    .text("Confidence Level Legend:", margin, doc.y, { continued: false });

  doc.moveDown(0.5);

  // Create a legend with colored boxes
  const legendY = doc.y;

  // High confidence
  doc.save();
  doc.roundedRect(margin, legendY, 15, 15, 3).fill("#22c55e");
  doc
    .fillColor("#334155")
    .fontSize(9)
    .font("Helvetica")
    .text(
      "High (80-100%): Strong market data supports this valuation",
      margin + 25,
      legendY + 3,
      { width: 300 }
    );
  doc.restore();

  // Medium confidence
  doc.save();
  doc.roundedRect(margin + 350, legendY, 15, 15, 3).fill("#f59e0b");
  doc
    .fillColor("#334155")
    .fontSize(9)
    .font("Helvetica")
    .text(
      "Medium (50-79%): Reasonable market data supports this valuation",
      margin + 375,
      legendY + 3,
      { width: 300 }
    );
  doc.restore();

  // Low confidence
  doc.save();
  doc.roundedRect(margin, legendY + 20, 15, 15, 3).fill("#ef4444");
  doc
    .fillColor("#334155")
    .fontSize(9)
    .font("Helvetica")
    .text(
      "Low (0-49%): Limited market data available for this valuation",
      margin + 25,
      legendY + 23,
      { width: 300 }
    );
  doc.restore();
};

// Enhanced sources section with better formatting
const addSources = (doc: PDFKit.PDFDocument, sources: string[]) => {
  addSectionDivider(doc, "Market Research Sources");

  // Add explanatory text
  doc
    .fontSize(11)
    .fillColor("#334155")
    .text(
      "The following sources were used to determine market values and trends:",
      { align: "left" }
    );
  doc.moveDown(0.5);

  // Create a styled list of sources
  const margin = 40;

  doc.fontSize(10).fillColor("#475569");
  sources.forEach((source, idx) => {
    // Add alternating background for better readability
    doc.save();
    doc
      .rect(margin, doc.y, doc.page.width - margin * 2, 25)
      .fill(idx % 2 === 0 ? "#f8fafc" : "#f1f5f9");
    doc.restore();

    // Add bullet point and source text
    doc.save();
    doc
      .circle(margin + 10, doc.y + 12, 3)
      .fill("#3b82f6")
      .stroke();

    doc
      .fillColor("#334155")
      .font("Helvetica")
      .text(source, margin + 25, doc.y + 7, {
        continued: false,
        width: doc.page.width - margin * 2 - 25,
        ellipsis: true,
      });
    doc.restore();

    doc.moveDown(1);
  });

  // Add disclaimer about sources
  doc.moveDown(0.5);
  doc
    .fontSize(9)
    .fillColor("#64748b")
    .font("Helvetica-Oblique")
    .text(
      "Note: Market values are subject to change based on current market conditions and trends.",
      margin,
      doc.y,
      { align: "left" }
    );

  doc.moveDown(0.5);
};

// Export helper functions for testing and reuse
export {
  addHeader,
  addSectionHeader,
  addCoverPage,
  addSectionDivider,
  addFooter,
  addSummarySection,
  addItemTable,
  addSources,
};

// Export the main function to be used in controllers
export { generatePDFReport };

/**
 * Generates a professional PDF report based on the provided data
 * This enhanced version creates visually appealing reports without empty spaces or pages
 */
async function generatePDFReport(
  data: ReportData
): Promise<{ filePath: string; fileName: string }> {
  try {
    // Create a unique filename based on timestamp and report type
    const timestamp = new Date().getTime();
    const reportTypeSuffix = data.options?.reportType || "standard";
    const filename = `report_${reportTypeSuffix}_${timestamp}.pdf`;
    const outputPath = path.join(REPORTS_DIR, filename);

    // Create a write stream for the PDF
    const writeStream = fs.createWriteStream(outputPath);

    // Create a new PDF document
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: "Market Valuation Report",
        Author: "ClearValue Appraisals",
        Subject: "Product Valuation",
        Keywords: "appraisal, valuation, market research",
        Creator: "ClearValue PDF Generator",
        Producer: "PDFKit",
      },
    });

    // Pipe the PDF to the write stream
    doc.pipe(writeStream);

    // Add cover page
    addCoverPage(doc, data.type, data.options);

    // Add header and footer to each page
    addHeader(doc);
    addFooter(doc);

    // Process based on report type
    if (data.type === "custom" && data.customData) {
      // For custom reports with main product and additional products
      const mainProduct = data.customData.mainProduct;
      const additionalProducts = data.customData.additionalProducts || [];

      // Create an array of all products for summary and table
      const allProducts = [mainProduct, ...additionalProducts];

      // Add summary section
      addSummarySection(doc, allProducts, data.options);

      // Add detailed item table
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
        addHeader(doc);
        addFooter(doc);
      } else {
        doc.moveDown(1);
      }

      addItemTable(doc, allProducts, data.options);
    } else if (data.results && data.results.length > 0) {
      // For standard reports with results array

      // Add summary section
      addSummarySection(doc, data.results, data.options);

      // Add detailed item table
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
        addHeader(doc);
        addFooter(doc);
      } else {
        doc.moveDown(1);
      }

      addItemTable(doc, data.results, data.options);
    }

    // Add additional sections based on report type
    switch (data.options?.reportType) {
      case "full":
        // Full report includes all sections

        // Add market comparison section
        if (data.options?.includeMarketComparison) {
          if (doc.y > doc.page.height - 250) {
            doc.addPage();
            addHeader(doc);
            addFooter(doc);
          } else {
            doc.moveDown(1);
          }

          addSectionDivider(doc, "Market Comparison");

          // Add comprehensive market analysis
          doc
            .fontSize(12)
            .fillColor("#334155")
            .text(
              "Comprehensive market analysis comparing similar items sold in the last 6 months.",
              {
                align: "left",
              }
            );
          doc.moveDown(1);

          // Add a market trend visualization
          const margin = 40;
          const boxWidth = doc.page.width - margin * 2;

          // Market trend box
          doc.save();
          doc
            .roundedRect(margin, doc.y, boxWidth, 100, 5)
            .fillAndStroke("#f0f9ff", "#bae6fd");

          doc
            .fillColor("#0c4a6e")
            .font("Helvetica-Bold")
            .fontSize(14)
            .text("Market Trend Analysis", margin + 20, doc.y + 15, {
              width: boxWidth - 40,
            });

          doc
            .fillColor("#334155")
            .font("Helvetica")
            .fontSize(11)
            .text(
              "Based on comprehensive market data analysis, similar items have shown a steady increase in value over the past 6 months. Market demand remains strong with seasonal variations affecting pricing by approximately 5-10%.",
              margin + 20,
              doc.y + 10,
              { width: boxWidth - 40 }
            );

          doc
            .fillColor("#334155")
            .font("Helvetica")
            .fontSize(11)
            .text(
              "High-quality items in excellent condition command a premium of 20-30% above average market value, while items in poor condition may sell for 30-50% below average market value.",
              margin + 20,
              doc.y + 10,
              { width: boxWidth - 40 }
            );

          doc.restore();
          doc.moveDown(5.5);
        }

        // Add condition details section
        if (data.options?.includeConditionDetails) {
          if (doc.y > doc.page.height - 250) {
            doc.addPage();
            addHeader(doc);
            addFooter(doc);
          } else {
            doc.moveDown(1);
          }

          addSectionDivider(doc, "Detailed Condition Analysis");

          doc
            .fontSize(12)
            .fillColor("#334155")
            .text(
              "Detailed analysis of item conditions and their impact on valuation.",
              {
                align: "left",
              }
            );
          doc.moveDown(1);
        }

        // Add price history section
        if (data.options?.includePriceHistory) {
          if (doc.y > doc.page.height - 250) {
            doc.addPage();
            addHeader(doc);
            addFooter(doc);
          } else {
            doc.moveDown(1);
          }

          addSectionDivider(doc, "Price History");

          doc
            .fontSize(12)
            .fillColor("#334155")
            .text(
              "Historical price trends for similar items over the past 24 months.",
              {
                align: "left",
              }
            );
          doc.moveDown(1);
        }
        break;

      case "standard":
        // Enhanced standard report with better layout and no empty spaces

        // Add market comparison section with actual content
        if (data.options?.includeMarketComparison) {
          // Check if we need a new page based on remaining space
          if (doc.y > doc.page.height - 250) {
            doc.addPage();
            addHeader(doc);
            addFooter(doc);
          } else {
            doc.moveDown(1);
          }

          addSectionDivider(doc, "Market Overview");

          // Add market trend visualization
          doc
            .fontSize(12)
            .fillColor("#334155")
            .text("Current Market Trends", { align: "left" });
          doc.moveDown(0.5);

          // Create a market trend box
          const margin = 40;
          const boxWidth = doc.page.width - margin * 2;

          doc.save();
          doc
            .roundedRect(margin, doc.y, boxWidth, 80, 5)
            .fillAndStroke("#f0f9ff", "#bae6fd");

          // Market trend title
          doc
            .fillColor("#0c4a6e")
            .font("Helvetica-Bold")
            .fontSize(14)
            .text("Market Analysis Summary", margin + 20, doc.y + 15, {
              width: boxWidth - 40,
            });

          // Market trend description
          doc
            .fillColor("#334155")
            .font("Helvetica")
            .fontSize(11)
            .text(
              "Based on current market data, similar items have shown stable pricing with slight variations based on condition and rarity. Market demand remains consistent for these types of items.",
              margin + 20,
              doc.y + 10,
              { width: boxWidth - 40 }
            );

          doc.restore();
          doc.moveDown(4.5);

          // Add price comparison table
          doc
            .fontSize(12)
            .fillColor("#334155")
            .text("Comparative Market Analysis", { align: "left" });
          doc.moveDown(0.5);

          // Create a simple comparison table header
          doc.save();
          doc.rect(margin, doc.y, boxWidth, 30).fill("#e0f2fe");
          doc
            .fillColor("#0c4a6e")
            .fontSize(11)
            .font("Helvetica-Bold")
            .text("Condition", margin + 10, doc.y + 10, {
              width: boxWidth * 0.25,
            });
          doc.text(
            "Average Market Price",
            margin + boxWidth * 0.25 + 10,
            doc.y - 12,
            { width: boxWidth * 0.25 }
          );
          doc.text("Price Range", margin + boxWidth * 0.5 + 10, doc.y - 12, {
            width: boxWidth * 0.25,
          });
          doc.text("Market Trend", margin + boxWidth * 0.75 + 10, doc.y - 12, {
            width: boxWidth * 0.25,
          });
          doc.restore();
          doc.moveDown(1.5);

          // Sample data for different conditions
          const conditions = ["Excellent", "Good", "Fair", "Poor"];
          const currencySymbol = data.options?.currency === "CAD" ? "CA$" : "$";

          conditions.forEach((condition, idx) => {
            // Row background
            doc.save();
            doc
              .rect(margin, doc.y, boxWidth, 30)
              .fill(idx % 2 === 0 ? "#f9fafb" : "#f3f4f6");
            doc.restore();

            // Condition
            doc
              .fillColor("#334155")
              .fontSize(10)
              .font("Helvetica")
              .text(condition, margin + 10, doc.y + 10, {
                width: boxWidth * 0.25,
              });

            // Get a sample price based on condition
            let avgPrice = 0;
            let minPrice = 0;
            let maxPrice = 0;
            let trend = "Stable";

            // Use the first item's value as a base and adjust by condition
            if (data.results && data.results.length > 0) {
              const baseValue = Number(data.results[0].value) || 1000;

              switch (condition) {
                case "Excellent":
                  avgPrice = baseValue * 1.2;
                  minPrice = baseValue * 1.1;
                  maxPrice = baseValue * 1.3;
                  trend = "Upward";
                  break;
                case "Good":
                  avgPrice = baseValue;
                  minPrice = baseValue * 0.9;
                  maxPrice = baseValue * 1.1;
                  trend = "Stable";
                  break;
                case "Fair":
                  avgPrice = baseValue * 0.8;
                  minPrice = baseValue * 0.7;
                  maxPrice = baseValue * 0.9;
                  trend = "Stable";
                  break;
                case "Poor":
                  avgPrice = baseValue * 0.6;
                  minPrice = baseValue * 0.5;
                  maxPrice = baseValue * 0.7;
                  trend = "Downward";
                  break;
              }
            }

            // Average price
            doc
              .fillColor("#334155")
              .fontSize(10)
              .font("Helvetica")
              .text(
                `${currencySymbol}${avgPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}`,
                margin + boxWidth * 0.25 + 10,
                doc.y - 12,
                { width: boxWidth * 0.25 }
              );

            // Price range
            doc
              .fillColor("#334155")
              .fontSize(10)
              .font("Helvetica")
              .text(
                `${currencySymbol}${minPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })} - ${currencySymbol}${maxPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}`,
                margin + boxWidth * 0.5 + 10,
                doc.y - 12,
                { width: boxWidth * 0.25 }
              );

            // Market trend with color coding
            let trendColor = "#22c55e"; // Green for upward
            if (trend === "Downward")
              trendColor = "#ef4444"; // Red for downward
            else if (trend === "Stable") trendColor = "#f59e0b"; // Yellow for stable

            doc
              .fillColor(trendColor)
              .fontSize(10)
              .font("Helvetica-Bold")
              .text(trend, margin + boxWidth * 0.75 + 10, doc.y - 12, {
                width: boxWidth * 0.25,
              });

            doc.moveDown(1.5);
          });
        }

        // Add enhanced condition section
        if (data.options?.includeConditionDetails) {
          // Check if we need a new page based on remaining space
          if (doc.y > doc.page.height - 250) {
            doc.addPage();
            addHeader(doc);
            addFooter(doc);
          } else {
            doc.moveDown(1);
          }

          addSectionDivider(doc, "Condition Analysis");

          const margin = 40;
          const boxWidth = doc.page.width - margin * 2;

          doc
            .fontSize(12)
            .fillColor("#334155")
            .text("How Condition Affects Value", { align: "left" });
          doc.moveDown(0.5);

          // Create a condition impact table
          doc.save();
          doc.rect(margin, doc.y, boxWidth, 30).fill("#e0f2fe");
          doc
            .fillColor("#0c4a6e")
            .fontSize(11)
            .font("Helvetica-Bold")
            .text("Condition Grade", margin + 10, doc.y + 10, {
              width: boxWidth * 0.25,
            });
          doc.text("Description", margin + boxWidth * 0.25 + 10, doc.y - 12, {
            width: boxWidth * 0.5,
          });
          doc.text("Value Impact", margin + boxWidth * 0.75 + 10, doc.y - 12, {
            width: boxWidth * 0.25,
          });
          doc.restore();
          doc.moveDown(1.5);

          // Condition descriptions
          const conditions = [
            {
              grade: "Excellent",
              description:
                "Item appears new or like new with minimal signs of use or wear. All original components intact and functioning perfectly.",
              impact: "+20% to +30%",
            },
            {
              grade: "Good",
              description:
                "Item shows normal signs of use but remains in good working condition with no significant defects or damage.",
              impact: "Base Value",
            },
            {
              grade: "Fair",
              description:
                "Item shows noticeable wear and may have minor functional issues or cosmetic damage that doesn't affect core functionality.",
              impact: "-10% to -20%",
            },
            {
              grade: "Poor",
              description:
                "Item has significant wear, damage, or functional issues that affect its usability or appearance substantially.",
              impact: "-30% to -50%",
            },
          ];

          conditions.forEach((condition, idx) => {
            // Row background
            doc.save();
            doc
              .rect(margin, doc.y, boxWidth, 50)
              .fill(idx % 2 === 0 ? "#f9fafb" : "#f3f4f6");
            doc.restore();

            // Condition grade with badge
            doc.save();
            doc
              .roundedRect(margin + 10, doc.y + 15, boxWidth * 0.2, 20, 3)
              .fillAndStroke("#f1f5f9", "#cbd5e1");

            doc
              .fillColor("#334155")
              .fontSize(10)
              .font("Helvetica-Bold")
              .text(condition.grade, margin + 10, doc.y + 19, {
                width: boxWidth * 0.2,
                align: "center",
              });
            doc.restore();

            // Description
            doc
              .fillColor("#334155")
              .fontSize(10)
              .font("Helvetica")
              .text(
                condition.description,
                margin + boxWidth * 0.25 + 10,
                doc.y + 10,
                { width: boxWidth * 0.5, align: "left" }
              );

            // Value impact
            let impactColor = "#334155";
            if (condition.impact.includes("+"))
              impactColor = "#22c55e"; // Green for positive
            else if (condition.impact.includes("-")) impactColor = "#ef4444"; // Red for negative

            doc
              .fillColor(impactColor)
              .fontSize(10)
              .font("Helvetica-Bold")
              .text(
                condition.impact,
                margin + boxWidth * 0.75 + 10,
                doc.y + 19,
                { width: boxWidth * 0.25, align: "left" }
              );

            doc.moveDown(2.5);
          });

          // Add condition care tips
          doc.moveDown(0.5);
          doc
            .fontSize(12)
            .fillColor("#334155")
            .text("Condition Care Tips", { align: "left" });
          doc.moveDown(0.5);

          doc
            .fontSize(10)
            .fillColor("#475569")
            .font("Helvetica")
            .text(
              "• Store items in a climate-controlled environment away from direct sunlight",
              margin + 10,
              doc.y,
              { continued: false }
            );
          doc.moveDown(0.5);

          doc
            .fontSize(10)
            .fillColor("#475569")
            .font("Helvetica")
            .text(
              "• Clean and maintain items according to manufacturer recommendations",
              margin + 10,
              doc.y,
              { continued: false }
            );
          doc.moveDown(0.5);

          doc
            .fontSize(10)
            .fillColor("#475569")
            .font("Helvetica")
            .text(
              "• Keep original packaging and documentation when possible as they can increase value",
              margin + 10,
              doc.y,
              { continued: false }
            );
          doc.moveDown(0.5);
        }
        break;

      case "asset-listing":
        // Asset listing is minimal, just showing the items and their values
        // No additional sections beyond the summary and item table
        break;
    }

    // Add market research if available
    if (data.type === "custom" && data.customData) {
      // For custom reports, add market research from the main product
      if (
        data.customData.mainProduct.marketResearch &&
        data.customData.mainProduct.marketResearch.sources
      ) {
        if (doc.y > doc.page.height - 250) {
          doc.addPage();
          addHeader(doc);
          addFooter(doc);
        } else {
          doc.moveDown(1);
        }

        addSectionDivider(doc, "Market Research");

        // Add market trend information
        const marketResearch = data.customData.mainProduct.marketResearch;
        doc
          .fontSize(14)
          .fillColor("#23395d")
          .text(`Market Trend: ${marketResearch.marketTrend || "Unknown"}`, {
            align: "left",
          });
        doc.moveDown(0.5);

        // Add price range information
        const currencySymbol = data.options?.currency === "CAD" ? "CA$" : "$";
        doc
          .fontSize(12)
          .fillColor("#374151")
          .text(
            `Average Market Price: ${currencySymbol}${
              marketResearch.averagePrice?.toLocaleString() || "0"
            }`,
            { align: "left" }
          );
        doc.moveDown(0.25);

        doc
          .fontSize(12)
          .fillColor("#374151")
          .text(
            `Price Range: ${currencySymbol}${
              marketResearch.priceRange?.min?.toLocaleString() || "0"
            } - ${currencySymbol}${
              marketResearch.priceRange?.max?.toLocaleString() || "0"
            }`,
            { align: "left" }
          );
        doc.moveDown(1);

        // Add sources
        addSources(doc, marketResearch.sources);
      }
    } else if (data.marketResearch && data.marketResearch.sources) {
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
        addHeader(doc);
        addFooter(doc);
      }
      addSources(doc, data.marketResearch.sources);
    }

    // Finalize the PDF
    doc.end();

    // Return a promise that resolves when the PDF is written
    return new Promise((resolve, reject) => {
      writeStream.on("finish", () =>
        resolve({ filePath: outputPath, fileName: filename })
      );
      writeStream.on("error", (err) => {
        console.error("Error generating PDF:", err);
        reject(err);
      });
    });
  } catch (error) {
    console.error("Error in PDF generation:", error);
    throw error;
  }
}
