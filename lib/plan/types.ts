export type PlanSyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

export type SourceStatus = "current" | "changed" | "unavailable";

export interface PlanMeta {
  id: string;
  title: string;
  timezone: string;
  version: number;
  updatedAt: string;
}

export interface PublicPlanItem {
  title: string;
  resortName: string;
  location?: string;
  startsAt?: string;
  endsAt?: string;
  category?: string;
  priceLabel?: string;
  sourceVerifiedAt?: string;
  sourceStatus: SourceStatus;
}

export interface PublicPlanResponse {
  title: string;
  timezone: string;
  lastUpdatedAt: string;
  ownerSession: boolean;
  dates: Array<{
    date: string;
    items: PublicPlanItem[];
  }>;
}

export interface PlanApiResponse {
  plan: PlanMeta | null;
  items: import("@/lib/types/occurrence").PlanItem[];
}

export interface AddItemPayload {
  operationId: string;
  turnstileToken?: string;
  sourceType?: "scheduled_occurrence" | "offering";
  sourceActivityId: string;
  sourceOccurrenceId?: string;
  title: string;
  resortId: string;
  resortName: string;
  location?: string;
  startsAt?: string;
  endsAt?: string;
  category?: string;
  priceLabel?: string;
  sourceUrl?: string;
  sourceVerifiedAt?: string;
  savedSourceVersion?: string;
  snapshotJson?: Record<string, unknown>;
  userNote?: string;
}
