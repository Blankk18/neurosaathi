// ============================================================================
// SUPABASE EDGE FUNCTION: match-face-descriptor
//
// PURPOSE: Server-side face descriptor matching for cross-device face login.
//
// INPUT: { descriptor: number[] } — 128-dimensional face descriptor
//
// OUTPUT:
//   Success: { matched: true, elderId: string, name: string, age: number, language: string, region: string, distance: number }
//   Failure: { matched: false }
//
// SECURITY:
//   - Runs server-side with Supabase service role credentials
//   - No face descriptors exposed to browser
//   - Returns only matched elder ID and basic profile data
//   - Evaluates ALL stored face samples per elder to find the minimum distance
//   - Multi-sample cross-device matching
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const FACE_MATCH_THRESHOLD = 0.55; // Calibrated Euclidean distance threshold

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface MatchFaceRequest {
  descriptor: number[];
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

/**
 * Parse all valid 128-d descriptors from stored embedding JSON.
 * Evaluates multiple samples per elder (e.g. 3-5 enrollment photos).
 */
function parseAllDescriptors(embeddingJson: string): number[][] {
  try {
    const data = JSON.parse(embeddingJson);
    const descriptors: number[][] = [];

    if (Array.isArray(data)) {
      // Case 1: Direct array of 128 numbers
      if (data.length === 128 && typeof data[0] === "number") {
        if (data.every((n) => typeof n === "number" && isFinite(n))) {
          return [data];
        }
      }

      // Case 2: Array of objects [{ descriptor: [...] }, ...] or array of arrays [[...], [...]]
      for (const item of data) {
        if (Array.isArray(item)) {
          if (item.length === 128 && item.every((n) => typeof n === "number" && isFinite(n))) {
            descriptors.push(item);
          }
        } else if (item && typeof item === "object" && Array.isArray(item.descriptor)) {
          if (item.descriptor.length === 128 && item.descriptor.every((n: unknown) => typeof n === "number" && isFinite(n))) {
            descriptors.push(item.descriptor);
          }
        }
      }
    } else if (data && typeof data === "object" && Array.isArray(data.descriptor)) {
      // Case 3: Single sample object { descriptor: [...] }
      if (data.descriptor.length === 128 && data.descriptor.every((n: unknown) => typeof n === "number" && isFinite(n))) {
        descriptors.push(data.descriptor);
      }
    }

    return descriptors;
  } catch {
    return [];
  }
}

export async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ matched: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body
    let body: MatchFaceRequest;
    try {
      body = (await req.json()) as MatchFaceRequest;
    } catch {
      return new Response(
        JSON.stringify({ matched: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { descriptor } = body;

    // Validate input: must be an array of 128 finite numbers
    if (
      !descriptor ||
      !Array.isArray(descriptor) ||
      descriptor.length !== 128 ||
      !descriptor.every((n) => typeof n === "number" && isFinite(n))
    ) {
      return new Response(
        JSON.stringify({ matched: false, error: "Invalid descriptor: must be 128-dimensional array of numbers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[match-face-descriptor] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ matched: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query all active face enrollments
    const { data: enrollments, error: queryErr } = await supabase
      .from("face_enrollments")
      .select("id, elder_id, embedding")
      .eq("is_active", true);

    if (queryErr || !enrollments) {
      console.error("[match-face-descriptor] Face enrollment query error:", queryErr);
      return new Response(
        JSON.stringify({ matched: false, error: "Database query failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.info(`[match-face-descriptor] Active enrollments: ${enrollments.length}`);

    let totalEvaluatedDescriptors = 0;
    let bestMatch: {
      elderId: string;
      distance: number;
    } | null = null;

    // Multi-sample matching: evaluate EVERY stored sample descriptor for EACH elder
    for (const enrollment of enrollments) {
      if (!enrollment.embedding || !enrollment.elder_id) continue;
      const storedDescriptors = parseAllDescriptors(enrollment.embedding);
      if (storedDescriptors.length === 0) continue;

      let elderBestDistance = Infinity;
      for (const storedDesc of storedDescriptors) {
        totalEvaluatedDescriptors++;
        try {
          const dist = euclideanDistance(descriptor, storedDesc);
          if (dist < elderBestDistance) {
            elderBestDistance = dist;
          }
        } catch {
          continue;
        }
      }

      if (elderBestDistance < Infinity) {
        if (!bestMatch || elderBestDistance < bestMatch.distance) {
          bestMatch = {
            elderId: enrollment.elder_id,
            distance: elderBestDistance,
          };
        }
      }
    }

    console.info(`[match-face-descriptor] Valid descriptors evaluated: ${totalEvaluatedDescriptors}`);
    console.info(`[match-face-descriptor] Best distance: ${bestMatch?.distance.toFixed(4) ?? "N/A"}`);

    // Check threshold
    if (!bestMatch || bestMatch.distance > FACE_MATCH_THRESHOLD) {
      console.info("[match-face-descriptor] No acceptable match");
      return new Response(
        JSON.stringify({ matched: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load matched elder profile
    const { data: elderProfile, error: elderErr } = await supabase
      .from("elder_profiles")
      .select("id, name, age, preferred_language, region")
      .eq("id", bestMatch.elderId)
      .maybeSingle();

    if (elderErr || !elderProfile) {
      console.error("[match-face-descriptor] Elder profile query error:", elderErr);
      return new Response(
        JSON.stringify({ matched: false, error: "Elder profile not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.info(
      `[match-face-descriptor] Match found: elderId=${bestMatch.elderId}, name=${elderProfile.name}, distance=${bestMatch.distance.toFixed(4)}`
    );

    return new Response(
      JSON.stringify({
        matched: true,
        elderId: elderProfile.id,
        name: elderProfile.name,
        age: elderProfile.age,
        language: elderProfile.preferred_language || "en",
        region: elderProfile.region || "assam",
        distance: bestMatch.distance,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[match-face-descriptor] Error:", err);
    return new Response(
      JSON.stringify({ matched: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Start HTTP server for Deno Edge Runtime
Deno.serve(handler);
