-- 1. Profiles: Extends the auth.users table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    xo_credits DECIMAL(12,4) DEFAULT 0.0000,
    daily_energy INT DEFAULT 10,
    energy_last_reset TIMESTAMPTZ DEFAULT NOW(),
    total_wins INT DEFAULT 0,
    total_games INT DEFAULT 0,
    region TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Game Rooms: For real-time multiplayer
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE,
    mode TEXT CHECK (mode IN ('friend', 'global')),
    player_x UUID REFERENCES public.profiles(id),
    player_o UUID REFERENCES public.profiles(id),
    board_state JSONB DEFAULT '[[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null]]',
    current_turn TEXT CHECK (current_turn IN ('X', 'O')) DEFAULT 'X',
    status TEXT CHECK (status IN ('waiting', 'playing', 'finished')) DEFAULT 'waiting',
    winner_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Matchmaking Queue
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.profiles(id) UNIQUE,
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Withdrawals
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.profiles(id),
    amount_credits DECIMAL(12,4),
    amount_usd DECIMAL(10,2),
    payout_method TEXT,
    payout_address TEXT,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Basic Policies (To be refined in later phases)
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
