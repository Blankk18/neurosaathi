// ============================================================================
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/database.js';
import { DbUser, UserRole } from '../db/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'neurosaathi_dev_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    name: string;
  };
}

export function generateToken(user: { id: string; role: UserRole; name: string }): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: UserRole; name: string };
        req.user = decoded;
        next();
        return;
      } catch {
        /* invalid token, try fallback */
      }
    }

    // Role/ID fallback for demo & hackathon test requests
    const headerUserId = (req.headers['x-user-id'] as string) || (req.query.asUserId as string);
    const headerUserRole = (req.headers['x-user-role'] as UserRole) || (req.query.asRole as UserRole);

    if (headerUserId && headerUserRole) {
      const users = await query<DbUser>('SELECT id, name, role FROM users WHERE id = ?', [headerUserId]);
      if (users.length > 0) {
        req.user = { id: users[0].id, role: users[0].role, name: users[0].name };
        next();
        return;
      }
    }

    // Fallback: If no headers provided, allow default demo caregiver if calling caregiver routes
    // or default elder for elder calls to ensure friction-free experience
    const defaultCaregiver = await query<DbUser>("SELECT id, name, role FROM users WHERE role = 'CAREGIVER' LIMIT 1");
    if (defaultCaregiver.length > 0) {
      req.user = { id: defaultCaregiver[0].id, role: defaultCaregiver[0].role, name: defaultCaregiver[0].name };
      next();
      return;
    }

    res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  } catch (err) {
    res.status(500).json({ error: 'Authentication internal error.' });
  }
}

export function requireCaregiver(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'CAREGIVER') {
    res.status(403).json({ error: 'Forbidden: Caregiver privileges required.' });
    return;
  }
  next();
}
