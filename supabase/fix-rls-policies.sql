-- Fix RLS policies for notifications
-- Run this in your Supabase SQL Editor to fix notification creation issues

-- First, let's check what's currently there
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'notifications';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;

-- Create comprehensive policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Allow authenticated users to create notifications for any user
-- This is needed for the app to create notifications for other users
CREATE POLICY "Authenticated users can create notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own notifications (mark as read, etc.)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'notifications';

-- Test if we can insert a notification (replace with actual user ID)
-- SELECT auth.uid() as current_user;
-- INSERT INTO notifications (user_id, type, title, message, priority) 
-- VALUES (auth.uid(), 'system_announcement', 'Test', 'Test message', 1);