-- Create storage bucket for chat files
-- Run this in your Supabase SQL Editor

-- Create the chat-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

-- Create RLS policies for the bucket
CREATE POLICY "Users can upload chat files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view chat files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own chat files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );