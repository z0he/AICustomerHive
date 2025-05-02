import { Request, Response, NextFunction } from 'express';

// Extended Request type to include user property
interface AuthenticatedRequest extends Request {
  user?: any;
}

// Simple authentication check (temporary/mock implementation)
// In a production environment, this would use proper sessions or JWT validation
export function checkAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // For development purposes, assume the user is authenticated
  // with a basic user object unless explicitly testing auth failure
  if (!req.user) {
    req.user = { id: 1, name: 'John Doe', username: 'johndoe', initials: 'JD' };
  }
  
  // In production, check for a valid session or JWT token
  // if (!req.session?.userId) {
  //   return res.status(401).json({ message: 'Authentication required' });
  // }
  
  return next();
}

// Middleware to check if the user has admin role
export function checkAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // For development purposes
  if (!req.user) {
    req.user = { id: 1, name: 'Admin User', username: 'admin', initials: 'AU', role: 'admin' };
  }
  
  // In production, verify user role from database or token
  // if (!req.user || req.user.role !== 'admin') {
  //   return res.status(403).json({ message: 'Admin access required' });
  // }
  
  return next();
}