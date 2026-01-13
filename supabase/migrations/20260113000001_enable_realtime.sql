-- Enable Realtime for repositories table
-- This allows the frontend to receive live updates when repositories change

-- Add repositories table to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE repositories;

-- Note: RLS policies already exist on repositories table,
-- so users will only receive updates for their own repositories
