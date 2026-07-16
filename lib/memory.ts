import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryFact } from "@/types";

export async function getMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<MemoryFact[]> {
  const { data, error } = await supabase
    .from("memory")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("getMemory error:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Upserts a single memory fact. Uses the (user_id, memory_key) unique
 * constraint so repeated facts update in place instead of duplicating rows.
 */
export async function saveMemoryFact(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  value: string,
  confidence: number
) {
  const { error } = await supabase.from("memory").upsert(
    {
      user_id: userId,
      memory_key: key,
      memory_value: value,
      confidence,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,memory_key" }
  );

  if (error) console.error("saveMemoryFact error:", error.message);
}
