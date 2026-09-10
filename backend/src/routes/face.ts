// ============================================================================
// FACE BIOMETRIC MANAGEMENT ROUTES
// ============================================================================

import { Router } from 'express';
import { requireAuth, requireCaregiver, AuthRequest } from '../middleware/auth.js';
import { FaceService } from '../services/faceService.js';

export const faceRouter = Router();

/**
 * POST /api/face/enroll
 * Caregiver initiates face enrollment for an elder.
 * Requires CAREGIVER role.
 */
faceRouter.post('/enroll', requireAuth, requireCaregiver, async (req: AuthRequest, res) => {
  try {
    const { userId, samples, modelVersion = 'face-api-v1' } = req.body;

    if (!userId || !samples || !Array.isArray(samples)) {
      res.status(400).json({ error: 'userId and an array of face samples are required.' });
      return;
    }

    if (samples.length < 5) {
      res.status(400).json({ error: 'At least 5 valid biometric samples are required for enrollment.' });
      return;
    }

    const result = await FaceService.storeEnrollment(userId, samples, modelVersion);

    // Also record an initial enrollment scan event
    await FaceService.recordScanEvent({
      userId,
      result: 'MATCHED',
      faceDistance: 0,
      deviceSessionId: 'enrollment-baseline',
    });

    res.json({
      success: true,
      message: 'Face enrollment successfully stored.',
      enrolledCount: result.samplesCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to store face enrollment.' });
  }
});

/**
 * GET /api/face/status/:userId
 * Check elder's enrollment status without exposing raw embeddings.
 * Requires CAREGIVER role.
 */
faceRouter.get('/status/:userId', requireAuth, requireCaregiver, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId as string;
    const status = await FaceService.getEnrollmentStatus(userId);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch face status.' });
  }
});

/**
 * DELETE /api/face/enrollment/:userId
 * Reset/Deactivate face enrollment.
 * Requires CAREGIVER role.
 */
faceRouter.delete('/enrollment/:userId', requireAuth, requireCaregiver, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId as string;
    await FaceService.resetEnrollment(userId);
    res.json({ success: true, message: 'Face enrollment reset successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset enrollment.' });
  }
});

/**
 * GET /api/face/profile-for-login/:userId
 * Internal reference descriptor retrieval for elder client-side matching.
 * Only returns descriptors needed for Euclidean distance comparison against live video.
 */
faceRouter.get('/profile-for-login/:userId', async (req, res) => {
  try {
    const userId = req.params.userId as string;
    const profile = await FaceService.getActiveEmbeddingsForMatching(userId);

    if (!profile) {
      res.status(404).json({ enrolled: false, message: 'No active face enrollment found.' });
      return;
    }

    res.json({
      enrolled: true,
      samples: profile.samples,
      modelVersion: profile.modelVersion,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve profile for matching.' });
  }
});
