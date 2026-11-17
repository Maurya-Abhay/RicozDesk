import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: actor, error: actorError } = await admin.from('profiles').select('role,is_active').eq('id', authData.user.id).single();
    if (actorError || actor?.role !== 'admin' || !actor.is_active) return new Response(JSON.stringify({ error: 'Only an active System Admin can invite users.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await request.json();
    const full_name = String(body.full_name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || 'support_agent');
    const skills = Array.isArray(body.skills) ? body.skills.map((item: unknown) => String(item).trim()).filter(Boolean) : [];
    const allowedRoles = ['admin', 'support_manager', 'support_agent', 'tech_lead', 'developer'];
    if (!full_name || !/^\S+@\S+\.\S+$/.test(email) || !allowedRoles.includes(role)) return new Response(JSON.stringify({ error: 'Provide a valid full name, email and role.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name } });
    if (inviteError || !inviteData.user) throw inviteError || new Error('Could not create invited user.');

    const team = ['developer', 'tech_lead'].includes(role) ? 'Engineering' : role === 'admin' ? 'Management' : 'Customer Support';
    const { error: profileError } = await admin.from('profiles').upsert({ id: inviteData.user.id, full_name, email, role, team, skills, is_active: true }, { onConflict: 'id' });
    if (profileError) throw profileError;

    return new Response(JSON.stringify({ success: true, user_id: inviteData.user.id, email }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected server error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
