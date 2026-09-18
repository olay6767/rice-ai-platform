import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type {
  BehaviorEventType,
  BehaviorFeature,
} from "@/lib/recommendations/types";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface BehaviorEventInput {
  eventType: BehaviorEventType;
  feature: BehaviorFeature;
  path?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function recordBehaviorEvent(
  supabase: ServerSupabaseClient,
  userId: string,
  event: BehaviorEventInput
): Promise<boolean> {
  const { error } = await supabase.from("user_behavior_events").insert({
    user_id: userId,
    event_type: event.eventType,
    feature: event.feature,
    path: event.path ?? null,
    metadata: event.metadata ?? {},
  });

  if (error) {
    console.error("Unable to record user behavior:", {
      code: error.code,
      message: error.message,
      feature: event.feature,
      eventType: event.eventType,
    });
    return false;
  }

  return true;
}
