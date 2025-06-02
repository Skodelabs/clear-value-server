import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { ReportData, ReportOptions, ReportItem, REPORTS_DIR } from "./pdfGeneratorCommon";

// Helper function to get the report title
const getReportTitle = (options: ReportOptions): string => {
  return options.title || "Comprehensive Appraisal Report";
};

// Helper function to get the introduction text
const getIntroductionText = (options: ReportOptions): string => {
  return options.introText || `
    <p>This comprehensive appraisal report has been prepared for ${options.clientName || "the client"} 
    to provide a detailed valuation of the items listed herein. The appraisal was conducted 
    according to industry standards and best practices.</p>
    <p>Each item has been carefully evaluated based on its condition, market value, 
    and other relevant factors. The total valuation represents our professional assessment 
    as of the report date.</p>
  `;
};

// Main function to generate the HTML content for the report
const generateMainReportHtml = (title: string, introText: string, items: ReportItem[], options: ReportOptions): string => {
  // Calculate total value
  const total = items.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price : 0), 0);
  
  // Set currency symbol based on options
  const currencySymbol = options.currency === 'CAD' ? 'CA$' : '$';
  
  // Format report date
  const reportDate = options.reportDate || new Date().toLocaleDateString();
  
  // Set logo URL with fallback
  const logoUrl = options.logoUrl ? 
    (options.logoUrl.startsWith('http') ? options.logoUrl : `${process.env.BASE_URL || 'http://localhost:5000'}${options.logoUrl}`) : 
    `${process.env.BASE_URL || 'http://localhost:5000'}/companylogo.jpg`;
  
  // Return the complete HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Roboto', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #fff;
      padding: 20mm;
      position: relative;
    }
    
    /* Watermark styling */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      opacity: 0.35;
      font-size: 200px;
      font-weight: bold;
      font-family: Arial, sans-serif;
      z-index: -1;
      white-space: nowrap;
    }
    
    .watermark .black {
      color: #000;
    }
    
    .watermark .red {
      color: #c41e3a;
    }
    
    /* Background logo styling */
    .background-logo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.1;
      max-width: 80%;
      max-height: 80%;
      z-index: -2;
    }
    
    /* Header styling */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ddd;
    }
    
    .header .logo {
      height: 60px;
      width: auto;
    }
    
    .header h1 {
      font-size: 24px;
      color: #333;
    }
    
    .report-info {
      text-align: right;
      font-size: 14px;
    }
    
    /* Introduction styling */
    .introduction {
      margin-bottom: 30px;
      text-align: justify;
    }
    
    /* Section title styling */
    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin: 20px 0 10px;
      color: #333;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    
    /* Table styling */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      table-layout: fixed;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
      vertical-align: middle;
      word-wrap: break-word;
    }
    
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    /* Total row styling */
    .total-row {
      background-color: #c41e3a !important;
      color: white;
      font-weight: bold;
      border-top: 2px solid #000;
    }
    
    .total-row td {
      border-color: #a51a30;
    }
    
    /* Text alignment classes */
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    /* Footer styling */
    .footer {
      margin-top: 40px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    
    /* Print-specific styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Background Logo (Faded) -->
  <img src="${logoUrl}" class="background-logo" alt="Background Logo">
  
  <!-- McD Watermark -->
  <div class="watermark">
    <span class="black">M</span><span class="red">c</span><span class="black">D</span>
  </div>
  
  <!-- Header -->
  <div class="header">
    <img src="${logoUrl}" class="logo" alt="Company Logo">
    <h1>${title}</h1>
    <div class="report-info">
      Report Date: ${reportDate}<br>
      ${options.clientName || options.appraiserCompany || "Clear Value Appraisals"}
    </div>
  </div>
  
  <!-- Introduction -->
  <div class="introduction">
    ${introText}
  </div>
  
  <!-- Additional Report Information -->
  <div class="section-title">Report Information</div>
  <table>
    <tr>
      <td><strong>Client Name:</strong></td>
      <td>${options.clientName || "N/A"}</td>
      <td><strong>Appraiser:</strong></td>
      <td>${options.appraiserName || "N/A"}</td>
    </tr>
    <tr>
      <td><strong>Effective Date:</strong></td>
      <td>${options.effectiveDate || reportDate}</td>
      <td><strong>Appraisal Company:</strong></td>
      <td>${options.appraiserCompany || "Clear Value Appraisals"}</td>
    </tr>
    <tr>
      <td><strong>Appraisal Purpose:</strong></td>
      <td>${options.appraisalPurpose || "Valuation"}</td>
      <td><strong>Valuation Method:</strong></td>
      <td>${options.valuationMethod || "Market Comparison"}</td>
    </tr>
  </table>
  
  <!-- Items Table -->
  <div class="section-title">Item Inventory</div>
  <table>
    <thead>
      <tr>
        <th style="width: 5%">ID</th>
        <th style="width: 35%">Description</th>
        <th style="width: 20%">Condition</th>
        <th style="width: 15%" class="text-right">Price</th>
        <th style="width: 25%">Image</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item, index) => {
        const price = typeof item.price === 'number' ? item.price : 0;
        const repairCost = typeof item.repairCost === 'number' ? item.repairCost : 0;
        return `
        <tr>
          <td>${item.id || index + 1}</td>
          <td>${item.description || item.name || ""}</td>
          <td>${item.condition || ""}</td>
          <td class="text-right">${currencySymbol}${price.toLocaleString()}</td>
          <td>${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="max-width: 100%; max-height: 80px;">` : 'No image'}</td>
        </tr>
        `;
      }).join('')}
      <!-- Total Value Row -->
      <tr class="total-row">
        <td colspan="3" class="text-right"><strong>TOTAL VALUE</strong></td>
        <td class="text-right"><strong>${currencySymbol}${total.toLocaleString()}</strong></td>
        <td></td>
      </tr>
    </tbody>
  </table>
  
  <!-- Market Analysis Section -->
  ${options.marketAnalysis ? `
  <div class="section-title">Market Analysis</div>
  <div class="introduction">
    ${options.marketAnalysis}
  </div>
  ` : ''}
  
  <!-- Footer -->
  <div class="footer">
    <p>This report was generated by ${options.clientName || options.appraiserCompany || "Clear Value Appraisals"} on ${reportDate}</p>
    <p>© ${new Date().getFullYear()} ${options.clientName || options.appraiserCompany || "Clear Value Appraisals"}. All rights reserved.</p>
  </div>
</body>
</html>`;
};

// Generate a main (comprehensive) report with detailed analysis using puppeteer and inline HTML
export const generateMainReport = async (
  data: ReportData
): Promise<{ filePath: string; fileName: string }> => {
  try {
    // Generate HTML content
    const title = getReportTitle(data.options);
    const introText = getIntroductionText(data.options);
    const htmlContent = generateMainReportHtml(title, introText, data.items, data.options);
    
    // Create a temporary HTML file
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempId = uuidv4();
    const tempHtmlPath = path.join(tempDir, `main-report-${tempId}.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent);
    
    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    const page = await browser.newPage();
    await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
    
    // Set up PDF output path
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    // Generate PDF filename with appropriate prefix
    const timestamp = new Date().getTime();
    const reportType = data.options.subType || 'main';
    const filename = `${reportType}_report_${timestamp}.pdf`;
    const outputPath = path.join(REPORTS_DIR, filename);
    
    console.log(`Generating main report PDF at: ${outputPath}`);
    
    // Generate PDF with A4 size
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });
    
    await browser.close();
    
    // Delete temporary HTML file
    fs.unlinkSync(tempHtmlPath);
    
    console.log(`Main report PDF generated successfully at: ${outputPath}`);
    return { filePath: outputPath, fileName: filename };
  } catch (error) {
    console.error("Error in main PDF generation:", error);
    throw error;
  }
};
