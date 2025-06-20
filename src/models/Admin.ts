import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  email: string;
  password: string;
  fullName: string;
  isBlocked: boolean;
  role: string;
  lastLogin: Date;
}

const AdminSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true, minlength: 3 },
  isBlocked: { type: Boolean, default: false },
  role: { type: String, enum: ['super', 'standard'], default: 'standard' },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
