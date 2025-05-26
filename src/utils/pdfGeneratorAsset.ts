import {
  ReportData,
  ReportOptions,
  addHeader,
  addFooter,
  createPdfDocument,
  savePdf,
} from "./pdfGeneratorCommon";

// Generate a simplified asset report with just a table and market valuations
export const generateAssetReport = async (
  data: ReportData
): Promise<{ filePath: string; fileName: string }> => {
  try {
    const doc = createPdfDocument();

    // Add header with report title
    addHeader(doc, "Asset Inventory & Valuation Report");

    // Add asset items table - the main content of the report
    addAssetItemsTable(doc, data.items, data.options);

    // Add footer
    addFooter(doc);

    // Save and return file info
    return savePdf(doc);
  } catch (error) {
    console.error("Error in asset PDF generation:", error);
    throw error;
  }
};

// Add the asset items table with ID, product name, description, condition, and price
const addAssetItemsTable = (
  doc: PDFKit.PDFDocument,
  items: any[],
  options: ReportOptions
) => {
  // Set default currency symbol
  const currencySymbol = options.currency === 'CAD' ? 'CA$' : '$';

  // We'll skip the title here since it's already in the header
  doc.moveDown(0.5);

  // Table layout
  const margin = 40;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - margin * 2;

  // Column widths (proportions of table width)
  // If wear and tear assessment is included, add a column for repair costs
  const includeRepairCosts = options.wearTear === true;
  const colWidths = includeRepairCosts
    ? [0.05, 0.15, 0.30, 0.15, 0.15, 0.20] // With repair costs
    : [0.05, 0.20, 0.40, 0.20, 0.15]; // Without repair costs

  // Calculate column positions with validation
  const calculatePosition = (index: number): number => {
    let position = margin;
    for (let i = 0; i < index; i++) {
      position += tableWidth * colWidths[i];
    }
    // Ensure position is a valid number
    return isNaN(position) ? margin : position;
  };

  // Create column positions array with proper validation
  const colPositions = includeRepairCosts 
    ? [
        calculatePosition(0), // margin
        calculatePosition(1), // after col 0
        calculatePosition(2), // after col 1
        calculatePosition(3), // after col 2
        calculatePosition(4), // after col 3
        calculatePosition(5), // after col 4
      ]
    : [
        calculatePosition(0), // margin
        calculatePosition(1), // after col 0
        calculatePosition(2), // after col 1
        calculatePosition(3), // after col 2
        calculatePosition(4), // after col 3
      ];
  
  // Debug column positions
  console.log("Column widths:", colWidths);
  console.log("Column positions:", colPositions);

  // Use dynamic row height to accommodate wrapped text
  const baseRowHeight = 30;
  const lineHeight = 12; // Height per line of text
  let y = doc.y;

  // Debug column width calculations
  console.log("Table width:", tableWidth);
  console.log("Column width calculations:");
  for (let i = 0; i < colWidths.length; i++) {
    console.log(`Column ${i} width:`, tableWidth * colWidths[i]);
  }

  // Table header with safe width calculations
  doc.save();
  doc.rect(margin, y, tableWidth, baseRowHeight).fill("#1e40af"); // Darker blue header
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11);
  
  // Helper function to safely calculate column width
  const safeWidth = (index: number): number => {
    const width = tableWidth * colWidths[index] - 10;
    return isNaN(width) || width <= 0 ? 50 : width; // Default to 50 if invalid
  };
  
  // Render header cells with safe calculations
  try {
    doc.text("ID", colPositions[0] + 5, y + 10, { width: safeWidth(0) });
    doc.text("Product Name", colPositions[1] + 5, y + 10, { width: safeWidth(1) });
    doc.text("Description", colPositions[2] + 5, y + 10, { width: safeWidth(2) });
    doc.text("Condition", colPositions[3] + 5, y + 10, { width: safeWidth(3) });
    
    if (includeRepairCosts && colPositions.length >= 6) {
      doc.text("Market Value", colPositions[4] + 5, y + 10, { width: safeWidth(4), align: "right" });
      doc.text("Repair Cost", colPositions[5] + 5, y + 10, { width: safeWidth(5), align: "right" });
    } else {
      doc.text("Market Value", colPositions[4] + 5, y + 10, { width: safeWidth(4), align: "right" });
    }
  } catch (error) {
    console.error("Error rendering table header:", error);
  }
  doc.restore();

  y += baseRowHeight;

  // Table rows
  let total = 0;

  items.forEach((item, index) => {
    // Calculate row height based on content length
    const nameLines = Math.ceil(doc.widthOfString(item.name || "") / (tableWidth * colWidths[1] - 10));
    const descriptionLines = Math.ceil(doc.widthOfString(item.description || "") / (tableWidth * colWidths[2] - 10));
    const conditionLines = Math.ceil(doc.widthOfString(item.condition || "") / (tableWidth * colWidths[3] - 10));
    
    const maxLines = Math.max(nameLines, descriptionLines, conditionLines, 1);
    const dynamicRowHeight = baseRowHeight + (maxLines > 1 ? (maxLines - 1) * lineHeight : 0);
    
    // Check if we need a new page
    if (y + dynamicRowHeight > doc.page.height - 70) {
      doc.addPage();
      addHeader(doc, "Asset Inventory & Valuation Report");
      addFooter(doc);
      y = 100; // Start after header
    }
    
    // Row background (alternating colors)
    const isEven = index % 2 === 0;
    doc.save();
    doc.rect(margin, y, tableWidth, dynamicRowHeight).fill(isEven ? "#f8fafc" : "#f1f5f9"); // Lighter colors for better readability
    doc.restore();

    // Row content
    doc.fillColor("#111827").font("Helvetica").fontSize(10);

    try {
      // ID column
      doc.text(String(item.id || index + 1), colPositions[0] + 5, y + 10, { width: safeWidth(0) });

      // Product Name column with word wrapping
      doc.font("Helvetica-Bold").fillColor("#1e3a8a");
      doc.text(item.name || "", colPositions[1] + 5, y + 10, { 
        width: safeWidth(1),
        lineGap: 2
      });
      
      // Description column with word wrapping
      doc.font("Helvetica").fillColor("#374151");
      doc.text(item.description || "", colPositions[2] + 5, y + 10, { 
        width: safeWidth(2),
        lineGap: 2
      });
      
      // Condition column with word wrapping
      doc.text(item.condition || "", colPositions[3] + 5, y + 10, { 
        width: safeWidth(3),
        lineGap: 2
      });
    } catch (error) {
      console.error("Error rendering row content:", error);
    }

    // Price column - ensure it's a valid number
    let price = 0;
    if (typeof item.price === 'number' && !isNaN(item.price)) {
      price = item.price;
    }
    
    doc.font("Helvetica-Bold").fillColor("#1e3a8a");
    
    try {
      if (includeRepairCosts && colPositions.length >= 6) {
        doc.text(`${currencySymbol}${price.toLocaleString()}`, colPositions[4] + 5, y + 10, { width: safeWidth(4), align: "right" });
        
        // Repair cost column - ensure it's a valid number
        let repairCost = 0;
        if (typeof item.repairCost === 'number' && !isNaN(item.repairCost)) {
          repairCost = item.repairCost;
        }
        
        doc.fillColor(repairCost > 0 ? "#b91c1c" : "#1e3a8a"); // Red for repair costs
        doc.text(`${currencySymbol}${repairCost.toLocaleString()}`, colPositions[5] + 5, y + 10, { width: safeWidth(5), align: "right" });
      } else {
        doc.text(`${currencySymbol}${price.toLocaleString()}`, colPositions[4] + 5, y + 10, { width: safeWidth(4), align: "right" });
      }
    } catch (error) {
      console.error("Error rendering price/repair cost:", error);
    }
    
    total += price;
    y += dynamicRowHeight;
  });

  // Calculate total repair cost if needed
  let totalRepairCost = 0;
  if (includeRepairCosts) {
    totalRepairCost = items.reduce((sum, item) => {
      // Ensure repair cost is a valid number
      if (typeof item.repairCost === 'number' && !isNaN(item.repairCost)) {
        return sum + item.repairCost;
      }
      return sum;
    }, 0);
  }

  // Total row
  doc.save();
  doc.rect(margin, y, tableWidth, baseRowHeight).fill("#1e40af");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11);
  
  try {
    // Calculate the width for the total label safely
    const totalLabelWidth = tableWidth * (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]) - 10;
    const safeTotalLabelWidth = isNaN(totalLabelWidth) || totalLabelWidth <= 0 ? 200 : totalLabelWidth;
    
    if (includeRepairCosts && colPositions.length >= 6) {
      doc.text("Total Asset Value", colPositions[0] + 5, y + 10, { 
        width: safeTotalLabelWidth, 
        align: "right" 
      });
      doc.text(`${currencySymbol}${total.toLocaleString()}`, colPositions[4] + 5, y + 10, { 
        width: safeWidth(4), 
        align: "right" 
      });
      doc.text(`${currencySymbol}${totalRepairCost.toLocaleString()}`, colPositions[5] + 5, y + 10, { 
        width: safeWidth(5), 
        align: "right" 
      });
    } else {
      doc.text("Total Asset Value", colPositions[0] + 5, y + 10, { 
        width: safeTotalLabelWidth, 
        align: "right" 
      });
      doc.text(`${currencySymbol}${total.toLocaleString()}`, colPositions[4] + 5, y + 10, { 
        width: safeWidth(4), 
        align: "right" 
      });
    }
  } catch (error) {
    console.error("Error rendering totals row:", error);
  }
  doc.restore();

  doc.moveDown(1.5);

  // Create a box for the note with proper spacing and alignment
  const noteY = doc.y;
  const noteHeight = includeRepairCosts ? 50 : 35; // Taller for repair costs note
  
  // Add a light gray background for the note
  doc.save();
  doc.rect(margin, noteY, tableWidth, noteHeight).fill("#f8fafc");
  doc.restore();
  
  // Add note about valuation with proper spacing
  doc.fontSize(9)
     .fillColor("#4b5563")
     .font("Helvetica-Bold")
     .text("Note:", margin + 10, noteY + 10, { continued: true })
     .font("Helvetica")
     .text(" ", { continued: true });
  
  if (includeRepairCosts) {
    doc.text(
      "Market valuations are based on current market conditions and the physical condition of each item. " +
      "Repair costs represent estimated expenses to address wear and tear issues. " +
      "Values may vary based on market fluctuations, buyer interest, and local repair rates.", 
      { 
        align: "left",
        width: tableWidth - 20,
        indent: 0
      }
    );
  } else {
    doc.text(
      "Market valuations are based on current market conditions and the physical condition of each item. " +
      "Values may vary based on market fluctuations and buyer interest.", 
      { 
        align: "left",
        width: tableWidth - 20,
        indent: 0
      }
    );
  }
};
