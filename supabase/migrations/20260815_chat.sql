-- Migration: Real-time Multi-User & Direct Chat System for Nerd
-- Run this in your Supabase SQL Editor to enable public.messages table

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL DEFAULT 'global',
    sender_id UUID NOT NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT,
    content TEXT NOT NULL,
    image_uri TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast channel retrieval
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow reading all messages in channels
CREATE POLICY "Allow read messages"
    ON public.messages
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert messages
CREATE POLICY "Allow insert messages"
    ON public.messages
    FOR INSERT
    WITH CHECK (true);

-- Enable Realtime publication on public.messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
