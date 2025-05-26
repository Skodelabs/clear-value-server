import { ReportData, REPORTS_DIR } from "./pdfGeneratorCommon";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import fs from "fs";

// Generate a main (comprehensive) report with detailed analysis using puppeteer and EJS template
export const generateMainReport = async (data: ReportData): Promise<{ filePath: string, fileName: string }> => {
  try {
    // For main reports, always use the appraisal-report.ejs template
    const templateName = 'appraisal-report.ejs';
    
    // Generate HTML using EJS template
    const templatePath = path.join(process.cwd(), 'src', 'templates', 'reports', templateName);
    const html = await ejs.renderFile(templatePath, {
      items: data.items,
      options: data.options
    });

    // Create a temporary HTML file
    const timestamp = new Date().getTime();
    const tempHtmlPath = path.join(REPORTS_DIR, `temp_${timestamp}.html`);
    fs.writeFileSync(tempHtmlPath, html);

    // Generate PDF using puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(`file://${tempHtmlPath}`, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF filename
    const filename = `report_${timestamp}.pdf`;
    const outputPath = path.join(REPORTS_DIR, filename);

    // Generate PDF with A4 size
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      }
    });

    await browser.close();

    // Delete temporary HTML file
    fs.unlinkSync(tempHtmlPath);

    return { filePath: outputPath, fileName: filename };
  } catch (error) {
    console.error("Error in main PDF generation:", error);
    throw error;
  }
};
