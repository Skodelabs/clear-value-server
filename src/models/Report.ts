import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  // File information
  name: string;           // PDF filename
  path: string;           // File path on server
  
  // User information
  userId: mongoose.Schema.Types.ObjectId;  // Reference to the user who created the report
  
  // Report metadata
  reportName: string;     // User-friendly report name
  reportType: 'full' | 'standard' | 'asset-listing' | 'main' | 'basic';
  subType?: 'asset' | 'real-estate' | 'salvage';
  type?: string;          // For backward compatibility
  language?: string;
  currency?: 'USD' | 'CAD';
  createdAt: Date;
  downloadCount: number;
  
  // Report summary data
  noOfItems: number;      // Number of items in the report
  totalValue: number;     // Total value of all items
  
  // Items in the report
  items?: {
    id: number;
    name: string;         // Product name
    description: string;
    condition: string;
    price: number;
    imageUrl?: string;
  }[];
  
  // Company information
  companyInfo?: {
    name: string;
  };
}

const ReportSchema: Schema = new Schema({
  // File information
  name: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Report metadata
  reportName: {
    type: String,
    default: "Asset Valuation Report"
  },
  reportType: {
    type: String,
    enum: ['full', 'standard', 'asset-listing', 'main', 'basic'],
    default: 'standard'
  },
  subType: {
    type: String,
    enum: ['asset', 'real-estate', 'salvage'],
  },
  type: {
    type: String
  },
  language: {
    type: String,
    default: 'en'
  },
  currency: {
    type: String,
    enum: ['USD', 'CAD'],
    default: 'USD'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  
  // Report summary data
  noOfItems: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: 0
  },
  
  // Items in the report
  items: [{
    id: {
      type: Number
    },
    name: {
      type: String
    },
    description: {
      type: String
    },
    condition: {
      type: String
    },
    price: {
      type: Number
    },
    imageUrl: {
      type: String
    }
  }],
  
  // Company information
  companyInfo: {
    name: {
      type: String
    }
  }
});

// Create index for faster queries
ReportSchema.index({ createdAt: -1 });

export default mongoose.model<IReport>('Report', ReportSchema);
