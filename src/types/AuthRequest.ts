import { Request } from 'express';

// Define an extended Request type that includes userId
export interface AuthRequest extends Request {
  userId?: string;
}
