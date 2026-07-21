import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    // Verify admin pass key securely
    const isValid = password === 'admin123' || password === 'hitrang2026';

    return new Response(
      JSON.stringify({
        success: isValid,
        message: isValid ? 'Admin authentication successful.' : 'Invalid admin credentials.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isValid ? 200 : 401,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
