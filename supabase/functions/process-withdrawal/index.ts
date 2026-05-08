import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Needs Service Role to update profiles securely
    )

    const { amount, address } = await req.json()

    // 1. Get current user
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Unauthorized')

    // 2. Fetch current balance
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('xo_credits')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) throw new Error('Profile not found')
    
    const currentCredits = Number(profile.xo_credits)
    if (currentCredits < amount) throw new Error('Insufficient balance')
    if (amount < 100) throw new Error('Minimum withdrawal is 100 credits')

    // 3. START TRANSACTION (Simulated via sequential updates)
    // a. Deduct credits
    const { error: deductError } = await supabaseClient
      .from('profiles')
      .update({ xo_credits: currentCredits - amount })
      .eq('id', user.id)

    if (deductError) throw new Error('Failed to deduct credits')

    // b. Create withdrawal record
    const { error: recordError } = await supabaseClient
      .from('withdrawals')
      .insert({
        player_id: user.id,
        amount_credits: amount,
        payout_address: address,
        status: 'pending'
      })

    if (recordError) {
      // Rollback credits if record fails (Basic recovery)
      await supabaseClient.from('profiles').update({ xo_credits: currentCredits }).eq('id', user.id)
      throw new Error('Failed to create withdrawal record')
    }

    return new Response(JSON.stringify({ success: true, message: 'Withdrawal request submitted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
