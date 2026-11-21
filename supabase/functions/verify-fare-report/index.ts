// ============================================================================
// Edge Function: verify-fare-report
// Server-side validated verification endpoint for administrators.
// Enforces JWT verification, role check, and strict official source rule.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPayload {
  reportId: string;
  newStatus:
    | 'under_review'
    | 'approved_community_estimate'
    | 'verified_official'
    | 'rejected'
    | 'disputed';
  adminFeedback?: string;
  flagSuspicious?: boolean;
  issuingAuthority?: string;
  officialDocumentReference?: string;
  sourceUrl?: string;
  effectiveDate?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Server environment is missing Supabase configuration.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = (await req.json()) as VerifyPayload;
    if (!payload.reportId || !payload.newStatus) {
      return new Response(
        JSON.stringify({ error: 'reportId and newStatus are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (
      payload.newStatus === 'verified_official' &&
      (!payload.issuingAuthority?.trim() ||
        !payload.officialDocumentReference?.trim() ||
        !payload.effectiveDate?.trim())
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Verified official fares require issuingAuthority, officialDocumentReference, and effectiveDate.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase.rpc('review_fare_report', {
      p_report_id: payload.reportId,
      p_new_status: payload.newStatus,
      p_admin_feedback: payload.adminFeedback ?? null,
      p_flag_suspicious: Boolean(payload.flagSuspicious),
      p_issuing_authority: payload.issuingAuthority ?? null,
      p_official_document_reference: payload.officialDocumentReference ?? null,
      p_source_url: payload.sourceUrl ?? null,
      p_effective_date: payload.effectiveDate ?? null,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.code === '42501' ? 403 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ report: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unexpected server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
