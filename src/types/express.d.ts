import { Multer } from 'multer';

declare module 'express' {
  interface Request {
    file?: Express.Multer.File;
  }
} 