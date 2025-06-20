import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { Admin } from '../models/Admin';

// Load environment variables
dotenv.config();

/**
 * Seed initial admin accounts
 * Creates a super admin and a standard admin if no admins exist
 */
async function seedAdmins() {
  try {
    console.log('Connecting to MongoDB...');
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clearvalue');
    console.log('Connected to MongoDB');

    // Check if there are any existing admins
    const adminCount = await Admin.countDocuments();
    
    // Only allow seeding if no admins exist
    if (adminCount > 0) {
      console.log('Admin accounts already exist. Seeding is only allowed for initial setup.');
      process.exit(0);
    }

    // Create super admin
    const superAdminPassword = await bcrypt.hash("superadmin123", 10);
    const superAdmin = new Admin({
      email: "superadmin@clearvalue.com",
      password: superAdminPassword,
      fullName: "Super Admin",
      role: "super",
    });
    await superAdmin.save();

    // Create standard admin
    const standardAdminPassword = await bcrypt.hash("admin123", 10);
    const standardAdmin = new Admin({
      email: "admin@clearvalue.com",
      password: standardAdminPassword,
      fullName: "Standard Admin",
      role: "standard",
    });
    await standardAdmin.save();

    console.log('Admin accounts seeded successfully:');
    console.log('Super Admin:', {
      email: superAdmin.email,
      fullName: superAdmin.fullName,
      role: superAdmin.role,
    });
    console.log('Standard Admin:', {
      email: standardAdmin.email,
      fullName: standardAdmin.fullName,
      role: standardAdmin.role,
    });
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin accounts:', error);
    process.exit(1);
  }
}

// Run the seed function
seedAdmins();
