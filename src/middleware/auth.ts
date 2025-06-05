import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/AuthRequest';

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  console.log(token);
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log(decoded);
    // Set userId in the request object instead of the body
    // This makes it accessible throughout the request lifecycle
    req.userId = (decoded as any).userId;
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication failed. Invalid or expired token' 
    });
  }
};
