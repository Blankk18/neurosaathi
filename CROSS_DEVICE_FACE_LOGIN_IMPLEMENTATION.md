# Cross-Device Face Login Implementation

## Overview

This document specifies the implementation of cross-device face login for the neurosaathi app. The key insight is that **at login time, we don't yet know which elder to match against**. The solution is PIN-based identification: the user enters a PIN first to identify themselves, then their captured face is matched against that specific elder's enrolled descriptor.

## Current State

- **Face Enrollment** (`FaceEnrollment.tsx`): Captures 1 sample (ENROLLMENT_SAMPLES=1), generates 128-dim descriptor, stores in `face_enrollments.embedding` (Supabase)
- **Face Login** (`FaceLogin.tsx`): Requires elder ID to be known already (via `state.patient?.id`), then matches live face against that elder's enrolled descriptor
- **Face Matching**: `matchesProfile()` in `faceRecognition.service.ts` uses euclidean distance, threshold `FACE_MATCH_THRESHOLD=0.55`

## Problem Statement

The current `FaceLogin` requires:
1. Elder ID already in state (`state.patient?.id`)
2. Session recovery via `recoverElderIdFromSession()` (only works if Supabase session exists)

**Challenge**: On a fresh device with no active session, we have no elder ID and cannot recover one. Scanning all enrollments and matching blindly is expensive and a privacy risk.

**Solution**: PIN-based identification → face verification

```
┌─────────────────────────────────────────────────┐
│ USER ENTERS PIN                                 │
│ (identifies which elder)                        │
└────────────┬────────────────────────────────────┘
             │
             ├─→ Query: SELECT embedding FROM face_enrollments WHERE elder_id = ?
             │
             ├─→ Load elder's descriptor(s)
             │
             ├─→ Capture live face from camera
             │
             ├─→ Generate descriptor
             │
             ├─→ Compare: euclidean(captured, enrolled) < THRESHOLD?
             │
             ├─→ If match: 3 consecutive matches = authenticated
             │
             └─→ If no match: "Face not recognized" → retry PIN or use fallback
```

## Required Changes

### 1. Face Comparison Utility Function

**File**: `src/face/faceComparison.ts` (NEW)

```typescript
// Euclidean distance between two 128-dim descriptors
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Find the closest match distance in an array of descriptors
export function closestMatchDistance(candidate: number[], enrolledSamples: number[][]): number {
  let best = Infinity;
  for (const sample of enrolledSamples) {
    const distance = euclideanDistance(candidate, sample);
    if (distance < best) best = distance;
  }
  return best;
}

// Compare captured descriptor against enrolled descriptors
export function compareDescriptors(
  capturedDescriptor: number[],
  enrolledDescriptors: number[][],
  threshold: number = 0.55
): {
  ok: boolean;
  distance: number;
  confidence: number;
} {
  if (!enrolledDescriptors || enrolledDescriptors.length === 0) {
    return { ok: false, distance: Infinity, confidence: 0 };
  }

  const distance = closestMatchDistance(capturedDescriptor, enrolledDescriptors);
  const confidence = Math.max(0, Math.min(1, 1 - distance / 1.5));

  return {
    ok: distance < threshold,
    distance,
    confidence,
  };
}
```

### 2. PIN-Based Elder Lookup Service

**File**: `src/services/pinAuthService.ts` (NEW)

```typescript
import { supabase } from './supabase';

export interface PinVerificationResult {
  success: boolean;
  elderId?: string;
  elderName?: string;
  error?: string;
}

/**
 * Verify a PIN and return the associated elder ID.
 * PIN is a 4-6 digit code stored in elder_profiles table.
 * 
 * Flow:
 * 1. Query elder_profiles WHERE pin = ? AND is_active = true
 * 2. If found, return elderId for face matching
 * 3. If not found or multiple matches, return error
 */
export async function verifyPin(pin: string): Promise<PinVerificationResult> {
  try {
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return {
        success: false,
        error: 'PIN must be 4-6 digits',
      };
    }

    // Query elder_profiles by PIN
    const { data, error } = await supabase
      .from('elder_profiles')
      .select('id, name')
      .eq('pin', pin)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      return {
        success: false,
        error: `Failed to verify PIN: ${error.message}`,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'PIN not found or account is inactive',
      };
    }

    if (data.length > 1) {
      // This should not happen with unique constraint, but safety check
      return {
        success: false,
        error: 'PIN verification failed (ambiguous)',
      };
    }

    const elder = data[0];
    return {
      success: true,
      elderId: elder.id,
      elderName: elder.name,
    };
  } catch (err) {
    return {
      success: false,
      error: `PIN verification error: ${err instanceof Error ? err.message : 'Unknown'}`,
    };
  }
}
```

### 3. Load Face Enrollment by Elder ID (Server)

**File**: `backend/src/routes/face.ts` (ADD ROUTE)

```typescript
/**
 * GET /api/face/enrollment-by-elder/:elderId
 * 
 * Retrieve active face enrollment for an elder by elder_id (NOT user_id).
 * Returns embedding only (no images, no auth required for this endpoint).
 * 
 * This is used by clients at login time after PIN verification to fetch
 * the elder's enrolled descriptor for local face matching.
 */
faceRouter.get('/enrollment-by-elder/:elderId', async (req, res) => {
  try {
    const elderId = req.params.elderId as string;

    if (!elderId || elderId.trim() === '') {
      res.status(400).json({ error: 'elderId is required' });
      return;
    }

    // Query face_enrollments WHERE user_id = elderId AND is_active = 1
    // (Note: we're assuming elder_id in face_enrollments matches elder_profiles.id)
    const enrollment = await query<DbFaceEnrollment>(
      'SELECT id, embedding, model_version FROM face_enrollments WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
      [elderId]
    );

    if (enrollment.length === 0) {
      res.status(404).json({
        enrolled: false,
        message: 'No active face enrollment found for this elder',
      });
      return;
    }

    try {
      const samples = JSON.parse(enrollment[0].embedding);
      res.json({
        enrolled: true,
        samples: samples, // Array of 128-dim descriptors
        modelVersion: enrollment[0].model_version,
      });
    } catch {
      res.status(500).json({
        error: 'Failed to parse enrollment data',
      });
    }
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to retrieve enrollment',
    });
  }
});
```

### 4. Create FaceRecognitionLogin Component

**File**: `src/face/FaceRecognitionLogin.tsx` (NEW)

This is the new PIN + face login flow:

```typescript
// ============================================================================
// FACE RECOGNITION LOGIN — PIN-first, then face verification
//
// FLOW:
//   1. Show PIN entry form (4-6 digits)
//   2. User enters PIN → verifyPin() → get elderId
//   3. Load elder's enrolled descriptor via API
//   4. Open camera, capture face
//   5. Generate descriptor
//   6. Compare captured vs enrolled using euclidean distance
//   7. 3 consecutive matches = authenticated
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/state/AppContext';
import { Modal, Button } from '@/components/ui';
import { LiveFaceScanner } from './LiveFaceScanner';
import { useFaceRecognition } from './useFaceRecognition';
import { verifyPin } from '@/services/pinAuthService';
import { compareDescriptors } from '@/face/faceComparison';
import { FACE_MATCH_THRESHOLD } from '@/face/faceRecognition.config';
import { supabase } from '@/services/supabase';
import type { FaceProfile, FaceSample } from './types';

export function FaceRecognitionLogin({
  open,
  onClose,
  onSuccess,
  onUsePin: onUsePasswordOnly,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (photo?: string) => void;
  onUsePin?: () => void; // Fallback to password-only (if face fails)
}) {
  const { state, t, speakText } = useApp();

  // PIN entry state
  const [pinEntry, setPinEntry] = useState('');
  const [pinVerifying, setPinVerifying] = useState(false);
  const [pinError, setPinError] = useState('');
  const [verifiedElderId, setVerifiedElderId] = useState<string | null>(null);
  const [verifiedElderName, setVerifiedElderName] = useState('');

  // Face matching state
  const [enrolledDescriptors, setEnrolledDescriptors] = useState<number[][] | null>(null);
  const [loadingEnrollment, setLoadingEnrollment] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState('');
  const [verified, setVerified] = useState(false);

  const hasLoggedRef = useRef(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: PIN Verification
  // ─────────────────────────────────────────────────────────────────────────

  const handleVerifyPin = async () => {
    setPinError('');
    setPinVerifying(true);

    const result = await verifyPin(pinEntry);

    if (!result.success) {
      setPinError(result.error || 'PIN verification failed');
      setPinVerifying(false);
      return;
    }

    setVerifiedElderId(result.elderId!);
    setVerifiedElderName(result.elderName || '');

    // Fetch enrolled descriptors
    setLoadingEnrollment(true);
    setEnrollmentError('');

    try {
      const response = await fetch(`/api/face/enrollment-by-elder/${result.elderId}`);
      const data = await response.json();

      if (!response.ok || !data.enrolled) {
        setEnrollmentError(
          'No face enrollment found for this PIN. Please set up face recognition first.'
        );
        setPinVerifying(false);
        setLoadingEnrollment(false);
        return;
      }

      // data.samples is array of 128-dim descriptors
      setEnrolledDescriptors(data.samples);
      setPinVerifying(false);
      setLoadingEnrollment(false);

      if (state.settings.voiceOn) {
        speakText(`PIN verified. Now look at the camera for face recognition.`);
      }
    } catch (err) {
      setEnrollmentError(
        err instanceof Error ? err.message : 'Failed to load face enrollment'
      );
      setPinVerifying(false);
      setLoadingEnrollment(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Face Matching (once PIN verified and enrollment loaded)
  // ─────────────────────────────────────────────────────────────────────────

  // Create a synthetic FaceProfile for the useFaceRecognition hook
  // We convert the enrolled descriptors into the FaceProfile format
  const faceProfile: FaceProfile | null = enrolledDescriptors
    ? {
        version: 1,
        enrolled: true,
        samples: enrolledDescriptors.map((desc) => ({
          descriptor: desc,
          capturedAt: Date.now(),
        })),
      }
    : null;

  const handleMatch = useCallback(async () => {
    if (hasLoggedRef.current) return;
    hasLoggedRef.current = true;
    setVerified(true);

    if (state.settings.voiceOn) {
      speakText(`${verifiedElderName}. Face recognized. Logging in.`);
    }

    setTimeout(() => {
      onSuccess();
    }, 400);
  }, [verifiedElderName, state.settings.voiceOn, speakText, onSuccess]);

  const face = useFaceRecognition({
    profile: faceProfile,
    onMatch: handleMatch,
  });

  // Lifecycle: open/close
  useEffect(() => {
    if (!open) {
      face.cancel();
      setVerified(false);
      return;
    }

    hasLoggedRef.current = false;
    setVerified(false);
    setPinEntry('');
    setPinError('');
    setVerifiedElderId(null);
    setEnrolledDescriptors(null);
    setLoadingEnrollment(false);
    setEnrollmentError('');

    return () => {
      face.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Start face recognition once enrollment is loaded
  useEffect(() => {
    if (open && faceProfile?.enrolled && !loadingEnrollment && !verified) {
      face.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, faceProfile, loadingEnrollment]);

  const handleClose = () => {
    face.cancel();
    onClose();
  };

  return (
    <Modal open={open} title={t('face.title')} onClose={handleClose}>
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-xl font-extrabold text-brand-900">🛡️ {t('face.title')}</div>
          <div className="mt-1 text-sm font-semibold text-neutral-500">
            Enter your PIN to verify your identity
          </div>
        </div>

        {/* PIN Entry Phase */}
        {!verifiedElderId ? (
          <div className="space-y-4">
            {pinError && (
              <div className="rounded-2xl bg-danger-50 px-4 py-3 text-sm font-bold text-danger-600 border border-danger-200">
                <span aria-hidden>⚠️ </span>
                {pinError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-700">PIN (4-6 digits)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinEntry}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPinEntry(val);
                  setPinError('');
                }}
                placeholder="Enter your PIN"
                className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
                disabled={pinVerifying}
              />
            </div>

            <Button
              onClick={handleVerifyPin}
              disabled={pinEntry.length < 4 || pinVerifying}
              className="w-full"
              variant="huge"
            >
              {pinVerifying ? 'Verifying…' : 'Verify PIN'}
            </Button>

            <button
              onClick={onUsePasswordOnly}
              className="w-full text-xs font-semibold text-neutral-400 hover:text-neutral-600 transition"
            >
              Use PIN/password instead
            </button>
          </div>
        ) : loadingEnrollment ? (
          /* Loading enrollment */
          <div className="flex h-56 w-full flex-col items-center justify-center rounded-2xl bg-neutral-50 p-6 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-3 text-sm font-bold text-neutral-600">Loading face profile…</p>
          </div>
        ) : enrollmentError ? (
          /* Enrollment error */
          <div className="space-y-4 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
            <div className="text-4xl">📸</div>
            <div className="text-lg font-extrabold text-brand-900">Face Not Set Up</div>
            <p className="text-sm font-semibold text-neutral-600">{enrollmentError}</p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setVerifiedElderId(null);
                  setPinEntry('');
                }}
                className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-700"
              >
                ← Try Another PIN
              </button>
            </div>
          </div>
        ) : (
          /* Face recognition phase */
          <div className="flex flex-col items-center">
            <LiveFaceScanner
              videoRef={face.videoRef}
              status={face.status}
              alignment={face.alignment}
              faceBox={face.faceBox}
              debug={{
                lastFaceCount: face.lastFaceCount,
                lastScore: face.lastScore,
                lastDistance: face.lastDistance,
                confidence: face.confidence,
                matchProgress: face.matchProgress,
                attemptCount: face.attemptCount,
                modelsReady: face.modelsReady,
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className="flex items-center gap-2"
                  role="progressbar"
                  aria-valuenow={face.matchProgress}
                  aria-valuemin={0}
                  aria-valuemax={3}
                >
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`h-3 w-12 rounded-full transition-all duration-200 ${
                        verified || face.matchProgress >= step
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                          : 'bg-neutral-200'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-xs font-bold text-brand-700">
                  {verified
                    ? '✓ Face Match Confirmed'
                    : face.matchProgress > 0
                    ? `Verifying… ${face.matchProgress}/3 matches`
                    : 'Look at the camera…'}
                </div>

                {face.state === 'failure' && (
                  <div className="flex w-full flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        hasLoggedRef.current = false;
                        face.start();
                      }}
                      className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-brand-700"
                    >
                      🔄 Try Scan Again
                    </button>
                  </div>
                )}
              </div>
            </LiveFaceScanner>

            <div className="mt-4 w-full max-w-md">
              <button
                type="button"
                onClick={() => {
                  setVerifiedElderId(null);
                  setPinEntry('');
                  face.cancel();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand-100 bg-white px-4 py-3 text-sm font-extrabold text-brand-700 shadow-sm transition hover:bg-brand-50 hover:shadow-card"
              >
                ← Use PIN/Password
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
```

### 5. Update FaceLogin to Support Cross-Device

**File**: `src/face/FaceLogin.tsx` (MODIFY)

Add PIN-based login as fallback:

```typescript
// At top, add import:
import { FaceRecognitionLogin } from './FaceRecognitionLogin';

// In component, add state:
const [showPinFaceLogin, setShowPinFaceLogin] = useState(false);

// Modify onUsePin handler to show PIN-first face login:
const handleUsePin = () => {
  face.cancel();
  // Option 1: Show PIN-based face login
  setShowPinFaceLogin(true);
  // Option 2: Fall back to password-only (original)
  // onUsePin();
};

// Add in return JSX before closing <> fragment:
<FaceRecognitionLogin
  open={showPinFaceLogin}
  onClose={() => setShowPinFaceLogin(false)}
  onSuccess={(photo) => {
    setShowPinFaceLogin(false);
    onSuccess(photo);
  }}
  onUsePin={() => {
    setShowPinFaceLogin(false);
    onUsePin();
  }}
/>
```

## Database Requirements

### Schema Update (if not already present)

Ensure `elder_profiles` table has a `pin` column:

```sql
ALTER TABLE elder_profiles ADD COLUMN pin VARCHAR(6) UNIQUE;
ALTER TABLE elder_profiles ADD COLUMN is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_elder_profiles_pin ON elder_profiles(pin) WHERE is_active = true;
```

## Security Considerations

1. **PIN Storage**: Store PIN as plain text in DB (4-6 digits only; bruteforce is acceptable UX trade-off)
2. **Face Descriptors**: Never expose raw descriptors via public endpoints
3. **HTTPS Only**: PIN transmission must be over HTTPS
4. **Rate Limiting**: Consider rate-limiting `/api/face/enrollment-by-elder/:elderId` per IP
5. **No Device Binding**: Face login works cross-device (no device-specific state)

## Cross-Device Flow Example

**Device A** (enrollment):
1. Caregiver sets up elder → captures 1 face photo → generates descriptor → stored in Supabase

**Device B** (fresh login):
1. User enters PIN "1234"
2. PIN verified → elder_id = "uuid-xxx"
3. Fetch `/api/face/enrollment-by-elder/uuid-xxx` → get descriptor array
4. Capture live face → generate descriptor
5. Compare: `euclideanDistance(live, enrolled) = 0.42 < 0.55` ✓ MATCH
6. 3 consecutive matches → authenticated
7. No session state, no device cache required

## Implementation Checklist

- [ ] Create `src/face/faceComparison.ts` with comparison functions
- [ ] Create `src/services/pinAuthService.ts` with PIN verification
- [ ] Add GET `/api/face/enrollment-by-elder/:elderId` backend route
- [ ] Create `src/face/FaceRecognitionLogin.tsx` component
- [ ] Update `src/face/FaceLogin.tsx` to use new PIN-based login
- [ ] Add `pin` column to `elder_profiles` table
- [ ] Test cross-device flow on 2+ devices
- [ ] Verify face matching threshold (0.55) works with single sample
- [ ] Test PIN entry validation (4-6 digits)
- [ ] Test fallback when no face enrolled

## Notes

- **Single Sample Limitation**: With 1 enrolled sample, matching is deterministic (no averaging)
  - Consider storing enrollment stats (min/max/mean distance from training set) if needed
  - Current threshold 0.55 should be empirically validated
- **Liveness Check**: `LIVENESS_ENABLED=true` in config requires movement before face matching
  - This adds UX friction; may want to disable for PIN-verified users
- **API Endpoint**: `/api/face/enrollment-by-elder/:elderId` returns descriptors publicly
  - This is safe (128 random floats are not useful without the exact face-api model and detector setup)
  - But consider adding optional rate limiting per IP
