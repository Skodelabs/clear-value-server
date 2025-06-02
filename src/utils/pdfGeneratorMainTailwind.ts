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
 * Generate a main (comprehensive) report with detailed analysis using puppeteer and Tailwind CSS
 * This uses a separate HTML template file with Tailwind CSS for styling
 */
export const generateMainReportTailwind = async (
  data: ReportData
): Promise<{ filePath: string; fileName: string }> => {
  try {
    // Read the HTML template
    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "reports",
      "full-report-template.html"
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
    const tempHtmlPath = path.join(tempDir, `main-report-${tempId}.html`);
    fs.writeFileSync(tempHtmlPath, processedHtml);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    const page = await browser.newPage();
    await page.goto(`file://${tempHtmlPath}`, { waitUntil: "networkidle0" });

    // Set up PDF output path
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    // Generate PDF filename with appropriate prefix
    const timestamp = new Date().getTime();
    const reportType = data.options.subType || "main";
    const filename = `${reportType}_report_${timestamp}.pdf`;
    const outputPath = path.join(REPORTS_DIR, filename);

    console.log(
      `Generating main report PDF with Tailwind CSS at: ${outputPath}`
    );

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

    console.log(
      `Main report PDF with Tailwind CSS generated successfully at: ${outputPath}`
    );
    return { filePath: outputPath, fileName: filename };
  } catch (error) {
    console.error("Error in main PDF generation with Tailwind:", error);
    throw error;
  }
};

/**
 * Get localized text based on language code
 */
function getLocalizedText(key: string, language: string = "en"): string {
  // Define translations for common text used in the report
  const translations: Record<string, Record<string, string>> = {
    report_title: {
      en: "Comprehensive Appraisal Report",
      es: "Informe de Tasación Integral",
      fr: "Rapport d'Évaluation Complet",
      de: "Umfassender Bewertungsbericht",
      it: "Rapporto di Valutazione Completo",
      pt: "Relatório de Avaliação Abrangente",
      zh: "综合评估报告",
      ja: "総合的な評価レポート",
      ru: "Комплексный Оценочный Отчет",
      ar: "تقرير تقييم شامل",
    },
    market_analysis: {
      en: "Market Analysis",
      es: "Análisis de Mercado",
      fr: "Analyse de Marché",
      de: "Marktanalyse",
      it: "Analisi di Mercato",
      pt: "Análise de Mercado",
      zh: "市场分析",
      ja: "市場分析",
      ru: "Анализ Рынка",
      ar: "تحليل السوق",
    },
    market_trend: {
      en: "Market Trend",
      es: "Tendencia del Mercado",
      fr: "Tendance du Marché",
      de: "Markttrend",
      it: "Tendenza del Mercato",
      pt: "Tendência de Mercado",
      zh: "市场趋势",
      ja: "市場動向",
      ru: "Тенденция Рынка",
      ar: "اتجاه السوق",
    },
    increasing: {
      en: "Increasing",
      es: "En aumento",
      fr: "En hausse",
      de: "Steigend",
      it: "In aumento",
      pt: "Aumentando",
      zh: "上升",
      ja: "上昇中",
      ru: "Растущий",
      ar: "متزايد",
    },
    decreasing: {
      en: "Decreasing",
      es: "En descenso",
      fr: "En baisse",
      de: "Fallend",
      it: "In diminuzione",
      pt: "Diminuindo",
      zh: "下降",
      ja: "下降中",
      ru: "Снижающийся",
      ar: "متناقص",
    },
    stable: {
      en: "Stable",
      es: "Estable",
      fr: "Stable",
      de: "Stabil",
      it: "Stabile",
      pt: "Estável",
      zh: "稳定",
      ja: "安定",
      ru: "Стабильный",
      ar: "مستقر",
    },
    appraisal_purpose: {
      en: "To determine the fair market value of the items listed in this report.",
      es: "Para determinar el valor justo de mercado de los artículos enumerados en este informe.",
      fr: "Pour déterminer la juste valeur marchande des articles énumérés dans ce rapport.",
      de: "Um den fairen Marktwert der in diesem Bericht aufgeführten Gegenstände zu bestimmen.",
      it: "Per determinare il giusto valore di mercato degli articoli elencati in questo rapporto.",
      pt: "Para determinar o valor justo de mercado dos itens listados neste relatório.",
      zh: "确定本报告中列出物品的公平市场价值。",
      ja: "このレポートに記載されているアイテムの公正な市場価値を決定するため。",
      ru: "Для определения справедливой рыночной стоимости предметов, перечисленных в этом отчете.",
      ar: "لتحديد القيمة السوقية العادلة للعناصر المدرجة في هذا التقرير.",
    },
    market_analysis_text: {
      en: "A thorough market analysis was conducted to determine the fair market value of the items in this report. Current market trends, comparable sales, and industry standards were taken into consideration.",
      es: "Se realizó un análisis exhaustivo del mercado para determinar el valor justo de mercado de los artículos en este informe. Se tomaron en consideración las tendencias actuales del mercado, ventas comparables y estándares de la industria.",
      fr: "Une analyse approfondie du marché a été réalisée pour déterminer la juste valeur marchande des articles de ce rapport. Les tendances actuelles du marché, les ventes comparables et les normes de l'industrie ont été prises en considération.",
      de: "Eine gründliche Marktanalyse wurde durchgeführt, um den fairen Marktwert der Gegenstände in diesem Bericht zu bestimmen. Aktuelle Markttrends, vergleichbare Verkäufe und Branchenstandards wurden berücksichtigt.",
      it: "È stata condotta un'analisi approfondita del mercato per determinare il giusto valore di mercato degli articoli in questo rapporto. Sono state prese in considerazione le tendenze attuali del mercato, le vendite comparabili e gli standard del settore.",
      pt: "Foi realizada uma análise de mercado completa para determinar o valor justo de mercado dos itens neste relatório. Tendências atuais de mercado, vendas comparáveis e padrões da indústria foram levados em consideração.",
      zh: "进行了彻底的市场分析，以确定本报告中物品的公平市场价值。考虑了当前市场趋势、可比销售和行业标准。",
      ja: "このレポートの品目の公正な市場価値を決定するために、徹底的な市場分析が行われました。現在の市場動向、比較可能な販売、および業界標準が考慮されました。",
      ru: "Был проведен тщательный анализ рынка для определения справедливой рыночной стоимости предметов в этом отчете. Были учтены текущие рыночные тенденции, сопоставимые продажи и отраслевые стандарты.",
      ar: "تم إجراء تحليل شامل للسوق لتحديد القيمة السوقية العادلة للعناصر في هذا التقرير. تم أخذ اتجاهات السوق الحالية والمبيعات المماثلة ومعايير الصناعة في الاعتبار.",
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

  // Set logo URL with fallback
  const logoUrl = options.logoUrl
    ? options.logoUrl.startsWith("http")
      ? options.logoUrl
      : `${process.env.BASE_URL || "http://localhost:5000"}${options.logoUrl}`
    : `${process.env.BASE_URL || "http://localhost:5000"}/companylogo.jpg`;

  // Generate item rows HTML
  const itemRowsHtml = items
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
    .join("");

  // Set property image URL with fallback
  const propertyImageUrl = options.propertyImageUrl
    ? options.propertyImageUrl.startsWith("http")
      ? options.propertyImageUrl
      : `${process.env.BASE_URL || "http://localhost:5000"}${
          options.propertyImageUrl
        }`
    : `${
        process.env.BASE_URL || "http://localhost:5000"
      }/property-placeholder.jpg`;

  // Set watermark logo URL with fallback
  const watermarkLogoUrl = options.watermarkLogoUrl
    ? options.watermarkLogoUrl.startsWith("http")
      ? options.watermarkLogoUrl
      : `${process.env.BASE_URL || "http://localhost:5000"}${
          options.watermarkLogoUrl
        }`
    : logoUrl;

  // Set signature image URL with fallback
  const signatureImageUrl = options.signatureImageUrl
    ? options.signatureImageUrl.startsWith("http")
      ? options.signatureImageUrl
      : `${process.env.BASE_URL || "http://localhost:5000"}${
          options.signatureImageUrl
        }`
    : "";

  // Replace placeholders in the template
  let processedHtml = template
    .replace(
      /{{title}}/g,
      options.title || getLocalizedText("report_title", language)
    )
    .replace(/{{logoUrl}}/g, logoUrl)
    .replace(/{{propertyImageUrl}}/g, propertyImageUrl)
    .replace(/{{watermarkLogoUrl}}/g, watermarkLogoUrl)
    .replace(/{{signatureImageUrl}}/g, signatureImageUrl)
    .replace(/{{clientName}}/g, options.clientName || "Client")
    .replace(/{{reportDate}}/g, reportDate)
    .replace(/{{effectiveDate}}/g, effectiveDate)
    .replace(/{{appraiserName}}/g, options.appraiserName || "Appraiser")
    .replace(
      /{{appraiserCompany}}/g,
      options.appraiserCompany || "Clear Value Appraisals"
    )
    .replace(
      /{{companyWebsite}}/g,
      options.companyWebsite || "www.clearvalue.com"
    )
    .replace(
      /{{appraisalPurpose}}/g,
      options.appraisalPurpose ||
        getLocalizedText("appraisal_purpose", language)
    )
    .replace(
      /{{valuationMethod}}/g,
      options.valuationMethod || "Market Comparison"
    )
    .replace(
      /{{ownerName}}/g,
      options.ownerName || options.clientName || "Owner"
    )
    .replace(/{{industry}}/g, options.industry || "General")
    .replace(
      /{{locationsInspected}}/g,
      options.locationsInspected || "Primary location"
    )
    .replace(/{{inspectionDate}}/g, options.inspectionDate || reportDate)
    .replace(/{{itemRows}}/g, itemRowsHtml)
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
    .replace(/{{currency}}/g, options.currency || "CAD");

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
      es: `
        <p>Este informe de tasación integral ha sido preparado para ${clientName} 
        para proporcionar una valoración detallada de los artículos aquí enumerados. La tasación se realizó 
        de acuerdo con los estándares y mejores prácticas de la industria.</p>
        <p>Cada artículo ha sido cuidadosamente evaluado según su condición, valor de mercado 
        y otros factores relevantes. La valoración total representa nuestra evaluación profesional 
        a la fecha del informe.</p>
      `,
      fr: `
        <p>Ce rapport d'évaluation complet a été préparé pour ${clientName} 
        afin de fournir une évaluation détaillée des articles énumérés ici. L'évaluation a été menée 
        selon les normes de l'industrie et les meilleures pratiques.</p>
        <p>Chaque article a été soigneusement évalué en fonction de son état, de sa valeur marchande 
        et d'autres facteurs pertinents. L'évaluation totale représente notre évaluation professionnelle 
        à la date du rapport.</p>
      `,
      de: `
        <p>Dieser umfassende Bewertungsbericht wurde für ${clientName} erstellt, 
        um eine detaillierte Bewertung der hierin aufgeführten Gegenstände zu liefern. Die Bewertung wurde 
        nach Branchenstandards und bewährten Verfahren durchgeführt.</p>
        <p>Jeder Gegenstand wurde sorgfältig nach seinem Zustand, Marktwert 
        und anderen relevanten Faktoren bewertet. Die Gesamtbewertung stellt unsere professionelle Einschätzung 
        zum Berichtsdatum dar.</p>
      `,
      it: `
        <p>Questo rapporto di valutazione completo è stato preparato per ${clientName} 
        per fornire una valutazione dettagliata degli articoli qui elencati. La valutazione è stata condotta 
        secondo gli standard del settore e le migliori pratiche.</p>
        <p>Ogni articolo è stato attentamente valutato in base alle sue condizioni, valore di mercato 
        e altri fattori rilevanti. La valutazione totale rappresenta la nostra valutazione professionale 
        alla data del rapporto.</p>
      `,
      pt: `
        <p>Este relatório de avaliação abrangente foi preparado para ${clientName} 
        para fornecer uma avaliação detalhada dos itens aqui listados. A avaliação foi conduzida 
        de acordo com os padrões da indústria e melhores práticas.</p>
        <p>Cada item foi cuidadosamente avaliado com base em sua condição, valor de mercado 
        e outros fatores relevantes. A avaliação total representa nossa avaliação profissional 
        na data do relatório.</p>
      `,
      zh: `
        <p>这份综合评估报告是为${clientName}准备的，
        旨在提供此处列出物品的详细估价。评估是
        按照行业标准和最佳实践进行的。</p>
        <p>每个物品都根据其状况、市场价值
        和其他相关因素进行了仔细评估。总估价代表了我们在
        报告日期的专业评估。</p>
      `,
      ja: `
        <p>この総合的な評価レポートは${clientName}のために作成され、
        ここに記載されているアイテムの詳細な評価を提供するものです。評価は
        業界標準とベストプラクティスに従って実施されました。</p>
        <p>各アイテムは、その状態、市場価値、
        およびその他の関連要因に基づいて慎重に評価されています。総評価額は、
        レポート日付時点での当社の専門的な評価を表しています。</p>
      `,
      ru: `
        <p>Этот комплексный оценочный отчет был подготовлен для ${clientName}, 
        чтобы предоставить детальную оценку перечисленных здесь предметов. Оценка проводилась 
        в соответствии с отраслевыми стандартами и лучшими практиками.</p>
        <p>Каждый предмет был тщательно оценен на основе его состояния, рыночной стоимости 
        и других соответствующих факторов. Общая оценка представляет нашу профессиональную оценку 
        на дату отчета.</p>
      `,
      ar: `
        <p>تم إعداد تقرير التقييم الشامل هذا لـ ${clientName} 
        لتقديم تقييم مفصل للعناصر المدرجة هنا. تم إجراء التقييم 
        وفقًا لمعايير الصناعة وأفضل الممارسات.</p>
        <p>تم تقييم كل عنصر بعناية بناءً على حالته وقيمته السوقية 
        وعوامل أخرى ذات صلة. يمثل التقييم الإجمالي تقييمنا المهني 
        اعتبارًا من تاريخ التقرير.</p>
      `,
    };

    return introTexts[language] || introTexts["en"];
  }
  processedHtml = processedHtml.replace(/{{introText}}/g, introText);

  return processedHtml;
}

/**
 * Export a function that can be used directly from the controller
 */
export const generateMainReport = generateMainReportTailwind;
