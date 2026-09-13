// ============================================================================
// SUPABASE EDGE FUNCTION: match-face-descriptor
//
// PURPOSE: Server-side face descriptor matching for cross-device face login.
//
// INPUT: { descriptor: number[] } — 128-dimensional face descriptor
//
// OUTPUT:
//   Success: { matched: true, elderId: string, name: string, age: number, language: string, region: string }
//   Failure: { matched: false }
//
// SECURITY:
//   - Runs server-side with Supabase service role credentials
//   - No face descriptors exposed to browser
//   - Returns only matched elder ID and basic profile data
//   - Does not expose entire face_enrollments table
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const FACE_MATCH_THRESHOLD = 0.55; // From faceRecognition.config.ts

interface MatchFaceRequest {
  descriptor: number[];
}

interface MatchFaceResponse {
  matched: boolean;
  elderId?: string;
  name?: string;
  age?: number;
  language?: string;
  region?: string;
  error?: string;
}

/** Calculate euclidean distance between two 128-dimensional descriptors. */
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length !== 128) {
    throw new Error("Descriptors must be 128-dimensional");
  }
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function parseAllDescriptors(embeddingJson: string): number[][] {
  const descriptors: number[][] = [];
  try {
    const data = JSON.parse(embeddingJson);
    if (Array.isArray(data)) {
      if (data.length === 0) return descriptors;
      // Array of sample objects
      if (typeof data[0] === "object" && data[0] !== null && data[0].descriptor) {
        for (const item of data) {
          if (item && Array.isArray(item.descriptor) && item.descriptor.length === 128) {
            descriptors.push(item.descriptor);
          }
        }
        return descriptors;
      }
      // Direct array of numbers — treat as single descriptor
      if (typeof data[0] === "number" && data.length === 128) {
        descriptors.push(data);
        return descriptors;
      }
    }
  } catch {
    // ignore parse errors
  }
  return descriptors;
}

export async function handler(
  req: Request
): Promise<Response> {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ matched: false, error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body
    const body = await req.json() as MatchFaceRequest;
    const { descriptor } = body;

    // Validate input
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return new Response(
        JSON.stringify({ matched: false, error: "Invalid descriptor" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ matched: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query all active face enrollments
    const { data: enrollments, error: queryErr } = await supabase
      .from("face_enrollments")
      .select("id, elder_id, embedding")
      .eq("is_active", true);

    if (queryErr || !enrollments) {
      console.error("Face enrollment query error:", queryErr);
      return new Response(
        JSON.stringify({ matched: false, error: "Database query failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find best match across ALL stored descriptors for each elder
    let bestMatch: { elderId: string; distance: number } | null = null;
    let totalDescriptorsEvaluated = 0;

    console.info(`[match-face-descriptor] Active enrollments: ${enrollments.length}`);

    for (const enrollment of enrollments) {
      const storedDescriptors = parseAllDescriptors(enrollment.embedding);
      if (storedDescriptors.length === 0) continue;

      let bestElderDistance = Infinity;
      for (const sampleDescriptor of storedDescriptors) {
        if (!sampleDescriptor || sampleDescriptor.length !== 128) continue;
        totalDescriptorsEvaluated++;
        try {
          const distance = euclideanDistance(descriptor, sampleDescriptor);
          if (distance < bestElderDistance) {
            bestElderDistance = distance;
          }
        } catch (err) {
          console.warn("Distance calculation error:", err);
          continue;
        }
      }

      if (bestElderDistance < Infinity) {
        console.info(`[match-face-descriptor] Elder ${enrollment.elder_id}: best distance = ${bestElderDistance.toFixed(4)} (evaluated ${storedDescriptors.length} samples)`);
        if (!bestMatch || bestElderDistance < bestMatch.distance) {
          bestMatch = { elderId: enrollment.elder_id, distance: bestElderDistance };
        }
      }
    }

    console.info(`[match-face-descriptor] Valid descriptors evaluated: ${totalDescriptorsEvaluated}`);
    console.info(`[match-face-descriptor] Best distance: ${bestMatch?.distance?.toFixed(4) ?? "N/A"}`);

    // Check if best match meets threshold
    if (!bestMatch || bestMatch.distance > FACE_MATCH_THRESHOLD) {
      console.info(`[match-face-descriptor] No match found. Best distance: ${bestMatch?.distance?.toFixed(4) ?? "N/A"}`);
      return new Response(
        JSON.stringify({ matched: false }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Load matched elder profile
    const { data: elderProfile, error: elderErr } = await supabase
      .from("elder_profiles")
      .select("id, name, age, preferred_language, region")
      .eq("id", bestMatch.elderId)
      .maybeSingle();

    if (elderErr || !elderProfile) {
      console.error("Elder profile query error:", elderErr);
      return new Response(
        JSON.stringify({ matched: false, error: "Elder profile not found" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.info(
      `[match-face-descriptor] Match found: elderId=${bestMatch.elderId}, distance=${bestMatch.distance.toFixed(4)}`
    );

    return new Response(
      JSON.stringify({
        matched: true,
        elderId: elderProfile.id,
        name: elderProfile.name,
        age: elderProfile.age,
        language: elderProfile.preferred_language || "en",
        region: elderProfile.region || "assam",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in match-face-descriptor:", err);
    return new Response(
      JSON.stringify({ matched: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
