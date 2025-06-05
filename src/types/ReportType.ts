/**
 * Interface for the new report generation request with support for different report types
 */
export interface ReportTypeRequest {
  // Items array - the products to be included in the report
  items: {
    id?: string | number;
    name: string;
    description?: string;
    details?: string;
    condition: string;
    price?: number;
    imageUrl?: string;
  }[];

  // Report configuration options
  reportType: "full" | "basic";
  subType?: "asset" | "real-estate" | "salvage";
  currency: "USD" | "CAD";
  reportName?: string; // User-friendly report name

  // Additional options
  language?: string;
  wearTear?: boolean;
  companyName?: string;

  // Company info object that contains all the additional fields for full reports
  companyInfo?: {
    reportDate?: string;
    effectiveDate?: string;
    recipientName?: string;
    appraisedEntity?: string;
    premise?: string;
    appraiserName?: string;
    appraiserCompany?: string;
    totalValue?: string;
    inspectorName?: string;
    inspectionDate?: string;
    ownerName?: string;
    industry?: string;
    locationsInspected?: string;
    companyContacts?: string;
    companyWebsite?: string;
    headOfficeAddress?: string;
    valuationMethod?: string;
    assetType?: string;
    assetCondition?: string;
    valueEstimate?: string;
    informationSource?: string;
    appraisalPurpose?: string;
    companyName?: string;
  };

  // Additional fields for full report (appraisal report) - can be provided directly or via companyInfo
  reportDate?: string;
  effectiveDate?: string;
  recipientName?: string;
  appraisedEntity?: string;
  premise?: string;
  appraiserName?: string;
  appraiserCompany?: string;
  totalValue?: string;
  inspectorName?: string;
  inspectionDate?: string;
  ownerName?: string;
  industry?: string;
  locationsInspected?: string;
  companyContacts?: string;
  companyWebsite?: string;
  headOfficeAddress?: string;
  valuationMethod?: string;
  assetType?: string;
  assetCondition?: string;
  valueEstimate?: string;
  informationSource?: string;
  appraisalPurpose?: string;
}
