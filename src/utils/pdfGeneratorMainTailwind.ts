import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  ReportData,
  ReportOptions,
  ReportItem,
  REPORTS_DIR,
} from "./pdfGeneratorCommon";

/**
 * Generate a full (comprehensive) report with detailed analysis using puppeteer and Tailwind CSS
 * This uses a separate HTML template file with Tailwind CSS for styling optimized for A4 printing
 */

export const generateFullReportTailwind = async (
  data: ReportData
): Promise<{ filePath: string; fileName: string }> => {
  try {
    // Determine which template to use based on language
    const language = data.options.language || "en";
    
    // Try to load language-specific template if it exists
    let templateFileName = "full-report-template.html";
    if (language !== "en") {
      const langSpecificTemplate = `full-report-template-${language}.html`;
      const langSpecificPath = path.join(
        process.cwd(),
        "src",
        "templates",
        "reports",
        langSpecificTemplate
      );
      
      // Check if language-specific template exists
      if (fs.existsSync(langSpecificPath)) {
        templateFileName = langSpecificTemplate;
        console.log(`Using language-specific template: ${langSpecificTemplate}`);
      } else {
        console.log(`Language-specific template not found: ${langSpecificTemplate}, using default template`);
      }
    }
    
    // Read the HTML template
    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "reports",
      templateFileName
    );
    let templateHtml = fs.readFileSync(templatePath, "utf8");

    // Process the data and replace placeholders in the template
    const processedHtml = processTemplate(
      templateHtml,
      data.items,
      data.options
    );

    // Create a temporary directory if it doesn't exist
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create a temporary HTML file
    const tempId = uuidv4();
    const tempHtmlPath = path.join(tempDir, `full-report-${tempId}.html`);
    fs.writeFileSync(tempHtmlPath, processedHtml);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    const page = await browser.newPage();

    // Set viewport to match A4 dimensions for better rendering
    // A4 is 210mm × 297mm, which is approximately 794px × 1123px at 96 DPI
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2, // Higher resolution for better quality
    });

    await page.goto(`file://${tempHtmlPath}`, { waitUntil: "networkidle0" });

    // Set up PDF output path
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    // Generate PDF filename with appropriate prefix
    const timestamp = new Date().getTime();
    const reportType = data.options.subType || "full";
    const filename = `${reportType}_report_${timestamp}.pdf`;
    const outputPath = path.join(REPORTS_DIR, filename);

    console.log(
      `Generating full report PDF with Tailwind CSS at: ${outputPath}`
    );

    // Generate PDF with A4 size and optimized settings
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true, // Use CSS page size when possible
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

    console.log(
      `Full report PDF with Tailwind CSS generated successfully at: ${outputPath}`
    );
    return { filePath: outputPath, fileName: filename };
  } catch (error) {
    console.error("Error in full PDF generation with Tailwind:", error);
    throw error;
  }
};

/**
 * Get localized text based on language code
 */
function getLocalizedText(key: string, language: string = "en"): string {
  // Define translations for common text used in the report (English and French only)
  const translations: Record<string, Record<string, string>> = {
    report_title: {
      en: "Comprehensive Appraisal Report",
      fr: "Rapport d'Évaluation Complet",
    },
    market_analysis: {
      en: "Market Analysis",
      fr: "Analyse de Marché",
    },
    market_trend: {
      en: "Market Trend",
      fr: "Tendance du Marché",
    },
    increasing: {
      en: "Increasing",
      fr: "En hausse",
    },
    decreasing: {
      en: "Decreasing",
      fr: "En baisse",
    },
    stable: {
      en: "Stable",
      fr: "Stable",
    },
    appraisal_purpose: {
      en: "To determine the fair market value of the items listed in this report.",
      fr: "Pour déterminer la juste valeur marchande des articles énumérés dans ce rapport.",
    },
    market_analysis_text: {
      en: "A thorough market analysis was conducted to determine the fair market value of the items in this report. Current market trends, comparable sales, and industry standards were taken into consideration.",
      fr: "Une analyse approfondie du marché a été réalisée pour déterminer la juste valeur marchande des articles de ce rapport. Les tendances actuelles du marché, les ventes comparables et les normes de l'industrie ont été prises en considération.",
    },
    total_value: {
      en: "Total Value",
      fr: "Valeur Totale",
    },
    total_items: {
      en: "Total Items",
      fr: "Nombre Total d'Articles",
    },
    average_value: {
      en: "Average Value per Item",
      fr: "Valeur Moyenne par Article",
    },
    effective_date: {
      en: "Effective Date",
      fr: "Date d'Effet",
    },
    summary_conclusion: {
      en: "Summary and Conclusion",
      fr: "Résumé et Conclusion",
    },
    appendix: {
      en: "Appendix",
      fr: "Annexes",
    },
    additional_photos: {
      en: "Additional Photos",
      fr: "Photos Supplémentaires",
    },
    supporting_documents: {
      en: "Supporting Documents",
      fr: "Documents Justificatifs",
    },
    // Add more translations as needed
  };

  // Get the translation for the key and language, or fall back to English
  return translations[key]?.[language] || translations[key]?.["en"] || key;
}

/**
 * Process the HTML template by replacing placeholders with actual data
 */
function processTemplate(
  template: string,
  items: ReportItem[],
  options: ReportOptions
): string {
  // Calculate total value
  const total = items.reduce(
    (sum, item) => sum + (typeof item.price === "number" ? item.price : 0),
    0
  );

  // Set currency symbol based on options
  const currencySymbol = options.currency === "CAD" ? "CA$" : "$";

  // Get language for localization
  const language = options.language || "en";

  // Format report date
  const reportDate = options.reportDate || new Date().toLocaleDateString();
  const effectiveDate = options.effectiveDate || reportDate;

  // Base URL for resolving relative paths
  const baseUrl = process.env.BASE_URL || "http://localhost:5000";

  // Set direct paths for images as provided by the user
  const logoUrl = options.logoUrl || `${baseUrl}/public/companylogo.jpg`;
  const propertyImageUrl = options.propertyImageUrl || `${baseUrl}/public/property-image.png`;
  const watermarkLogoUrl = options.watermarkLogoUrl || `${baseUrl}/public/watermark.png`;
  


  // Use logoUrl as fallback for companyLogoUrl if not provided
  const companyLogoUrl = options.companyLogoUrl || logoUrl;

  // Use language from options for translations
  
  // Define column header translations
  const columnHeaders = {
    id: {
      en: "ID",
      fr: "ID"
    },
    item: {
      en: "Item",
      fr: "Article"
    },
    description: {
      en: "Description",
      fr: "Description"
    },
    condition: {
      en: "Condition",
      fr: "État"
    },
    value: {
      en: "Value",
      fr: "Valeur"
    },
    repairCost: {
      en: "Repair Cost",
      fr: "Coût de réparation"
    },
    image: {
      en: "Image",
      fr: "Image"
    }
  };
  
  // Get translated headers based on language
  const getHeader = (key: string): string => {
    return columnHeaders[key as keyof typeof columnHeaders][language as keyof typeof columnHeaders.id] || 
           columnHeaders[key as keyof typeof columnHeaders]["en"];
  };

  // Generate dynamic table header with conditional repair cost column
  const tableHeader = `
    <thead>
      <tr class="bg-gray-100">
        <th class="py-4 px-5 text-left text-gray-800 font-semibold text-base border-b-2 border-red-600 w-16">${getHeader('id')}</th>
        <th class="py-4 px-5 text-left text-gray-800 font-semibold text-base border-b-2 border-red-600 w-48">${getHeader('item')}</th>
        <th class="py-4 px-5 text-left text-gray-800 font-semibold text-base border-b-2 border-red-600 w-1/3">${getHeader('description')}</th>
        <th class="py-4 px-5 text-left text-gray-800 font-semibold text-base border-b-2 border-red-600 w-32">${getHeader('condition')}</th>
        <th class="py-4 px-5 text-right text-gray-800 font-semibold text-base border-b-2 border-red-600 w-32">${getHeader('value')}</th>
        ${options.wearTear ? `<th class="py-4 px-5 text-right text-gray-800 font-semibold text-base border-b-2 border-red-600 w-32">${getHeader('repairCost')}</th>` : ''}
        <th class="py-4 px-5 text-center text-gray-800 font-semibold text-base border-b-2 border-red-600 w-48">${getHeader('image')}</th>
      </tr>
    </thead>
  `;

  // Generate item rows HTML
  const itemRowsHtml = items
    .map((item, index) => {
      const price = typeof item.price === "number" ? item.price : 0;
      const includeRepairCosts = options.wearTear === true;
      const repairCost = includeRepairCosts && typeof item.repairCost === "number" && !isNaN(item.repairCost) 
        ? item.repairCost 
        : 0;
      
      let conditionClass = "text-gray-600";
      let conditionBadge = "";

      // Set condition styling based on condition value
      if (item.condition) {
        switch (item.condition.toLowerCase()) {
          case "excellent":
            conditionClass = "text-green-700 font-medium";
            conditionBadge =
              '<span class="inline-block ml-1 w-2 h-2 rounded-full bg-green-500"></span>';
            break;
          case "good":
            conditionClass = "text-blue-700 font-medium";
            conditionBadge =
              '<span class="inline-block ml-1 w-2 h-2 rounded-full bg-blue-500"></span>';
            break;
          case "fair":
            conditionClass = "text-amber-700 font-medium";
            conditionBadge =
              '<span class="inline-block ml-1 w-2 h-2 rounded-full bg-amber-500"></span>';
            break;
          case "poor":
            conditionClass = "text-red-700 font-medium";
            conditionBadge =
              '<span class="inline-block ml-1 w-2 h-2 rounded-full bg-red-500"></span>';
            break;
        }
      }

      return `
    <tr class="hover:bg-gray-50 transition-colors duration-150 ${
      index % 2 === 0 ? "bg-white" : "bg-gray-50"
    }">
      <td class="text-center py-4 px-5 border-b border-gray-200 text-base font-medium text-gray-700 w-16">${
        item.id || index + 1
      }</td>
      <td class="text-center py-4 px-5 border-b border-gray-200 text-base font-medium text-gray-900 w-48">${
        item.name || "N/A"
      }</td>
      <td class="py-4 px-5 border-b border-gray-200 text-base text-gray-600 w-1/3">${
        item.description || "No description available"
      }</td>
      <td class="py-4 px-5 border-b border-gray-200 text-base ${conditionClass} w-32">${
        item.condition || "Unknown"
      } ${conditionBadge}</td>
      <td class="text-right py-4 px-5 border-b border-gray-200 text-base font-semibold text-gray-800 w-32">${currencySymbol}${price.toLocaleString()}</td>
      ${includeRepairCosts ? `
      <td class="text-right py-4 px-5 border-b border-gray-200 text-base ${repairCost > 0 ? 'text-red-600 font-medium' : 'text-gray-500'} w-32">${currencySymbol}${repairCost.toLocaleString()}</td>
      ` : ''}
      <td class="py-4 px-5 border-b border-gray-200 text-center w-48">${
        item.imageUrl
          ? `<div class="flex justify-center"><img src="${
              item.imageUrl
            }" alt="${
              item.name || "Item image"
            }" class="object-cover h-28 w-40 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300" onerror="this.onerror=null; this.src='https://via.placeholder.com/160x112?text=No+Image'; this.classList.add('opacity-60');"></div>`
          : `<div class="flex justify-center items-center h-28 w-40 bg-gray-100 rounded-md border border-gray-200 mx-auto"><span class="text-gray-400 text-sm italic">No image</span></div>`
      }</td>
    </tr>
    `;
    })
    .join("");

  // Property image URL already set above

  // Image URLs already set above using getAbsoluteUrl helper function

  // Prepare additional photos for appendix if available
  let additionalPhotosHtml = "";
  if (options.additionalPhotos && options.additionalPhotos.length > 0) {
    additionalPhotosHtml = options.additionalPhotos
      .map(
        (photo: {
          url: string;
          description?: string;
          itemId?: string | number;
        }) => {
          return `
        <div class="border border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 bg-white">
          <div class="aspect-w-16 aspect-h-9 bg-gray-50 relative">
            <img src="${photo.url}" alt="${
            photo.description || "Item photo"
          }" class="object-cover w-full h-full" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image+Available'; this.onerror=null; this.classList.add('opacity-60');">
            <div class="absolute top-2 right-2 bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">ID: ${
              photo.itemId || "N/A"
            }</div>
          </div>
          <div class="p-4 border-t border-gray-100">
            <p class="font-medium text-gray-800">${
              photo.description || "Item photo"
            }</p>
            <div class="flex justify-between items-center mt-2">
              <p class="text-sm text-gray-500">Item ID: ${
                photo.itemId || "N/A"
              }</p>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800">Photo</span>
            </div>
          </div>
        </div>
      `;
        }
      )
      .join("");
  }

  // Prepare supporting documents for appendix if available
  let supportingDocumentsHtml = "";
  if (options.supportingDocuments && options.supportingDocuments.length > 0) {
    supportingDocumentsHtml = options.supportingDocuments
      .map((doc: { title: string; description?: string }, index: number) => {
        return `
        <div class="border border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 bg-white mb-4">
          <div class="flex items-center p-4 border-b border-gray-100">
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg mr-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-center">
                <h3 class="font-medium text-gray-800 text-lg">${
                  doc.title || "Document"
                }</h3>
                <span class="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Doc #${
                  index + 1
                }</span>
              </div>
            </div>
          </div>
          <div class="p-4 bg-white">
            <p class="text-gray-600">${
              doc.description || "No description provided"
            }</p>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // Create complete table with header and rows
  const completeTableHtml = `
    <table class="w-full border-collapse shadow-lg rounded-lg overflow-hidden">
      ${tableHeader}
      <tbody>
        ${itemRowsHtml}
      </tbody>
    </table>
  `;

  // Replace placeholders in the template
  let processedHtml = template
    .replace(
      /{{title}}/g,
      options.title || getLocalizedText("report_title", language)
    )
    .replace(/{{logoUrl}}/g, logoUrl)
    .replace(/{{propertyImageUrl}}/g, propertyImageUrl)
    .replace(/{{watermarkLogoUrl}}/g, watermarkLogoUrl)
    .replace(/{{companyLogoUrl}}/g, companyLogoUrl)
    .replace(/{{clientName}}/g, options.clientName || "Client")
    .replace(/{{reportDate}}/g, reportDate)
    .replace(/{{effectiveDate}}/g, effectiveDate)
    .replace(/{{appraiserName}}/g, options.appraiserName || "Appraiser")
    .replace(
      /{{appraiserCompany}}/g,
      options.appraiserCompany || "ClearValue Appraisals"
    )
    .replace(
      /{{companyWebsite}}/g,
      options.companyWebsite || "www.clearvalue.com"
    )
    .replace(/{{companyEmail}}/g, options.companyEmail || "info@clearvalue.com")
    .replace(
      /{{companyAddress}}/g,
      options.headOfficeAddress ||
        "301-15 Great Plains Rd Emerald Park, SK S4L 1C6"
    )
    .replace(/{{companyPhone}}/g, options.companyContacts || "(306) 757-1747")
    .replace(
      /{{companyName}}/g,
      options.appraiserCompany || "ClearValue Appraisals"
    )
    .replace(/{{companyLogoUrl}}/g, logoUrl)
    .replace(
      /{{appraisalPurpose}}/g,
      options.appraisalPurpose || "Financial Consideration"
    )
    .replace(
      /{{valuationMethod}}/g,
      options.valuationMethod || "Market and Cost Approaches"
    )
    .replace(
      /{{ownerName}}/g,
      options.ownerName || options.clientName || "Client"
    )
    .replace(/{{industry}}/g, options.industry || "General")
    .replace(
      /{{locationsInspected}}/g,
      options.locationsInspected || "Primary location"
    )
    .replace(/{{inspectionDate}}/g, options.inspectionDate || reportDate)
    .replace(/{{itemRows}}/g, completeTableHtml)
    .replace(/{{currencySymbol}}/g, currencySymbol)
    .replace(/{{totalValue}}/g, total.toLocaleString())
    .replace(
      /{{marketAnalysis}}/g,
      options.marketAnalysis ||
        getLocalizedText("market_analysis_text", language)
    )
    .replace(
      /{{recipientName}}/g,
      options.recipientName || options.clientName || "Client"
    )
    .replace(/{{premise}}/g, options.premise || "Fair Market Value")
    .replace(/{{valueEstimate}}/g, options.valueEstimate || "Fair Market Value")
    .replace(/{{currency}}/g, options.currency || "CAD")
    .replace(/{{marketTrend}}/g, options.marketTrend || "stability")
    .replace(/{{marketPeriod}}/g, options.marketPeriod || "year")

    // Handle appendix placeholders
    .replace(
      /{{#each additionalPhotos}}([\s\S]*?){{\/each}}/g,
      additionalPhotosHtml || ""
    )
    .replace(
      /{{#each supportingDocuments}}([\s\S]*?){{\/each}}/g,
      supportingDocumentsHtml || ""
    );

  // Replace any remaining template variables that might be in the HTML
  processedHtml = processedHtml.replace(/{{\s*[a-zA-Z0-9_]+\s*}}/g, "");

  // Fix any template variables in conditional statements that weren't properly replaced
  processedHtml = processedHtml.replace(
    /{{currency === 'CAD' \? 'Canadian' : 'US'}}/g,
    options.currency === "CAD" ? "Canadian" : "US"
  );

  // Replace any introText placeholder with the actual intro text
  const introText =
    options.introText ||
    getLocalizedIntroText(options.clientName || "the client", language);

  // Helper function to get localized intro text
  function getLocalizedIntroText(clientName: string, language: string): string {
    const introTexts: Record<string, string> = {
      en: `
        <p>This comprehensive appraisal report has been prepared for ${clientName} 
        to provide a detailed valuation of the items listed herein. The appraisal was conducted 
        according to industry standards and best practices.</p>
        <p>Each item has been carefully evaluated based on its condition, market value, 
        and other relevant factors. The total valuation represents our professional assessment 
        as of the report date.</p>
      `,
      fr: `
        <p>Ce rapport d'évaluation complet a été préparé pour ${clientName} 
        afin de fournir une évaluation détaillée des articles énumérés ici. L'évaluation a été menée 
        selon les normes de l'industrie et les meilleures pratiques.</p>
        <p>Chaque article a été soigneusement évalué en fonction de son état, de sa valeur marchande 
        et d'autres facteurs pertinents. L'évaluation totale représente notre évaluation professionnelle 
        à la date du rapport.</p>
      `,
    };

    return introTexts[language] || introTexts["en"];
  }
  processedHtml = processedHtml.replace(/{{introText}}/g, introText);

  return processedHtml;
}

/**
 * Export functions that can be used directly from the controller
 */
export const generateMainReport = generateFullReportTailwind; // For backward compatibility
export const generateFullReport = generateFullReportTailwind; // New function name that better reflects the report type
