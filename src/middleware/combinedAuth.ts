import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/AuthRequest';
import { User } from '../models/User';
import { Admin } from '../models/Admin';

/**
 * Combined authentication middleware that accepts either user or admin tokens
 * This allows routes to be accessed by both regular users and admins
 */
export const combinedAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Set userId in the request object
    req.userId = decoded.userId;
    
    // Check if this is an admin token
    if (decoded.isAdmin) {
      req.isAdmin = true;
      
      // Verify admin exists and is not blocked
      const admin = await Admin.findById(req.userId);
      if (!admin || admin.isBlocked) {
        return res.status(403).json({
          success: false,
          message: admin ? 'Your account has been blocked' : 'Admin account not found'
        });
      }
    } else {
      // For regular users, verify they exist
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
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
