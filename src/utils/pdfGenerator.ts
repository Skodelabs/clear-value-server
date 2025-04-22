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

const addFooter = (doc: PDFKit.PDFDocument) => {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(10)
      .fillColor("#999")
      .text(`Page ${i + 1} of ${range.count}`, 0, doc.page.height - 30, {
        align: "center",
      });
  }
};

const addItemTable = (doc: PDFKit.PDFDocument, items: any[]) => {
  const pageWidth = doc.page.width;
  const margin = 60; // Enhanced margin
  const tableWidth = pageWidth - margin * 2;
  const colWidths = [0.08, 0.24, 0.48, 0.2];
  const colPositions = [
    margin,
    margin + tableWidth * colWidths[0],
    margin + tableWidth * (colWidths[0] + colWidths[1]),
    margin + tableWidth * (colWidths[0] + colWidths[1] + colWidths[2]),
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
  doc.text('Price', colPositions[3], y + 9, { width: tableWidth * colWidths[3], align: 'right' });
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
    doc.text(`$${item.value?.toLocaleString() || '0'}`, colPositions[3], y + 8, { width: tableWidth * colWidths[3], align: 'right' });
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
  doc.text('Total', colPositions[0], y + 9, { width: tableWidth * (colWidths[0] + colWidths[1] + colWidths[2]), align: 'right' });
  doc.text(`$${total.toLocaleString()}`, colPositions[3], y + 9, { width: tableWidth * colWidths[3], align: 'right' });
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
}

export const generatePDFReport = async (data: ReportData): Promise<string> => {
  try {
    const doc = new PDFDocument({
      size: "A3",
      margin: 40,
      autoFirstPage: false,
    });
    const outputPath = path.join(
      REPORTS_DIR,
      `${Date.now()}_${data.type}_report.pdf`
    );
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Only add a single page with a table for all items from all images
    doc.addPage({ size: "A3", margin: 40 });

    // Gather all items from all images
    let allItems: any[] = [];
    if (Array.isArray(data.results)) {
      data.results.forEach((imgResult: any) => {
        if (
          imgResult.aiValuation &&
          Array.isArray(imgResult.aiValuation.items)
        ) {
          allItems = allItems.concat(
            imgResult.aiValuation.items.map((item: any) => ({
              ...item,
              // Only object name, no filename prefix
              name: item.name,
            }))
          );
        }
      });
    }
    addItemTable(doc, allItems);

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
