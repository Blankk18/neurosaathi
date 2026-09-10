// ============================================================================
// FACE SERVICE — Backend Biometric Storage & Scan Event Logging
// ============================================================================

import crypto from 'node:crypto';
import { query, run } from '../db/database.js';
import { DbFaceEnrollment, DbFaceScanEvent, ScanResult } from '../db/schema.js';

export interface EnrollmentStatus {
  isEnrolled: boolean;
  samplesCount: number;
  modelVersion: string | null;
  enrolledAt: string | null;
  lastSuccessfulScan: string | null;
  lastFailedScan: string | null;
  lastPhoto: string | null;
}

export class FaceService {
  /**
   * Securely store or update face enrollment embeddings.
   * Expects 5-10 numerical face descriptor samples (128 floats each).
   * Embeddings are stored in the database and never exposed through public GET APIs.
   */
  static async storeEnrollment(
    userId: string,
    samples: number[][],
    modelVersion = 'face-api-v1'
  ): Promise<{ success: boolean; samplesCount: number }> {
    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      throw new Error('Valid face samples are required for enrollment.');
    }

    // Deactivate any existing active enrollments for this user
    await run('UPDATE face_enrollments SET is_active = 0, updated_at = ? WHERE user_id = ?', [
      new Date().toISOString(),
      userId,
    ]);

    const id = `enroll-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const serializedEmbedding = JSON.stringify(samples);

    await run(
      `INSERT INTO face_enrollments (id, user_id, embedding, model_version, created_at, updated_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [id, userId, serializedEmbedding, modelVersion, now, now]
    );

    return { success: true, samplesCount: samples.length };
  }

  /**
   * Reset / deactivate enrollment for a user.
   */
  static async resetEnrollment(userId: string): Promise<boolean> {
    await run('UPDATE face_enrollments SET is_active = 0, updated_at = ? WHERE user_id = ?', [
      new Date().toISOString(),
      userId,
    ]);
    return true;
  }

  /**
   * Return enrollment status and stats WITHOUT exposing raw embeddings.
   */
  static async getEnrollmentStatus(userId: string): Promise<EnrollmentStatus> {
    const active = await query<DbFaceEnrollment>(
      'SELECT id, embedding, model_version, created_at FROM face_enrollments WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    const lastSuccess = await query<DbFaceScanEvent>(
      "SELECT timestamp, photo FROM face_scan_events WHERE user_id = ? AND result = 'MATCHED' ORDER BY timestamp DESC LIMIT 1",
      [userId]
    );

    const lastFailed = await query<DbFaceScanEvent>(
      "SELECT timestamp FROM face_scan_events WHERE user_id = ? AND result IN ('NOT_RECOGNIZED', 'MULTIPLE_FACES') ORDER BY timestamp DESC LIMIT 1",
      [userId]
    );

    const lastPhoto = lastSuccess[0]?.photo ?? null;

    if (active.length === 0) {
      return {
        isEnrolled: false,
        samplesCount: 0,
        modelVersion: null,
        enrolledAt: null,
        lastSuccessfulScan: lastSuccess[0]?.timestamp ?? null,
        lastFailedScan: lastFailed[0]?.timestamp ?? null,
        lastPhoto,
      };
    }

    let count = 0;
    try {
      const parsed = JSON.parse(active[0].embedding);
      count = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      count = 0;
    }

    return {
      isEnrolled: true,
      samplesCount: count,
      modelVersion: active[0].model_version,
      enrolledAt: active[0].created_at,
      lastSuccessfulScan: lastSuccess[0]?.timestamp ?? null,
      lastFailedScan: lastFailed[0]?.timestamp ?? null,
      lastPhoto,
    };
  }

  /**
   * Record a single authoritative face scan event.
   * Uses authoritative server timestamp and securely saves login verification snapshot if provided.
   */
  static async recordScanEvent(params: {
    userId: string;
    result: ScanResult;
    faceDistance: number | null;
    deviceSessionId: string | null;
    photo?: string | null;
  }): Promise<DbFaceScanEvent> {
    const id = `scan-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const photo = params.photo || null;

    await run(
      `INSERT INTO face_scan_events (id, user_id, timestamp, result, face_distance, device_session_id, photo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.userId,
        now,
        params.result,
        params.faceDistance,
        params.deviceSessionId,
        photo,
        now,
      ]
    );

    return {
      id,
      user_id: params.userId,
      timestamp: now,
      result: params.result,
      face_distance: params.faceDistance,
      device_session_id: params.deviceSessionId,
      photo,
      created_at: now,
    };
  }

  /**
   * Fetch scan history for a user (ordered by authoritative timestamp desc).
   */
  static async getScanHistory(userId: string, limit = 50, offset = 0): Promise<DbFaceScanEvent[]> {
    return query<DbFaceScanEvent>(
      `SELECT id, user_id, timestamp, result, face_distance, device_session_id, photo, created_at
       FROM face_scan_events
       WHERE user_id = ?
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
  }

  /**
   * Internal method for authenticated elder local face matching:
   * Returns enrolled descriptor array for the elder ONLY to verify against live camera.
   */
  static async getActiveEmbeddingsForMatching(userId: string): Promise<{ samples: number[][]; modelVersion: string } | null> {
    const active = await query<DbFaceEnrollment>(
      'SELECT embedding, model_version FROM face_enrollments WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (active.length === 0) return null;

    try {
      const samples = JSON.parse(active[0].embedding);
      return { samples, modelVersion: active[0].model_version };
    } catch {
      return null;
    }
  }
}
