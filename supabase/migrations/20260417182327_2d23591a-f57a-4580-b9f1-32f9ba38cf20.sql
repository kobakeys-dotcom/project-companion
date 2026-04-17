
INSERT INTO storage.buckets (id, name, public) VALUES ('selfies', 'selfies', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own selfies"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own selfies"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Company managers can read all selfies"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'selfies' AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e."userId"::text = (storage.foldername(name))[1]
        AND public.is_company_manager(e."companyId")
    )
  );
