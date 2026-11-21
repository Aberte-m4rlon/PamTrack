// ============================================================================
// Edge Function: compute-route-osrm
// Queries OSRM for authentic road geometry and driving distance between two
// Oriental Mindoro coordinates. Never invents road connections or fares.
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isInOrientalMindoroBounds(lat: number, lng: number): boolean {
  return lat >= 12.1 && lat <= 13.7 && lng >= 120.7 && lng <= 121.7;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { originLat, originLng, destLat, destLng } = (await req.json()) as {
      originLat: number;
      originLng: number;
      destLat: number;
      destLng: number;
    };

    if (
      !Number.isFinite(originLat) ||
      !Number.isFinite(originLng) ||
      !Number.isFinite(destLat) ||
      !Number.isFinite(destLng) ||
      !isInOrientalMindoroBounds(originLat, originLng) ||
      !isInOrientalMindoroBounds(destLat, destLng)
    ) {
      return new Response(
        JSON.stringify({ error: 'Coordinates must lie within Oriental Mindoro bounds.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const osrmBase = Deno.env.get('OSRM_BASE_URL') || 'https://router.project-osrm.org';
    const url = `${osrmBase}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return new Response(
        JSON.stringify({ available: false, error: `OSRM upstream returned ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await response.json();
    const route = payload?.routes?.[0];
    if (!route) {
      return new Response(
        JSON.stringify({ available: false, error: 'No road route returned by OSRM.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        available: true,
        distanceKm: Number((route.distance / 1000).toFixed(2)),
        durationMin: Math.max(1, Math.round(route.duration / 60)),
        geometry: route.geometry,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        available: false,
        error: err instanceof Error ? err.message : 'Routing service unreachable',
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
