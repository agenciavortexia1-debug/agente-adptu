-- Create the schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS adaptu;

-- User Configs Table
CREATE TABLE IF NOT EXISTS adaptu.user_configs (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    user_name TEXT NOT NULL,
    business_description TEXT NOT NULL,
    openai_key TEXT,
    gmail_user TEXT,
    gmail_app_password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals Table
CREATE TABLE IF NOT EXISTS adaptu.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    deadline DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat History Table
CREATE TABLE IF NOT EXISTS adaptu.chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE adaptu.user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptu.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptu.chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own config" ON adaptu.user_configs
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their own goals" ON adaptu.goals
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own chat history" ON adaptu.chat_history
    FOR ALL USING (auth.uid() = user_id);
