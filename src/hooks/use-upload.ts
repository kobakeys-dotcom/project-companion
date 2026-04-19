/**
 * Uploads files into the private `documents` Supabase storage bucket
 * under the path: {companyId}/{timestamp}-{filename}.
 *
 * Returns the storage path (objectPath) plus a signed URL for immediate use.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressIfImage } from "@/lib/compress-image";

interface UploadResponse {
  objectPath: string;
  url: string;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

async function getCallerCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data: prof } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!prof?.company_id) throw new Error("No company linked to your account");
  return prof.company_id as string;
}

export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file?: File): Promise<string> => {
    if (!file) throw new Error("No file selected");
    setIsUploading(true);
    try {
      // Compress images >300KB to cut storage/bandwidth costs
      const finalFile = await compressIfImage(file);
      const companyId = await getCallerCompanyId();
      const safe = finalFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${companyId}/${Date.now()}-${safe}`;

      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, finalFile, { upsert: false, contentType: finalFile.type });
      if (upErr) throw new Error(upErr.message);

      // Signed URL good for 1 year (renew client-side as needed).
      const { data: signed, error: signErr } = await supabase.storage
        .from("documents")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw new Error(signErr.message);

      const response: UploadResponse = { objectPath: path, url: signed.signedUrl };
      options.onSuccess?.(response);
      return path;
    } catch (err) {
      options.onError?.(err as Error);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    isUploading,
    upload: uploadFile,
    uploading: isUploading,
  };
}
export default useUpload;
