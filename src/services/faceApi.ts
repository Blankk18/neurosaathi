// ============================================================================
// FRONTEND FACE RECOGNITION API CLIENT
// Connects to the NeuroSaathi backend for enrollment storage and scan logging.
// ============================================================================

export type ScanEventResult =
  | 'MATCHED'
  | 'NOT_RECOGNIZED'
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'ERROR';

export interface BackendScanEvent {
  id: string;
  user_id: string;
  timestamp: string;
  result: ScanEventResult;
  face_distance: number | null;
  device_session_id: string | null;
  photo?: string | null;
  created_at: string;
}

export interface BackendFaceStatus {
  isEnrolled: boolean;
  samplesCount: number;
  modelVersion: string | null;
  enrolledAt: string | null;
  lastSuccessfulScan: string | null;
  lastFailedScan: string | null;
  lastPhoto: string | null;
}

export interface EnrolledProfileResponse {
  enrolled: boolean;
  samples: number[][];
  modelVersion: string;
}

class FaceApiClient {
  private baseUrl = '/api/face';

  /**
   * Helper to perform fetch requests with error handling
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'CAREGIVER', // default authorization for caregiver client calls
          ...options.headers,
        },
        ...options,
      });

      if (!res.ok) {
        let errMessage = `HTTP error ${res.status}`;
        try {
          const data = await res.json();
          if (data.error) errMessage = data.error;
        } catch {
          /* ignore non-json error */
        }
        throw new Error(errMessage);
      }

      return await res.json();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn(`[faceApi] Error in ${endpoint}:`, err.message);
      throw err;
    }
  }

  /**
   * Enroll elder face descriptors (5-10 samples) on the backend
   */
  async enroll(
    userId: string,
    samples: number[][],
    modelVersion = 'face-api-v1'
  ): Promise<{ success: boolean; enrolledCount: number }> {
    return this.request('/enroll', {
      method: 'POST',
      body: JSON.stringify({ userId, samples, modelVersion }),
    });
  }

  /**
   * Retrieve enrollment status & stats for caregiver (never returns raw embeddings)
   */
  async getStatus(userId: string): Promise<BackendFaceStatus> {
    return this.request<BackendFaceStatus>(`/status/${encodeURIComponent(userId)}`);
  }

  /**
   * Retrieve authoritative scan history for caregiver view
   */
  async getScanHistory(userId: string, limit = 50, offset = 0): Promise<{ events: BackendScanEvent[] }> {
    return this.request<{ events: BackendScanEvent[] }>(
      `/scans/${encodeURIComponent(userId)}?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * Reset enrollment on the backend
   */
  async resetEnrollment(userId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/enrollment/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Record a single scan event with authoritative server timestamp.
   * Can include verified login photo snapshot for caregiver alerts.
   */
  async recordScan(params: {
    userId: string;
    result: ScanEventResult;
    faceDistance: number | null;
    deviceSessionId: string | null;
    photo?: string | null;
  }): Promise<{ success: boolean; event: BackendScanEvent }> {
    return this.request<{ success: boolean; event: BackendScanEvent }>('/scans', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Internal retrieval of reference embeddings for local browser Euclidean matching
   */
  async getProfileForLogin(userId: string): Promise<EnrolledProfileResponse | null> {
    try {
      return await this.request<EnrolledProfileResponse>(`/profile-for-login/${encodeURIComponent(userId)}`);
    } catch {
      return null;
    }
  }
}

export const faceApi = new FaceApiClient();
