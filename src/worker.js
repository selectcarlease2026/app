const SUPA_URL = 'https://kqstoxqegsngqkylnfkv.supabase.co';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // Admin API proxy
    if (url.pathname === '/api/admin/upsert-user') {
      return handleUpsertUser(request, env);
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function handleUpsertUser(request, env) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email en wachtwoord verplicht' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
    const adminHeaders = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    };

    // Zoek bestaande gebruiker
    const listRes = await fetch(`${SUPA_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: adminHeaders
    });
    const listData = await listRes.json();
    const existing = listData.users && listData.users.find(u => u.email === email.toLowerCase());

    if (existing) {
      // Update wachtwoord
      const updateRes = await fetch(`${SUPA_URL}/auth/v1/admin/users/${existing.id}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ password: password, email_confirm: true })
      });
      const updateData = await updateRes.json();
      return new Response(JSON.stringify({ action: 'updated', user: updateData }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    } else {
      // Maak nieuwe gebruiker aan
      const createRes = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ email: email.toLowerCase(), password: password, email_confirm: true })
      });
      const createData = await createRes.json();
      return new Response(JSON.stringify({ action: 'created', user: createData }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }
}
