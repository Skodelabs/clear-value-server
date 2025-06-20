import { Request, Response } from "express";
import { User } from "../models/User";
import { AuthRequest } from "../types/AuthRequest";
import mongoose from "mongoose";
import Report from "../models/Report";

export class UserManagementController {
  /**
   * Get all users with pagination and filtering options
   * Only accessible by admins
   */
  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      // Check if user is authenticated and is an admin
      if (!req.userId || !req.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Admin privileges required to access user data"
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Build filter query
      const filterQuery: any = {};

      // Apply search filter if provided
      if (req.query.search) {
        const searchTerm = req.query.search as string;
        filterQuery.$or = [
          { "email": { $regex: searchTerm, $options: "i" } },
          { "fullName": { $regex: searchTerm, $options: "i" } }
        ];
      }

      // Apply verification filter if provided
      if (req.query.isVerified !== undefined) {
        filterQuery.isVerified = req.query.isVerified === 'true';
      }

      // Apply blocked filter if provided
      if (req.query.isBlocked !== undefined) {
        filterQuery.isBlocked = req.query.isBlocked === 'true';
      }

      // Get total count for pagination
      const totalCount = await User.countDocuments(filterQuery);

      // Get users with pagination
      const users = await User.find(filterQuery, { password: 0 }) // Exclude password field
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Format the response
      const formattedUsers = users.map(user => ({
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }));

      return res.json({
        success: true,
        data: formattedUsers,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Get a specific user by ID
   * Only accessible by admins
   */
  async getUserById(req: AuthRequest, res: Response) {
    try {
      // Check if user is authenticated and is an admin
      if (!req.userId || !req.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Admin privileges required to access user data"
        });
      }

      const { userId } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format"
        });
      }

      // Find user by ID
      const user = await User.findById(userId, { password: 0 }); // Exclude password field

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Get user's report count
      const reportCount = await Report.countDocuments({ userId: user._id });

      // Format the response
      const userData = {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        termsAccepted: user.termsAccepted,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        reportCount
      };

      return res.json({
        success: true,
        data: userData
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Block or unblock a user
   * Only accessible by admins
   */
  async blockUser(req: AuthRequest, res: Response) {
    try {
      // Check if user is authenticated and is an admin
      if (!req.userId || !req.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Admin privileges required to block/unblock users"
        });
      }

      const { userId } = req.params;
      const { isBlocked } = req.body;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format"
        });
      }

      // Find user by ID
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Update block status
      user.isBlocked = !!isBlocked;
      await user.save();

      return res.json({
        success: true,
        message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
        data: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          isBlocked: user.isBlocked
        }
      });
    } catch (error) {
      console.error("Error updating user block status:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Delete a user and all their associated data
   * Only accessible by admins
   */
  async deleteUser(req: AuthRequest, res: Response) {
    try {
      // Check if user is authenticated and is an admin
      if (!req.userId || !req.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Admin privileges required to delete users"
        });
      }

      const { userId } = req.params;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format"
        });
      }

      // Find user by ID
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Delete all reports associated with the user
      const deleteReportsResult = await Report.deleteMany({ userId: user._id });
      const deletedReportsCount = deleteReportsResult.deletedCount || 0;

      // Delete the user
      await User.findByIdAndDelete(userId);

      return res.json({
        success: true,
        message: "User deleted successfully",
        data: {
          email: user.email,
          fullName: user.fullName,
          deletedReportsCount
        }
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Get user statistics for admin dashboard
   * Only accessible by admins
   */
  async getUserStats(req: AuthRequest, res: Response) {
    try {
      // Check if user is authenticated and is an admin
      if (!req.userId || !req.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Admin privileges required to access user statistics"
        });
      }

      // Get total user count
      const totalUsers = await User.countDocuments();
      
      // Get verified users count
      const verifiedUsers = await User.countDocuments({ isVerified: true });
      
      // Get blocked users count
      const blockedUsers = await User.countDocuments({ isBlocked: true });
      
      // Get new users in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

      // Get total reports count
      const totalReports = await Report.countDocuments();

      return res.json({
        success: true,
        data: {
          totalUsers,
          verifiedUsers,
          blockedUsers,
          newUsers,
          totalReports
        }
      });
    } catch (error) {
      console.error("Error fetching user statistics:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}
