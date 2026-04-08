import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find accounts that:
    // 1. Are on plan_free
    // 2. Have downgraded_at > 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredAccounts, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, downgraded_at')
      .eq('user_plan', 'plan_free')
      .not('downgraded_at', 'is', null)
      .lt('downgraded_at', thirtyDaysAgo);

    if (fetchErr) {
      console.error('Error fetching expired accounts:', fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!expiredAccounts || expiredAccounts.length === 0) {
      return new Response(JSON.stringify({ message: 'No expired accounts found', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Free plan limits
    const { data: freeLimits } = await supabase
      .from('plan_limits')
      .select('*')
      .eq('plan', 'plan_free')
      .single();

    if (!freeLimits) {
      return new Response(JSON.stringify({ error: 'Free plan limits not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];

    for (const account of expiredAccounts) {
      const ownerId = account.id;
      const accountResult: any = { userId: ownerId, email: account.email, actions: [] };

      try {
        // Get all owned workspaces
        const { data: workspaces } = await supabase
          .from('workspaces')
          .select('id, created_at')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: true });

        if (!workspaces || workspaces.length === 0) {
          results.push({ ...accountResult, actions: ['no_workspaces'] });
          continue;
        }

        // 1. Delete excess workspaces (keep oldest)
        if (workspaces.length > freeLimits.max_workspaces) {
          const wsToDelete = workspaces.slice(freeLimits.max_workspaces);
          for (const ws of wsToDelete) {
            // Delete all projects in workspace first
            const { data: projects } = await supabase
              .from('groups')
              .select('id')
              .eq('workspace_id', ws.id);
            
            if (projects && projects.length > 0) {
              for (const proj of projects) {
                await supabase.from('groups').delete().eq('id', proj.id);
              }
            }
            // Delete workspace members
            await supabase.from('workspace_members').delete().eq('workspace_id', ws.id);
            // Delete workspace
            await supabase.from('workspaces').delete().eq('id', ws.id);
            accountResult.actions.push(`deleted_workspace:${ws.id}`);
          }
        }

        // 2. Delete excess projects (keep oldest across remaining workspaces)
        const remainingWsIds = workspaces.slice(0, freeLimits.max_workspaces).map(w => w.id);
        const { data: allProjects } = await supabase
          .from('groups')
          .select('id, created_at, workspace_id')
          .in('workspace_id', remainingWsIds)
          .order('created_at', { ascending: true });

        if (allProjects && allProjects.length > freeLimits.max_projects_per_workspace) {
          const projectsToDelete = allProjects.slice(freeLimits.max_projects_per_workspace);
          for (const proj of projectsToDelete) {
            await supabase.from('groups').delete().eq('id', proj.id);
            accountResult.actions.push(`deleted_project:${proj.id}`);
          }
        }

        // 3. Clear downgraded_at after cleanup (grace period fulfilled)
        await supabase
          .from('profiles')
          .update({ downgraded_at: null })
          .eq('id', ownerId);

        accountResult.actions.push('cleared_downgraded_at');
      } catch (err) {
        accountResult.error = String(err);
      }

      results.push(accountResult);
    }

    console.log('Grace period check completed:', JSON.stringify(results));

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('check-grace-period error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
