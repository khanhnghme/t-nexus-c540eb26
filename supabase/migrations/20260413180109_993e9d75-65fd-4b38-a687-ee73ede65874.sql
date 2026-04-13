-- Create invoices bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- Allow authenticated users to read their own invoices
CREATE POLICY "Users can view own invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow service role to upload (no policy needed, service role bypasses RLS)