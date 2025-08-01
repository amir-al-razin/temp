-- TEMPORARY: Disable RLS for notifications table to test
-- Run this ONLY for testing - re-enable RLS after fixing the issue

-- Disable RLS temporarily
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Test notification creation
-- After testing, re-enable RLS:
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;