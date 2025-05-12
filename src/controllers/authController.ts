import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export class AuthController {
  async signup(req: Request, res: Response) {
    try {
      const { email, password, fullName, termsAccepted } = req.body;

      // Validate terms acceptance
      if (!termsAccepted) {
        return res.status(400).json({
          success: false,
          message: 'You must accept the terms and conditions'
        });
      }

      // Validate full name
      if (!fullName?.trim() || fullName.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Name must be at least 3 characters'
        });
      }

      // Validate email format with the same regex as frontend
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address'
        });
      }

      // Validate password length
      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }

      // Check existing user
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user with matching frontend fields
      const user = new User({
        email,
        password: hashedPassword,
        fullName,
        isVerified: false
      });

      await user.save();

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      // Return response matching frontend expectations
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            isVerified: user.isVerified
          },
          token
        }
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false,
        message: 'Server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      return res.json({ token });
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  async verify(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.isVerified = true;
      await user.save();

      return res.json({ message: 'User verified successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  }

  async logout(req: Request, res: Response) {
    // Since we're using JWT, we just need to remove the token from the client
    return res.json({ message: 'Logged out successfully' });
  }
}
