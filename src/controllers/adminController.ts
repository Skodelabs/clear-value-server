import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin";
import { AuthRequest } from "../types/AuthRequest";

export class AdminController {
  /**
   * Create a new admin account
   * Only super admins can create new admin accounts
   */
  async createAdmin(req: AuthRequest, res: Response) {
    try {
      // Check if the requester is a super admin
      const requestingAdmin = await Admin.findById(req.userId);
      if (!requestingAdmin || requestingAdmin.role !== 'super') {
        return res.status(403).json({
          success: false,
          message: "Only super admins can create new admin accounts",
        });
      }

      const { email, password, fullName, role } = req.body;

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address",
        });
      }

      // Validate password length
      if (!password || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }

      // Validate full name
      if (!fullName?.trim() || fullName.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 3 characters",
        });
      }

      // Validate role
      if (role && !['super', 'standard'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Role must be either 'super' or 'standard'",
        });
      }

      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: "Email is already registered",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new admin
      const admin = new Admin({
        email,
        password: hashedPassword,
        fullName: fullName.trim(),
        role: role || 'standard',
      });

      await admin.save();

      return res.status(201).json({
        success: true,
        message: "Admin account created successfully",
        data: {
          admin: {
            id: admin._id,
            fullName: admin.fullName,
            email: admin.email,
            role: admin.role,
            isBlocked: admin.isBlocked,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Delete an admin account
   * Only super admins can delete admin accounts
   */
  async deleteAdmin(req: AuthRequest, res: Response) {
    try {
      // Check if the requester is a super admin
      const requestingAdmin = await Admin.findById(req.userId);
      if (!requestingAdmin || requestingAdmin.role !== 'super') {
        return res.status(403).json({
          success: false,
          message: "Only super admins can delete admin accounts",
        });
      }

      const { adminId } = req.params;

      // Prevent self-deletion
      if (adminId === req.userId) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account",
        });
      }

      // Find and delete the admin
      const admin = await Admin.findByIdAndDelete(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      return res.json({
        success: true,
        message: "Admin account deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Block/unblock an admin account
   * Only super admins can block/unblock admin accounts
   */
  async blockAdmin(req: AuthRequest, res: Response) {
    try {
      // Check if the requester is a super admin
      const requestingAdmin = await Admin.findById(req.userId);
      if (!requestingAdmin || requestingAdmin.role !== 'super') {
        return res.status(403).json({
          success: false,
          message: "Only super admins can block/unblock admin accounts",
        });
      }

      const { adminId } = req.params;
      const { isBlocked } = req.body;

      // Prevent self-blocking
      if (adminId === req.userId) {
        return res.status(400).json({
          success: false,
          message: "You cannot block your own account",
        });
      }

      // Find the admin to block/unblock
      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }

      // Update block status
      admin.isBlocked = !!isBlocked;
      await admin.save();

      return res.json({
        success: true,
        message: `Admin account ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
        data: {
          admin: {
            id: admin._id,
            fullName: admin.fullName,
            email: admin.email,
            role: admin.role,
            isBlocked: admin.isBlocked,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Admin login
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find admin by email
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(400).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if admin is blocked
      if (admin.isBlocked) {
        return res.status(403).json({
          success: false,
          message: "Your account has been blocked. Please contact a super admin.",
        });
      }

      // Validate password
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Update last login time
      admin.lastLogin = new Date();
      await admin.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: admin._id, isAdmin: true },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Login successful",
        data: {
          admin: {
            id: admin._id,
            fullName: admin.fullName,
            email: admin.email,
            role: admin.role,
            isBlocked: admin.isBlocked,
          },
          token,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Seed initial admin accounts
   * This should only be used during initial setup or for testing
   */
  async seedAdmins(req: Request, res: Response) {
    try {
      // Check if there are any existing admins
      const adminCount = await Admin.countDocuments();
      
      // Only allow seeding if no admins exist
      if (adminCount > 0) {
        return res.status(400).json({
          success: false,
          message: "Admin accounts already exist. Seeding is only allowed for initial setup.",
        });
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

      return res.status(201).json({
        success: true,
        message: "Admin accounts seeded successfully",
        data: {
          superAdmin: {
            email: superAdmin.email,
            fullName: superAdmin.fullName,
            role: superAdmin.role,
          },
          standardAdmin: {
            email: standardAdmin.email,
            fullName: standardAdmin.fullName,
            role: standardAdmin.role,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get all admins
   * Only accessible by super admins
   */
  async getAllAdmins(req: AuthRequest, res: Response) {
    try {
      // Check if the requester is a super admin
      const requestingAdmin = await Admin.findById(req.userId);
      if (!requestingAdmin || requestingAdmin.role !== 'super') {
        return res.status(403).json({
          success: false,
          message: "Only super admins can view all admin accounts",
        });
      }

      // Get all admins (excluding password field)
      const admins = await Admin.find().select('-password');

      return res.json({
        success: true,
        data: {
          admins,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Update an admin account
   * Admins can update their own profile, super admins can update any admin
   */
  /**
   * Change admin password
   * Admins can change their own password, super admins can change any admin's password
   */
  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { adminId } = req.params;
      const { currentPassword, newPassword } = req.body;
      
      // Check if the requester is authorized (either changing their own password or is a super admin)
      const requestingAdmin = await Admin.findById(req.userId);
      if (!requestingAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized access",
        });
      }
      
      // Find the admin whose password is being changed
      const adminToUpdate = await Admin.findById(adminId);
      if (!adminToUpdate) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }
      
      // If changing own password, verify current password
      if (adminId === req.userId) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: "Current password is required",
          });
        }
        
        const isValidPassword = await bcrypt.compare(currentPassword, adminToUpdate.password);
        if (!isValidPassword) {
          return res.status(400).json({
            success: false,
            message: "Current password is incorrect",
          });
        }
      } else if (requestingAdmin.role !== 'super') {
        // If not changing own password and not a super admin, deny access
        return res.status(403).json({
          success: false,
          message: "You can only change your own password unless you are a super admin",
        });
      }
      
      // Validate new password
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters",
        });
      }
      
      // Hash and save new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      adminToUpdate.password = hashedPassword;
      await adminToUpdate.save();
      
      return res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateAdmin(req: AuthRequest, res: Response) {
    try {
      const { adminId } = req.params;
      const { fullName, email } = req.body;
      
      // Check if the requester is authorized (either updating their own account or is a super admin)
      const requestingAdmin = await Admin.findById(req.userId);
      if (!requestingAdmin) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized access",
        });
      }
      
      // Only allow self-update or super admin update
      if (adminId !== req.userId && requestingAdmin.role !== 'super') {
        return res.status(403).json({
          success: false,
          message: "You can only update your own account unless you are a super admin",
        });
      }
      
      // Find the admin to update
      const adminToUpdate = await Admin.findById(adminId);
      if (!adminToUpdate) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }
      
      // Validate and update fields
      if (email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            message: "Please enter a valid email address",
          });
        }
        
        // Check if email is already in use by another admin
        if (email !== adminToUpdate.email) {
          const existingAdmin = await Admin.findOne({ email });
          if (existingAdmin) {
            return res.status(400).json({
              success: false,
              message: "Email is already registered",
            });
          }
          adminToUpdate.email = email;
        }
      }
      
      // Update full name if provided
      if (fullName) {
        if (fullName.trim().length < 3) {
          return res.status(400).json({
            success: false,
            message: "Name must be at least 3 characters",
          });
        }
        adminToUpdate.fullName = fullName.trim();
      }
      
      await adminToUpdate.save();
      
      return res.json({
        success: true,
        message: "Admin profile updated successfully",
        data: {
          admin: {
            id: adminToUpdate._id,
            fullName: adminToUpdate.fullName,
            email: adminToUpdate.email,
            role: adminToUpdate.role,
            isBlocked: adminToUpdate.isBlocked,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
