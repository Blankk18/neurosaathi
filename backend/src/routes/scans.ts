// ============================================================================
// FACE SCAN EVENT LOGGING & HISTORY ROUTES
// ============================================================================

import { Router } from 'express';
import { requireAuth, requireCaregiver, AuthRequest } from '../middleware/auth.js';
import { FaceService } from '../services/faceService.js';
import { ScanResult } from '../db/schema.js';

export const scansRouter = Router();

/**
 * POST /api/face/scans
 * Record an authoritative face scan event upon login attempt.
 * Does NOT accept or store raw video frames or camera screenshots.
 */
scansRouter.post('/scans', async (req, res) => {
  try {
    const { userId = 'patient-1', result, faceDistance, deviceSessionId, photo } = req.body;

    const validResults: ScanResult[] = [
      'MATCHED',
      'NOT_RECOGNIZED',
      'NO_FACE',
      'MULTIPLE_FACES',
      'ERROR',
    ];

    if (!result || !validResults.includes(result)) {
      res.status(400).json({ error: `Invalid result. Must be one of: ${validResults.join(', ')}` });
      return;
    }

    const event = await FaceService.recordScanEvent({
      userId,
      result,
      faceDistance: typeof faceDistance === 'number' ? faceDistance : null,
      deviceSessionId: deviceSessionId || null,
      photo: typeof photo === 'string' ? photo : null,
    });

    res.status(201).json({
      success: true,
      event,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record scan event.' });
  }
});

/**
 * GET /api/face/scans/:userId
 * Caregiver retrieves authoritative scan history for an elder.
 * Requires CAREGIVER role.
 */
scansRouter.get('/scans/:userId', requireAuth, requireCaregiver, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId as string;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const history = await FaceService.getScanHistory(userId, limit, offset);

    res.json({
      userId,
      count: history.length,
      limit,
      offset,
      events: history,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch scan history.' });
  }
});
