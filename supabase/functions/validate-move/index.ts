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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { roomId, row, col } = await req.json()

    // 1. Get current room state
    const { data: room, error: roomError } = await supabaseClient
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError || !room) throw new Error('Room not found')
    if (room.status !== 'playing') throw new Error('Game is not active')

    // 2. Identify the player from the Auth Token
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const playerRole = (user.id === room.player_x) ? 'X' : (user.id === room.player_o ? 'O' : null)
    if (!playerRole) throw new Error('You are not a player in this room')

    // 3. Check turn
    if (room.current_turn !== playerRole) throw new Error('Not your turn')

    // 4. Validate move (bounds and empty cell)
    const board = room.board_state
    if (row < 0 || row >= 9 || col < 0 || col >= 9) throw new Error('Invalid coordinates')
    if (board[row][col] !== null) throw new Error('Cell already occupied')

    // 5. Apply move
    board[row][col] = playerRole
    const nextTurn = playerRole === 'X' ? 'O' : 'X'

    // 6. Update DB
    const { error: updateError } = await supabaseClient
      .from('game_rooms')
      .update({
        board_state: board,
        current_turn: nextTurn,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)

    if (updateError) throw new Error('Failed to update board')

    return new Response(JSON.stringify({ success: true }), {
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
