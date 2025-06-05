import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ReportData, ReportOptions, REPORTS_DIR } from "./pdfGeneratorCommon";

// Generate HTML for the salvage report
const generateSalvageReportHtml = (
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
  const logoUrl = `${process.env.BASE_URL || "http://localhost:3000"}/public/companylogo.jpg`;

  // Format date based on language
  const reportDate =
    options.reportDate ||
    new Date().toLocaleDateString(isFrench ? "fr-CA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Generate HTML with blue theme and faded background logo
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isFrench ? 'Rapport d\'Évaluation de Récupération' : 'Salvage Assessment Report'}</title>
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
        width: 210mm;
        min-height: 297mm;
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
      
      .watermark .blue {
        color: #1e40af;
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
        border-bottom: 2px solid #1e40af;
        padding-bottom: 15px;
      }
      
      .report-title {
        font-size: 26px;
        font-weight: bold;
        color: #1e40af;
        margin-bottom: 5px;
        text-transform: uppercase;
      }
      
      .report-subtitle {
        font-size: 18px;
        color: #555;
        margin-bottom: 10px;
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
        color: #1e40af;
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
        background-color: #1e40af;
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
      
      .repair-cost {
        color: #e53e3e;
      }
      
      .note-box {
        background-color: #f8f9fa;
        border-left: 4px solid #1e40af;
        padding: 15px;
        margin-bottom: 30px;
      }
      
      .note-title {
        font-weight: bold;
        color: #1e40af;
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
    <!-- Background Logo (Faded) -->
    <img src="${logoUrl}" class="background-logo" alt="Background Logo">
    
    <!-- Watermark -->
    <div class="watermark">
      <span class="black">${isFrench ? 'RÉCUPÉRATION' : 'SALVAGE'}</span> <span class="blue">${isFrench ? 'RAPPORT' : 'REPORT'}</span>
    </div>
    
    <!-- Company Logo -->
    <div class="company-logo-container">
      <img src="${logoUrl}" class="company-logo" alt="${options.clientName || options.appraiserCompany || "Clear Value Appraisals"}" onerror="this.style.display='none'">
    </div>
    
    <!-- Header -->
    <div class="header">
      <div class="report-title">${isFrench ? 'Rapport d\'Évaluation de Récupération' : 'Salvage Assessment Report'}</div>
      <div class="report-subtitle">${isFrench ? 'Évaluation des Valeurs de Récupération' : 'Salvage Value Assessment'}</div>
      <div class="report-date">${isFrench ? 'Date du Rapport: ' : 'Report Date: '}${reportDate}</div>
    </div>
    
    <!-- Company Info -->
    <div class="company-info">
      <div class="company-name">
        ${options.clientName || options.appraiserCompany || "Clear Value Appraisals"}
      </div>
    </div>
    
    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 5%">ID</th>
          <th style="width: 30%">${isFrench ? 'Nom de l\'Article' : 'Item Name'}</th>
          <th style="width: 25%">${isFrench ? 'Description' : 'Description'}</th>
          <th style="width: 15%">${isFrench ? 'État' : 'Condition'}</th>
          <th style="width: 15%" class="text-right">${isFrench ? 'Valeur de Récupération' : 'Salvage Value'}</th>
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
        <tr class="total-row">
          <td colspan="4" class="text-right"><strong>${isFrench ? 'VALEUR TOTALE DE RÉCUPÉRATION' : 'TOTAL SALVAGE VALUE'}</strong></td>
          <td class="text-right"><strong>${currencySymbol}${totalMarketValue.toLocaleString()}</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>
    
    <!-- Note Box -->
    <div class="note-box">
      <span class="note-title">${isFrench ? 'Note:' : 'Note:'}</span>
      ${isFrench 
        ? `Les évaluations de récupération dans ce rapport représentent la valeur récupérable estimée des articles dans leur état actuel. 
           Les facteurs pris en compte comprennent la composition des matériaux, le potentiel de récupération des pièces, les coûts de main-d'œuvre pour le démontage, 
           et les considérations environnementales. Les valeurs peuvent varier en fonction des conditions du marché pour les matériaux recyclables.`
        : `The salvage valuations in this report represent the estimated recoverable value of the items in their current condition. 
           Factors considered include material composition, potential for parts reclamation, labor costs for dismantling, 
           and environmental considerations. Values may vary based on market conditions for recyclable materials.`
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

// Generate a salvage report with just a table and market valuations using Puppeteer and HTML
export const generateSalvageReport = async (
  data: ReportData
): Promise<{ filePath: string; fileName: string }> => {
  try {
    // Generate HTML content
    const htmlContent = generateSalvageReportHtml(data.items, data.options);

    // Create a temporary HTML file
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempHtmlPath = path.join(tempDir, `salvage-report-${uuidv4()}.html`);
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

    const fileName = `salvage-report-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);

    console.log(`Saving salvage report to: ${filePath}`);

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
    console.error("Error in salvage PDF generation:", error);
    throw error;
  }
};


