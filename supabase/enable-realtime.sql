-- Enable Realtime for chat and notifications
-- Run these commands in your Supabase SQL Editor

-- First, check if the publication exists
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- Enable realtime for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_delivery;

-- Verify the tables are added to realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Also enable realtime replication for the tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.sessions REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.message_delivery REPLICA IDENTITY FULL;