import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function signStoreImageUrls(paths: string[]) {
  const privatePaths = [...new Set(paths.filter((path) => path && !path.startsWith("/") && !/^https?:\/\//i.test(path)))];
  if (!privatePaths.length) return new Map<string, string>();
  const { data } = await supabaseAdmin.storage.from("product-images").createSignedUrls(privatePaths, 3600);
  return new Map((data ?? []).flatMap((item) => item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []));
}