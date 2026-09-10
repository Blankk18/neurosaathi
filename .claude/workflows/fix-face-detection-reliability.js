export const meta = {
  name: 'fix-face-detection-reliability',
  description: 'Audit and fix real-time face detection reliability issues',
  phases: [
    { title: 'Audit', detail: 'Identify every root cause of detection failures' },
    { title: 'Fix core pipeline', detail: 'Detector tuning, loop architecture, mirroring' },
    { title: 'Fix UX states', detail: 'Guide overlay, quality checks, enrollment, debug' },
    { title: 'Verify', detail: 'Build + checklist pass' },
  ],
};

phase('Audit');

const auditResults = await pipeline(
  [
    {
      key: 'detector-config',
      prompt: `Audit C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\useFaceRecognition.ts and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\faceRecognition.config.ts and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\faceRecognition.service.ts

Focus specifically on:
1. What TinyFaceDetectorOptions are used at runtime? (inputSize, scoreThreshold) — is the threshold too strict causing missed detections?
2. Is there any dynamic threshold adjustment?
3. What is RECOGNITION_INTERVAL_MS and is the loop architecture correct (rAF+timestamp vs setInterval, isProcessingRef)?
4. What are FACE_MATCH_THRESHOLD and REQUIRED_CONSECUTIVE_MATCHES values?
5. Are there overly strict alignment/quality gates that reject valid faces before matching?
6. Quote exact line numbers and values. Be precise.`,
    },
    {
      key: 'mirroring-overlay',
      prompt: `Audit C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\LiveFaceScanner.tsx and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\FaceStatus.tsx and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\FaceLogin.tsx and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\FaceEnrollment.tsx

Focus on:
1. Is there any CSS mirroring (scaleX(-1), scale-x-[-1], transform mirroring) on the video element?
2. Does LiveFaceScanner render an actual detection bounding box from real face coordinates, or just a fake static oval?
3. Are all required face states shown (NO CAMERA, NO FACE, FACE DETECTED, TOO FAR, TOO CLOSE, MULTIPLE FACES, VERIFYING, MATCH, NO MATCH)?
4. Is there a debug mode gated by import.meta.env.DEV?
5. Quote exact findings with file:line.`,
    },
    {
      key: 'camera-lifecycle',
      prompt: `Audit C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\useFaceRecognition.ts and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\FaceLogin.tsx and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\FaceEnrollment.tsx and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\faceRecognition.service.ts and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\pages\\patient\\FaceSetup.tsx if it exists.

Focus on:
1. Does video.play() handle autoplay correctly? Is video.readyState / videoWidth checked before detection?
2. Is the camera properly cleaned up on every exit path (stream.getTracks().forEach stop, video.srcObject=null, loop cancellation)?
3. Is there any stale closure or missing ref that could cause detection to silently fail?
4. Are model loading errors surfaced to the user or swallowed?
5. Is there proper handling for permission denied, camera busy, no camera, etc?
6. Quote exact findings with file:line.`,
    },
    {
      key: 'enrollment-storage',
      prompt: `Audit C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\faceRecognition.service.ts and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\FaceEnrollment.tsx and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\useFaceRecognition.ts

Focus on:
1. How many enrollment samples are captured and what validates them (no face / multiple faces / too small / outside frame)?
2. How are descriptors stored — IndexedDB or React state? Any size/serialization issues?
3. During login matching: is the comparison real euclidean distance with a real threshold, or any fake confidence?
4. Is the "3 consecutive matches" gate correctly implemented — does it reset on face disappearance and on wrong person?
5. Is multi-face detection enforced as a hard authentication refusal (not just a UI message)?
6. Quote exact findings with file:line.`,
    },
  ],
  async (item) => {
    const result = await agent(item.prompt, {
      label: `audit:${item.key}`,
      phase: 'Audit',
    });
    return { key: item.key, result };
  }
);

phase('Fix core pipeline');

const fixes = await pipeline(
  [
    {
      key: 'detector-and-loop',
      file: 'src/face/useFaceRecognition.ts',
      instruction: `Fix C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\useFaceRecognition.ts:

PROBLEMS TO FIX:
1. Detector threshold 0.5 is too strict — change to 0.35 and inputSize from 320 to 416 for better detection at distance/tilt/glasses. Make it configurable so if detection still fails it can dynamically lower threshold to 0.25.
2. Replace setInterval loop with requestAnimationFrame + timestamp check (every 150-300ms, use RECOGNITION_INTERVAL_MS from config). Add isProcessingRef to prevent overlapping inference.
3. Add video readiness guard: skip tick if video.videoWidth === 0 || video.readyState < 2
4. Fix liveness flow — it currently blocks matching entirely until movement is detected, which causes "never matches if user holds still". Make liveness non-blocking: count movement but dont prevent matching if movement was already seen. Or make the liveness gate more lenient.
5. Loosen alignment gates: isWellAligned is too strict (0.18 x, 0.28 y) — allow more tilt/offset. The "guiding" state should give hints but not reset consecutive matches harshly — only reset if face truly lost.
6. Ensure consecutive counter resets correctly on face disappearance and wrong person.
7. Keep all existing types, imports, and the overall hook shape.

Read the file carefully before editing. Make precise surgical fixes.`,
    },
    {
      key: 'config-tuning',
      file: 'src/face/faceRecognition.config.ts',
      instruction: `Fix C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\faceRecognition.config.ts:

1. Ensure FACE_MATCH_THRESHOLD is 0.55 (reasonable) and documented
2. Ensure RECOGNITION_INTERVAL_MS is 200 (within 150-300 range)
3. Verify CAMERA_CONSTRAINTS uses facingMode user, 1280x720 ideal
4. Add detector config constants: DETECTOR_INPUT_SIZE = 416, DETECTOR_SCORE_THRESHOLD = 0.35, DETECTOR_SCORE_THRESHOLD_RELAXED = 0.25
5. These will be used by useFaceRecognition for TinyFaceDetectorOptions

Read the file first, then make precise edits keeping existing structure.`,
    },
    {
      key: 'service-improvements',
      file: 'src/face/faceRecognition.service.ts',
      instruction: `Fix C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\faceRecognition.service.ts:

1. Verify analyzeFrame correctly uses detectAllFaces(video, detector).withFaceLandmarks().withFaceDescriptors() — ensure video is actually playing and has dimensions
2. Ensure alignmentFor and isWellAligned thresholds are not too strict
3. Add a helper to get relaxed detector options if primary detection fails repeatedly
4. Ensure model loading from FACE_MODELS_URL (/models) handles errors visibly (dont swallow)
5. Keep IndexedDB storage as-is — it is correct

Read the file first, make surgical fixes only.`,
    },
    {
      key: 'scanner-overlay',
      file: 'src/face/LiveFaceScanner.tsx',
      instruction: `Fix C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\LiveFaceScanner.tsx:

CRITICAL FIXES:
1. Verify video element has NO mirroring transform (no scaleX(-1) or scale-x-[-1]). If any exists, remove it. Preview must be non-mirrored.
2. Add real detection bounding box rendering: when a face is detected, render an actual box at the detected coordinates (from alignment/box data). Pass the face detection box as a prop and render it as an absolutely positioned div over the video. The box must track the real face position, not be a fake static oval.
3. The oval guide should remain as a subtle hint when NO face is detected, but when a face IS detected, show the real bounding box.
4. Add DEV-only debug overlay gated by import.meta.env.DEV showing: face detected YES/NO, count, score if available, distance, match status, resolution, model status
5. Keep the component presentational — receive data via props including box/detection info
6. If the current alignment prop only has x/y/size, add support for receiving the actual detection box {x,y,width,height} for precise overlay

Read the file first. The component currently only shows a fake static oval — this must become a real detection-aware overlay.`,
    },
  ],
  async (item) => {
    const result = await agent(item.instruction, {
      label: `fix:${item.key}`,
      phase: 'Fix core pipeline',
    });
    return { key: item.key, result };
  }
);

phase('Fix UX states');

const uxFixes = await pipeline(
  [
    {
      key: 'status-states',
      file: 'src/face/FaceStatus.tsx + types.ts',
      instruction: `Fix face status and types for the urgent face detection reliability update.

In C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\FaceStatus.tsx and C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\types.ts:

1. Ensure all required states have distinct friendly messages:
   - no camera / camera error
   - no face: "Please look at the camera"
   - face detected: "Face detected"  
   - too far: "Move a little closer"
   - too close: "Move a little farther"
   - multiple faces: "Please make sure only one person is visible"
   - verifying: "Verifying your face..."
   - match: "Face recognized"
   - no match: "Face not recognized"
2. Ensure FaceStatusInfo supports all needed states
3. Add face box type if needed for scanner overlay
4. Fix any stale or incorrect i18n keys

Read both files first.`,
    },
    {
      key: 'enrollment-hardening',
      file: 'src/face/FaceEnrollment.tsx',
      instruction: `Fix C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\FaceEnrollment.tsx:

1. Enrollment must reject invalid samples: no face, multiple faces, face too small, face partially outside frame — all before capturing
2. Capture 5-10 samples with slight head position variation (the hook already handles movement-gated capture — verify the enrollment path in the hook is correct)
3. Show progress clearly, handle save failure
4. Ensure camera cleanup on unmount/cancel/done
5. Keep modal structure, just harden validation

Read the file first.`,
    },
    {
      key: 'login-integration',
      file: 'src/face/FaceLogin.tsx + i18n',
      instruction: `Fix C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\face\\FaceLogin.tsx and add any missing i18n keys to C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi\\src\\i18n\\en.ts (also hi.ts and gu.ts if they exist):

1. Ensure FaceLogin properly passes detection box data to LiveFaceScanner for real overlay
2. Ensure onSuccess only fires after real consecutive matches (hook handles this — just verify wiring)
3. Ensure PIN fallback is always visible, camera cleanup on close/unmount
4. Add any missing face.* i18n keys needed for the new states (tooFar, tooClose, debug labels, etc.)
5. Keep existing role/state architecture — elder only

Read all files first. For i18n, check what keys already exist before adding duplicates.`,
    },
  ],
  async (item) => {
    const result = await agent(item.instruction, {
      label: `fix:${item.key}`,
      phase: 'Fix UX states',
    });
    return { key: item.key, result };
  }
);

phase('Verify');

const verification = await agent(
  `Verify the face detection fixes in C:\\Users\\omnat\\Desktop\\omniroute\\neurosaathi:

1. Run: npm run build — must pass with zero TypeScript errors (fix any you find)
2. Check that src/face/useFaceRecognition.ts now uses:
   - TinyFaceDetectorOptions with inputSize 416, scoreThreshold 0.35 (not 320/0.5)
   - requestAnimationFrame + timestamp throttling (not setInterval)
   - isProcessingRef guard
   - video readiness check (videoWidth, readyState)
3. Check that src/face/LiveFaceScanner.tsx has no mirroring and renders real detection box
4. Check that no file has scaleX(-1) or scale-x-[-1] on video
5. Verify the checklist items from the spec can all pass

Report what passes and what still needs manual camera testing.`,
  { label: 'verify:build-and-checklist', phase: 'Verify' }
);

return { auditResults, fixes, uxFixes, verification };
