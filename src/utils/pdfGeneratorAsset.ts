import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ReportData, ReportOptions, REPORTS_DIR } from "./pdfGeneratorCommon";

// Generate a simplified asset report with just a table and market valuations using Puppeteer and HTML
export const generateAssetReport = async (
  data: ReportData
): Promise<{ filePath: string; fileName: string }> => {
  try {
    // Generate HTML content
    const htmlContent = generateAssetReportHtml(data.items, data.options);

    // Set up PDF output path using the same directory as defined in pdfGeneratorCommon
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const fileName = `asset-report-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);

    console.log(`Saving asset report to: ${filePath}`);

    // Generate PDF using Puppeteer
    const browser = await puppeteer
      .launch({
        executablePath: "/usr/bin/chromium", // Alpine Chromium path
        headless: true,
        pipe: true, // Use pipe instead of WebSocket for more stability
        dumpio: true, // Log browser process to stdout/stderr for debugging
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage", // Overcome limited /dev/shm in Docker
          "--disable-gpu",
          "--no-zygote",
          "--single-process", // More stable in Docker
          "--disable-extensions",
          "--disable-background-networking",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-breakpad",
          "--disable-component-extensions-with-background-pages",
          "--disable-features=TranslateUI,BlinkGenPropertyTrees",
          "--disable-ipc-flooding-protection",
          "--disable-renderer-backgrounding",
          "--enable-features=NetworkService,NetworkServiceInProcess",
          "--force-color-profile=srgb",
          "--hide-scrollbars",
          "--metrics-recording-only",
          "--mute-audio",
        ],
      })
      .catch((error) => {
        console.error("Failed to launch browser:", error);
        throw error;
      });

    const page = await browser.newPage();

    // Set content directly instead of creating a temporary file
    await page.setContent(htmlContent, {
      waitUntil: "domcontentloaded", // Use domcontentloaded instead of networkidle0 to prevent timeouts
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
    console.error("Error in asset PDF generation:", error);
    throw error;
  }
};

// Generate HTML for the asset report
const generateAssetReportHtml = (
  items: any[],
  options: ReportOptions
): string => {
  // Set default currency symbol
  const currencySymbol = options.currency === "CAD" ? "CA$" : "$";

  // Determine if we should include repair costs
  const includeRepairCosts = options.wearTear === true;

  // Calculate totals
  const totalMarketValue = items.reduce((sum, item) => {
    const price = typeof item.price === "number" ? item.price : 0;
    return sum + price;
  }, 0);

  // Calculate total repair cost if needed
  const totalRepairCost = includeRepairCosts
    ? items.reduce((sum, item) => {
        if (typeof item.repairCost === "number" && !isNaN(item.repairCost)) {
          return sum + item.repairCost;
        }
        return sum;
      }, 0)
    : 0;

  // Get company logo URL
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

  // Generate HTML with red theme and faded background logo
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Asset Inventory & Valuation Report</title>
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
      
      .note-box {
        background-color: #f8f8f8;
        padding: 15px;
        border-radius: 5px;
        margin-top: 20px;
        font-size: 12px;
        color: #666;
      }
      
      .note-title {
        font-weight: bold;
        margin-right: 5px;
      }
      
      .repair-cost {
        color: #c41e3a; /* Red for repair costs */
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
      <h1>Asset Inventory & Valuation Report</h1>
      <div class="report-info">
        Report Date: ${reportDate}<br>
        ${
          options.clientName ||
          options.appraiserCompany ||
          "Clear Value Appraisals"
        }
      </div>
    </div>
    
    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 5%">ID</th>
          <th style="width: 20%">Item Name</th>
          <th style="width: 25%">Description</th>
          <th style="width: 10%">Condition</th>
          <th style="width: 15%" class="text-right">Market Value</th>
          ${
            includeRepairCosts
              ? '<th style="width: 10%" class="text-right">Repair Cost</th>'
              : ""
          }
          <th style="width: 15%">Image</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item, index) => {
            const price = typeof item.price === "number" ? item.price : 0;
            const repairCost =
              includeRepairCosts &&
              typeof item.repairCost === "number" &&
              !isNaN(item.repairCost)
                ? item.repairCost
                : 0;

            return `
          <tr>
            <td>${item.id || index + 1}</td>
            <td>${item.name || ""}</td>
            <td>${item.description || ""}</td>
            <td>${item.condition || ""}</td>
            <td class="text-right">${currencySymbol}${price.toLocaleString()}</td>
            ${
              includeRepairCosts
                ? `<td class="text-right ${
                    repairCost > 0 ? "repair-cost" : ""
                  }"> 
                ${currencySymbol}${repairCost.toLocaleString()}
              </td>`
                : ""
            }
            <td>${
              item.imageUrl
                ? `<img src="${item.imageUrl}" alt="${item.name}" style="max-width: 100%; max-height: 80px;">`
                : "No image"
            }</td>
          </tr>
          `;
          })
          .join("")}
        ${
          includeRepairCosts
            ? `
        <tr class="total-row" style="background-color: #e57373;">
          <td colspan="4" class="text-right">Total Repair Cost</td>
          <td></td>
          <td class="text-right">${currencySymbol}${totalRepairCost.toLocaleString()}</td>
          <td></td>
        </tr>
        <tr class="total-row" style="background-color: #81c784;">
          <td colspan="4" class="text-right">Net Value After Repairs</td>
          <td class="text-right">${currencySymbol}${(
                totalMarketValue - totalRepairCost
              ).toLocaleString()}</td>
          <td></td>
          <td></td>
        </tr>
        `
            : ""
        }
        <!-- Total Value Row -->
        <tr class="total-row" style="background-color: #c41e3a;">
          <td colspan="4" class="text-right"><strong>TOTAL VALUE</strong></td>
          <td class="text-right"><strong>${currencySymbol}${totalMarketValue.toLocaleString()}</strong></td>
          ${includeRepairCosts ? `<td></td>` : ""}
          <td></td>
        </tr>
      </tbody>
    </table>
    
    <!-- Note Box -->
    <div class="note-box">
      <span class="note-title">Note:</span>
      ${
        includeRepairCosts
          ? `Market valuations are based on current market conditions and the physical condition of each item. 
         Repair costs represent estimated expenses to address wear and tear issues. 
         Values may vary based on market fluctuations, buyer interest, and local repair rates.`
          : `Market valuations are based on current market conditions and the physical condition of each item. 
         Values may vary based on market fluctuations and buyer interest.`
      }
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>This report was generated by ${
        options.clientName ||
        options.appraiserCompany ||
        "Clear Value Appraisals"
      } on ${reportDate}</p>
      <p> ${new Date().getFullYear()} ${
    options.clientName || options.appraiserCompany || "Clear Value Appraisals"
  }. All rights reserved.</p>
    </div>
  </body>
  </html>
  `;
};
