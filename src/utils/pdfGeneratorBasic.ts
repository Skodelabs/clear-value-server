import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ReportData, ReportOptions, REPORTS_DIR } from "./pdfGeneratorCommon";

// Generate a basic report with a simple table of items using Puppeteer and HTML
export const generateBasicReport = async (
  data: ReportData
): Promise<{ filePath: string; fileName: string }> => {
  try {
    // Generate HTML content
    const title = getReportTitle(data.options);
    const introText = getIntroductionText(data.options);
    const htmlContent = generateReportHtml(
      title,
      introText,
      data.items,
      data.options
    );

    // Set up PDF output path using the same directory as defined in pdfGeneratorCommon
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const fileName = `basic-report-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);

    console.log(`Saving basic report to: ${filePath}`);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    
    const page = await browser.newPage();
    
    // Set content directly instead of creating a temporary file
    await page.setContent(htmlContent, { 
      waitUntil: "domcontentloaded" // Use domcontentloaded instead of networkidle0 to prevent timeouts
    });

    // Generate PDF
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    await browser.close();

    return { filePath, fileName };
  } catch (error) {
    console.error("Error in basic PDF generation:", error);
    throw error;
  }
};

// Helper function to get report title based on subtype
const getReportTitle = (options: ReportOptions): string => {
  if (!options.subType) return "Basic Valuation Report";

  switch (options.subType) {
    case "asset":
      return "Asset Inventory Report";
    case "real-estate":
      return "Real Estate Valuation Report";
    case "salvage":
      return "Salvage Assessment Report";
    default:
      return "Basic Valuation Report";
  }
};

// Get introduction text based on report subtype
const getIntroductionText = (options: ReportOptions): string => {
  let introText =
    "This report provides a basic valuation of the items listed below.";

  if (options.subType) {
    switch (options.subType) {
      case "asset":
        introText =
          "This report provides an inventory and valuation of the assets listed below.";
        break;
      case "real-estate":
        introText =
          "This report provides a valuation of the real estate properties listed below.";
        break;
      case "salvage":
        introText =
          "This report provides an assessment of the salvage value for the items listed below.";
        break;
    }
  }

  return introText;
};

// Generate HTML for the report
const generateReportHtml = (
  title: string,
  introText: string,
  items: any[],
  options: ReportOptions
): string => {
  // Set default currency symbol
  const currencySymbol = options.currency === "CAD" ? "CA$" : "$";

  // Calculate total value
  const total = items.reduce((sum, item) => {
    const price = typeof item.price === "number" ? item.price : 0;
    return sum + price;
  }, 0);

  // Get company logo URL - use the logo from public directory
  const logoUrl = `${
    process.env.BASE_URL || "http://localhost:5000"
  }/public/companylogo.jpg`;

  // Format date
  const reportDate =
    options.reportDate ||
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Generate HTML with red theme and faded background logo.
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        color: #333;
        position: relative;
        background-color: #fff;
      }
      
      .background-logo {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0.35;
        width: 80%;
        z-index: -1;
      }
      
      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        opacity: 0.18;
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
      
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      
      .logo {
        max-width: 200px;
        margin-bottom: 10px;
      }
      
      h1 {
        color: #c41e3a; /* Red theme color */
        font-size: 24px;
        margin: 10px 0;
      }
      
      .report-info {
        margin-bottom: 20px;
        color: #666;
      }
      
      .introduction {
        margin-bottom: 30px;
        line-height: 1.5;
      }
      
      .section-title {
        color: #c41e3a; /* Red theme color */
        font-size: 18px;
        margin: 20px 0 10px 0;
        padding-bottom: 5px;
        border-bottom: 2px solid #c41e3a;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        table-layout: fixed;
      }
      
      th {
        background-color: #c41e3a; /* Red theme color */
        color: white;
        padding: 10px;
        text-align: left;
      }
      
      td {
        padding: 10px;
        border-bottom: 1px solid #ddd;
      }
      
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      .total-row {
        background-color: #c41e3a; /* Red theme color */
        color: white;
        font-weight: bold;
        font-size: 16px;
        border-top: 3px solid #000;
      }
      
      .total-row td {
        border-bottom: none;
      }
      
      .text-right {
        text-align: right;
      }
      
      .footer {
        margin-top: 50px;
        text-align: center;
        font-size: 12px;
        color: #666;
      }
      
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
        ${
          options.clientName ||
          options.appraiserCompany ||
          "Clear Value Appraisals"
        }
      </div>
    </div>
    
    <!-- Introduction -->
    <div class="introduction">
      ${introText}
    </div>
    
    <!-- Items Table -->
    <div class="section-title">Item Inventory</div>
    <table>
      <thead>
        <tr>
          <th style="width: 5%">ID</th>
          <th style="width: 40%">Description</th>
          <th style="width: 20%">Condition</th>
          <th style="width: 15%" class="text-right">Price</th>
          <th style="width: 20%">Image</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item, index) => {
            const price = typeof item.price === "number" ? item.price : 0;
            return `
          <tr>
            <td>${item.id || index + 1}</td>
            <td>${item.description || item.name || ""}</td>
            <td>${item.condition || ""}</td>
            <td class="text-right">${currencySymbol}${price.toLocaleString()}</td>
            <td>${
              item.imageUrl
                ? `<img src="${item.imageUrl}" alt="${item.name}" style="max-width: 100%; max-height: 80px;">`
                : "No image"
            }</td>
          </tr>
          `;
          })
          .join("")}
        <!-- Total Value Row -->
        <tr class="total-row" style="background-color: #c41e3a;">
          <td colspan="3" class="text-right"><strong>TOTAL VALUE</strong></td>
          <td class="text-right"><strong>${currencySymbol}${total.toLocaleString()}</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>
    
    <!-- Footer -->
    <div class="footer">
      <p>This report was generated by ${
        options.clientName ||
        options.appraiserCompany ||
        "Clear Value Appraisals"
      } on ${reportDate}</p>
      <p>© ${new Date().getFullYear()} ${
    options.clientName || options.appraiserCompany || "Clear Value Appraisals"
  }. All rights reserved.</p>
    </div>
  </body>
  </html>
  `;
};
