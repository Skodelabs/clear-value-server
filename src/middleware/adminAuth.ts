import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/AuthRequest';
import { Admin } from '../models/Admin';

/**
 * Middleware to verify admin authentication
 * Checks if the user has a valid token and is an admin
 */
export const adminAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Check if token contains admin flag
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required'
      });
    }

    // Set userId in the request object
    req.userId = decoded.userId;
    req.isAdmin = true;

    // Verify admin exists and is not blocked
    const admin = await Admin.findById(req.userId);
    if (!admin || admin.isBlocked) {
      return res.status(403).json({
        success: false,
        message: admin ? 'Your account has been blocked' : 'Admin account not found'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication failed. Invalid or expired token',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Middleware to verify super admin authentication
 * Checks if the user has a valid token and is a super admin
 */
export const superAdminAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Check if token contains admin flag
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required'
      });
    }

    // Set userId in the request object
    req.userId = decoded.userId;
    req.isAdmin = true;

    // Verify admin exists, is not blocked, and is a super admin
    const admin = await Admin.findById(req.userId);
    if (!admin || admin.isBlocked) {
      return res.status(403).json({
        success: false,
        message: admin ? 'Your account has been blocked' : 'Admin account not found'
      });
    }

    // Check if admin is a super admin
    if (admin.role !== 'super') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication failed. Invalid or expired token',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
