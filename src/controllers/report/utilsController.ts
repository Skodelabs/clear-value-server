import { IReport } from "../../models/Report";

/**
 * Helper function to calculate total value of all items in a report
 */
export function calculateTotalValue(report: IReport): number {
  let total = 0;

  // Sum up values of all items in the report
  if (report.items && report.items.length > 0) {
    report.items.forEach((item) => {
      if (item.price) {
        total += Number(item.price) || 0;
      }
    });
  }

  // If totalValue is already calculated, use that instead
  if (report.totalValue) {
    return report.totalValue;
  }

  return total;
}
