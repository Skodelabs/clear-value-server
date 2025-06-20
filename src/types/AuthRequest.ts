import { Request } from 'express';

// Define an extended Request type that includes userId and isAdmin flag
export interface AuthRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}
