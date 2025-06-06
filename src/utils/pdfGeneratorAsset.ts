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

    // Create a temporary HTML file
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempHtmlPath = path.join(tempDir, `asset-report-${uuidv4()}.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    const page = await browser.newPage();
    await page.goto(`file://${tempHtmlPath}`, { waitUntil: "networkidle0" });

    // Set up PDF output path using the same directory as defined in pdfGeneratorCommon
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const fileName = `asset-report-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    console.log(`Saving asset report to: ${filePath}`);

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

    // Clean up temporary HTML file
    fs.unlinkSync(tempHtmlPath);

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

  // Check if language is French
  const isFrench = options.language === "fr";

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
    process.env.BASE_URL || "http://localhost:3000"
  }/public/companylogo.jpg`;

  // Format date based on language
  const reportDate =
    options.reportDate ||
    new Date().toLocaleDateString(isFrench ? "fr-CA" : "en-US", {
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${
      isFrench
        ? "Rapport d'Inventaire et d'Évaluation des Actifs"
        : "Asset Inventory & Valuation Report"
    }</title>
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        color: #333;
        position: relative;
        background-color: #fff;
        box-sizing: border-box;
      }
      
      .background-logo {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0.25;
        width: 70%;
        z-index: -1;
      }
      
      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        opacity: 0.15;
        font-size: 180px;
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
      
      .company-logo-container {
        text-align: center;
        margin-bottom: 15px;
      }
      
      .company-logo {
        max-width: 250px;
        max-height: 100px;
        margin: 0 auto;
        display: block;
      }
      
      .header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #c41e3a;
        padding-bottom: 15px;
      }
      
      .report-title {
        color: #c41e3a;
        font-size: 26px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .report-subtitle {
        font-size: 18px;
        color: #555;
        margin-bottom: 10px;
      }
      
      .report-date {
        font-size: 14px;
        color: #666;
      }
      
      .report-info {
        margin-bottom: 25px;
        color: #555;
        border-left: 3px solid #c41e3a;
        padding-left: 15px;
      }
      
      .section-title {
        color: #c41e3a;
        font-size: 20px;
        margin: 25px 0 15px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid #c41e3a;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        table-layout: fixed;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      
      th {
        background-color: #c41e3a;
        color: white;
        padding: 12px 10px;
        text-align: left;
        font-weight: bold;
      }
      
      td {
        padding: 12px 10px;
        border-bottom: 1px solid #ddd;
        vertical-align: middle;
      }
      
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      tr:hover {
        background-color: #f1f1f1;
      }
      
      .total-row {
        font-weight: bold;
        background-color: #f0f0f0;
      }
      
      .total-row td {
        border-top: 2px solid #c41e3a;
        border-bottom: none;
        padding: 15px 10px;
      }
      
      .text-right {
        text-align: right;
      }
      
      .note-box {
        background-color: #f8f8f8;
        padding: 15px;
        border-radius: 5px;
        margin-top: 25px;
        font-size: 13px;
        color: #555;
        border-left: 4px solid #c41e3a;
      }
      
      .note-title {
        font-weight: bold;
        margin-right: 5px;
        color: #c41e3a;
      }
      
      .repair-cost {
        color: #c41e3a;
      }
      
      .footer {
        margin-top: 60px;
        text-align: center;
        font-size: 12px;
        color: #666;
        border-top: 1px solid #ddd;
        padding-top: 15px;
      }
      
      img.item-image {
        max-width: 100%;
        max-height: 80px;
        display: block;
        margin: 0 auto;
        border-radius: 4px;
      }
      
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .page-break {
          page-break-after: always;
        }
      }
    </style>
  </head>
  <body>
    <!-- Background Logo (Faded) -->
    <img src="${logoUrl}" class="background-logo" alt="Background Logo">
    
    <!-- Watermark -->
    <div class="watermark">
      <span class="black">${
        isFrench ? "ACTIFS" : "ASSET"
      }</span> <span class="red">${isFrench ? "RAPPORT" : "REPORT"}</span>
    </div>
    
    <!-- Company Logo -->
    <div class="company-logo-container">
      <img src="${logoUrl}" class="company-logo" alt="${options.clientName || options.appraiserCompany || "Clear Value Appraisals"}" onerror="this.style.display='none'">
    </div>
    
    <!-- Header -->
    <div class="header">
      <div class="report-title">${
        isFrench
          ? "Rapport d'Inventaire et d'Évaluation des Actifs"
          : "Asset Inventory & Valuation Report"
      }</div>
      <div class="report-subtitle">${
        isFrench
          ? "Évaluation Complète des Actifs"
          : "Comprehensive Asset Assessment"
      }</div>
      <div class="report-date">${
        isFrench ? "Date du Rapport: " : "Report Date: "
      }${reportDate}</div>
    </div>
    
    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 5%">ID</th>
          <th style="width: 20%">${
            isFrench ? "Nom de l'Article" : "Item Name"
          }</th>
          <th style="width: 25%">${
            isFrench ? "Description" : "Description"
          }</th>
          <th style="width: 10%">${isFrench ? "État" : "Condition"}</th>
          <th style="width: 15%" class="text-right">${
            isFrench ? "Valeur Marchande" : "Market Value"
          }</th>
          ${
            includeRepairCosts
              ? `<th style="width: 10%" class="text-right">${
                  isFrench ? "Coût de Réparation" : "Repair Cost"
                }</th>`
              : ""
          }
          <th style="width: 15%">${isFrench ? "Image" : "Image"}</th>
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
          <td colspan="4" class="text-right">${
            isFrench ? "Coût Total des Réparations" : "Total Repair Cost"
          }</td>
          <td></td>
          <td class="text-right">${currencySymbol}${totalRepairCost.toLocaleString()}</td>
          <td></td>
        </tr>
        <tr class="total-row" style="background-color: #81c784;">
          <td colspan="4" class="text-right">${
            isFrench
              ? "Valeur Nette Après Réparations"
              : "Net Value After Repairs"
          }</td>
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
          <td colspan="4" class="text-right"><strong>${
            isFrench ? "VALEUR TOTALE" : "TOTAL VALUE"
          }</strong></td>
          <td class="text-right"><strong>${currencySymbol}${totalMarketValue.toLocaleString()}</strong></td>
          ${includeRepairCosts ? `<td></td>` : ""}
          <td></td>
        </tr>
      </tbody>
    </table>
    
    <!-- Note Box -->
    <div class="note-box">
      <span class="note-title">${isFrench ? "Note:" : "Note:"}</span>
      ${
        includeRepairCosts
          ? isFrench
            ? `Les évaluations marchandes sont basées sur les conditions actuelles du marché et l'état physique de chaque article. 
               Les coûts de réparation représentent les dépenses estimées pour résoudre les problèmes d'usure. 
               Les valeurs peuvent varier en fonction des fluctuations du marché, de l'intérêt des acheteurs et des tarifs locaux de réparation.`
            : `Market valuations are based on current market conditions and the physical condition of each item. 
               Repair costs represent estimated expenses to address wear and tear issues. 
               Values may vary based on market fluctuations, buyer interest, and local repair rates.`
          : isFrench
          ? `Les évaluations marchandes sont basées sur les conditions actuelles du marché et l'état physique de chaque article. 
               Les valeurs peuvent varier en fonction des fluctuations du marché et de l'intérêt des acheteurs.`
          : `Market valuations are based on current market conditions and the physical condition of each item. 
               Values may vary based on market fluctuations and buyer interest.`
      }
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>${
        isFrench
          ? "Ce rapport a été généré par"
          : "This report was generated by"
      } ${
    options.clientName || options.appraiserCompany || "Clear Value Appraisals"
  } ${isFrench ? "le" : "on"} ${reportDate}</p>
      <p> ${new Date().getFullYear()} ${
    options.clientName || options.appraiserCompany || "Clear Value Appraisals"
  }. ${isFrench ? "Tous droits réservés." : "All rights reserved."}</p>
    </div>
  </body>
  </html>
  `;
};
