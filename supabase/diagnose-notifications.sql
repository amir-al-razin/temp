-- Diagnostic script to check notifications table and permissions
-- Run this in your Supabase SQL Editor

-- 1. Check if notifications table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'notifications'
) as notifications_table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'notifications';

-- 4. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notifications';

-- 5. Test basic insert (this will show the actual error)
-- Replace 'your-user-id' with an actual user ID from your profiles table
-- INSERT INTO notifications (user_id, type, title, message, priority) 
-- VALUES ('your-user-id', 'system_announcement', 'Test', 'Test message', 1);

-- 6. Check current user context
SELECT auth.uid() as current_user_id;

-- 7. Check if there are any users in profiles table
SELECT id, email FROM profiles LIMIT 5;