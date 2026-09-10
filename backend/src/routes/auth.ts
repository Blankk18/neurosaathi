// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

import { Router } from 'express';
import { generateToken, requireAuth, AuthRequest } from '../middleware/auth.js';
import { query } from '../db/database.js';
import { DbUser, UserRole } from '../db/schema.js';

export const authRouter = Router();

// Login / session creation
authRouter.post('/login', async (req, res) => {
  try {
    const { role = 'ELDER', userId } = req.body as { role?: UserRole; userId?: string };

    let user: DbUser | undefined;
    if (userId) {
      const users = await query<DbUser>('SELECT id, name, role FROM users WHERE id = ?', [userId]);
      user = users[0];
    }

    if (!user) {
      const users = await query<DbUser>('SELECT id, name, role FROM users WHERE role = ? LIMIT 1', [role]);
      user = users[0];
    }

    if (!user) {
      res.status(404).json({ error: 'User not found for role' });
      return;
    }

    const token = generateToken({ id: user.id, role: user.role, name: user.name });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Current user profile
authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});
