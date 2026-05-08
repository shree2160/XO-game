import { supabase } from '../config/supabaseClient';
import { Player } from '../game/Board';

export interface GameRoom {
  id: string;
  room_code: string;
  mode: 'friend' | 'global';
  player_x: string | null;
  player_o: string | null;
  board_state: (string | null)[][];
  current_turn: Player;
  status: 'waiting' | 'playing' | 'finished';
  winner_id: string | null;
}

export class MultiplayerService {
  /**
   * Create a new room for a friend to join
   */
  static async createRoom(playerId: string): Promise<{ data: GameRoom | null; error: any }> {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('game_rooms')
      .insert({
        room_code: roomCode,
        mode: 'friend',
        player_x: playerId,
        status: 'waiting',
        current_turn: 'X'
      })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Join an existing room via code
   */
  static async joinRoom(roomCode: string, playerId: string): Promise<{ data: GameRoom | null; error: any }> {
    // 1. Find the room
    const { data: room, error: findError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .eq('status', 'waiting')
      .single();

    if (findError || !room) return { data: null, error: findError || 'Room not found' };
    if (room.player_x === playerId) return { data: room, error: 'You are already in this room' };

    // 2. Join as Player O
    const { data, error } = await supabase
      .from('game_rooms')
      .update({
        player_o: playerId,
        status: 'playing'
      })
      .eq('id', room.id)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Send a move to the Edge Function for server-side validation
   */
  static async makeMove(roomId: string, row: number, col: number) {
    const { data, error } = await supabase.functions.invoke('validate-move', {
      body: { roomId, row, col }
    });

    return { data, error };
  }

  /**
   * Set the winner and finish the game
   */
  static async finishGame(roomId: string, winnerId: string | null) {
    const { error } = await supabase
      .from('game_rooms')
      .update({
        status: 'finished',
        winner_id: winnerId
      })
      .eq('id', roomId);

    return { error };
  }

  /**
   * Subscribe to real-time updates for a specific room
   */
  static subscribeToRoom(roomId: string, callback: (newRoom: GameRoom) => void) {
    return supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          callback(payload.new as GameRoom);
        }
      )
      .subscribe();
  }
  /**
   * Global Matchmaking logic
   */
  static async startGlobalMatchmaking(playerId: string, onMatchFound: (room: GameRoom, role: Player) => void) {
    // 1. Join the queue
    const { error: joinError } = await supabase
      .from('matchmaking_queue')
      .upsert({ player_id: playerId, joined_at: new Date().toISOString() });

    if (joinError) return { error: joinError };

    // 2. Look for an opponent
    const { data: queue, error: queueError } = await supabase
      .from('matchmaking_queue')
      .select('player_id')
      .neq('player_id', playerId)
      .order('joined_at', { ascending: true })
      .limit(1);

    if (queue && queue.length > 0) {
      // Opponent found! Create a room
      const opponentId = queue[0].player_id;
      const { data: room, error: roomError } = await this.createGlobalRoom(playerId, opponentId);
      
      if (room && !roomError) {
        // Remove both from queue
        await supabase.from('matchmaking_queue').delete().in('player_id', [playerId, opponentId]);
        onMatchFound(room, 'X');
      }
    } else {
      // Wait for someone else to find us
      // Listen for deletions from the queue (means we were picked up)
      const channel = supabase
        .channel('matchmaking')
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'matchmaking_queue', filter: `player_id=eq.${playerId}` },
          async () => {
            // Someone picked us! Find the room where we are Player O
            const { data: room } = await supabase
              .from('game_rooms')
              .select('*')
              .eq('player_o', playerId)
              .eq('status', 'playing')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (room) {
              onMatchFound(room as GameRoom, 'O');
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();
    }
  }

  private static async createGlobalRoom(playerX: string, playerO: string) {
    const roomCode = 'GLOBAL-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const { data, error } = await supabase
      .from('game_rooms')
      .insert({
        room_code: roomCode,
        mode: 'global',
        player_x: playerX,
        player_o: playerO,
        status: 'playing',
        current_turn: 'X'
      })
      .select()
      .single();
    
    return { data: data as GameRoom, error };
  }

  static async leaveMatchmaking(playerId: string) {
    await supabase.from('matchmaking_queue').delete().eq('player_id', playerId);
  }
}
