import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ReportData, ReportOptions, REPORTS_DIR } from "./pdfGeneratorCommon";

// Generate a real estate report with just a table and market valuations using Puppeteer and HTML
export const generateRealEstateReport = async (
  data: ReportData
): Promise<{ filePath: string; fileName: string }> => {
  try {
    // Generate HTML content
    const htmlContent = generateRealEstateReportHtml(data.items, data.options);

    // Create a temporary HTML file
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempHtmlPath = path.join(tempDir, `real-estate-report-${uuidv4()}.html`);
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

    const fileName = `real-estate-report-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);

    console.log(`Saving real estate report to: ${filePath}`);

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
    console.error("Error in real estate PDF generation:", error);
    throw error;
  }
};

// Generate HTML for the real estate report
const generateRealEstateReportHtml = (
  items: any[],
  options: ReportOptions
): string => {
  // Set default currency symbol
  const currencySymbol = options.currency === "CAD" ? "CA$" : "$";
  
  // Check if language is French
  const isFrench = options.language === 'fr';

  // Calculate totals
  const totalMarketValue = items.reduce((sum, item) => {
    const price = typeof item.price === "number" ? item.price : 0;
    return sum + price;
  }, 0);

  // Get company logo URL
  const logoUrl = `${process.env.BASE_URL || "http://localhost:5000"}/public/companylogo.jpg`;

  // Format date based on language
  const reportDate =
    options.reportDate ||
    new Date().toLocaleDateString(isFrench ? "fr-CA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Generate HTML with green theme and faded background logo
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${isFrench ? 'Rapport d\'Évaluation Immobilière' : 'Real Estate Valuation Report'}</title>
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
      
      .watermark .green {
        color: #166534;
      }
      
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      
      .report-title {
        font-size: 24px;
        font-weight: bold;
        color: #166534;
        margin-bottom: 10px;
        text-transform: uppercase;
      }
      
      .report-subtitle {
        font-size: 16px;
        color: #666;
        margin-bottom: 5px;
      }
      
      .report-date {
        font-size: 14px;
        color: #666;
        margin-bottom: 20px;
      }
      
      .company-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
      }
      
      .company-logo {
        max-width: 200px;
        max-height: 80px;
      }
      
      .company-name {
        font-size: 18px;
        font-weight: bold;
        color: #166534;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      th, td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      
      th {
        background-color: #166534;
        color: white;
        font-weight: bold;
        text-transform: uppercase;
        font-size: 12px;
      }
      
      tr:nth-child(even) {
        background-color: #f8f9fa;
      }
      
      tr:hover {
        background-color: #f1f4f9;
      }
      
      .text-right {
        text-align: right;
      }
      
      .total-row {
        font-weight: bold;
      }
      
      .note-box {
        background-color: #f8f9fa;
        border-left: 4px solid #166534;
        padding: 15px;
        margin-bottom: 30px;
      }
      
      .note-title {
        font-weight: bold;
        color: #166534;
        margin-right: 5px;
      }
      
      .footer {
        margin-top: 50px;
        font-size: 12px;
        color: #666;
        text-align: center;
        border-top: 1px solid #ddd;
        padding-top: 20px;
      }
    </style>
  </head>
  <body>
    <!-- Watermark -->
    <div class="watermark">
      <span class="black">${isFrench ? 'IMMOBILIER' : 'REAL'}</span> <span class="green">${isFrench ? 'ÉVALUATION' : 'ESTATE'}</span>
    </div>
    
    <!-- Header -->
    <div class="header">
      <div class="report-title">${isFrench ? 'Rapport d\'Évaluation Immobilière' : 'Real Estate Valuation Report'}</div>
      <div class="report-subtitle">${isFrench ? 'Évaluation de Propriété & Analyse de Valeur Marchande' : 'Property Assessment & Market Value Analysis'}</div>
      <div class="report-date">${isFrench ? 'Date du Rapport: ' : 'Report Date: '}${reportDate}</div>
    </div>
    
    <!-- Company Info -->
    <div class="company-info">
      <img src="${logoUrl}" alt="Company Logo" class="company-logo" onerror="this.style.display='none'">
      <div class="company-name">
        ${options.clientName || options.appraiserCompany || "Clear Value Appraisals"}
      </div>
    </div>
    
    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 5%">ID</th>
          <th style="width: 30%">${isFrench ? 'Propriété' : 'Property'}</th>
          <th style="width: 25%">${isFrench ? 'Description' : 'Description'}</th>
          <th style="width: 15%">${isFrench ? 'État' : 'Condition'}</th>
          <th style="width: 15%" class="text-right">${isFrench ? 'Valeur Marchande' : 'Market Value'}</th>
          <th style="width: 10%">${isFrench ? 'Image' : 'Image'}</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => {
          const price = typeof item.price === "number" ? item.price : 0;
          
          return `
          <tr>
            <td>${item.id || index + 1}</td>
            <td>${item.name || ""}</td>
            <td>${item.description || ""}</td>
            <td>${item.condition || ""}</td>
            <td class="text-right">${currencySymbol}${price.toLocaleString()}</td>
            <td>${
              item.imageUrl
                ? `<img src="${item.imageUrl}" alt="${item.name}" style="max-width: 100%; max-height: 80px;">`
                : isFrench ? "Pas d'image" : "No image"
            }</td>
          </tr>
          `;
        }).join("")}
        
        <!-- Total Value Row -->
        <tr class="total-row" style="background-color: #166534;">
          <td colspan="4" class="text-right"><strong>${isFrench ? 'VALEUR TOTALE DE LA PROPRIÉTÉ' : 'TOTAL PROPERTY VALUE'}</strong></td>
          <td class="text-right"><strong>${currencySymbol}${totalMarketValue.toLocaleString()}</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>
    
    <!-- Note Box -->
    <div class="note-box">
      <span class="note-title">${isFrench ? 'Note:' : 'Note:'}</span>
      ${isFrench 
        ? `Les évaluations immobilières dans ce rapport sont basées sur une approche d'analyse comparative du marché. 
           Les facteurs pris en compte comprennent les ventes comparables récentes, les tendances actuelles du marché, l'état de la propriété, 
           les facteurs de localisation et les caractéristiques de la propriété. Cette évaluation représente une valeur marchande estimée 
           à la date du rapport et ne constitue pas une évaluation officielle.`
        : `The real estate valuations in this report are based on a comparative market analysis approach. 
           Factors considered include recent comparable sales, current market trends, property condition, 
           location factors, and property features. This valuation represents an estimated market value 
           as of the report date and is not an official appraisal.`
      }
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>${isFrench ? 'Ce rapport a été généré par' : 'This report was generated by'} ${options.clientName || options.appraiserCompany || "Clear Value Appraisals"} ${isFrench ? 'le' : 'on'} ${reportDate}</p>
      <p> ${new Date().getFullYear()} ${options.clientName || options.appraiserCompany || "Clear Value Appraisals"}. ${isFrench ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
    </div>
  </body>
  </html>
  `;
};
