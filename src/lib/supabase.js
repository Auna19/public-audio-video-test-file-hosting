import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && (supabasePublicKey || supabaseServiceRoleKey));

// Standard Supabase client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublicKey || supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

// Browser client using @supabase/ssr
export function getBrowserClient() {
  if (!supabaseUrl || !supabasePublicKey) return null;
  return createBrowserClient(supabaseUrl, supabasePublicKey);
}

// Admin / Service Role client (bypasses RLS for secure server backend tasks)
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey || supabasePublicKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

/**
 * Storage helper for Supabase Buckets
 */
export async function uploadToSupabaseStorage(bucketName, filePath, buffer, contentType) {
  const client = supabaseAdmin || supabase;
  if (!client) {
    throw new Error('Supabase is not configured. Provide NEXT_PUBLIC_SUPABASE_URL and publishable/service key.');
  }

  const { data, error } = await client.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) throw error;

  const { data: publicUrlData } = client.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
  };
}
