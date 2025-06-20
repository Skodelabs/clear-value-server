import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  fullName: string;
  isVerified: boolean;
  isBlocked: boolean;
  termsAccepted: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true, minlength: 3 },
  isVerified: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  termsAccepted: { type: Boolean, required: true, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

export const User = mongoose.model<IUser>('User', UserSchema);
