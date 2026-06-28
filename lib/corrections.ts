import type { Database } from "@/lib/supabase/database.types";

export interface CorrectionSubmission {
  name: string;
  email: string;
  message: string;
}

type CorrectionInsert =
  Database["public"]["Tables"]["content_corrections"]["Insert"];

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function parseCorrectionSubmission(input: unknown): CorrectionSubmission {
  const body = input && typeof input === "object" ? input : {};
  const record = body as Record<string, unknown>;
  const name = textValue(record.name);
  const email = normalizeEmail(textValue(record.email));
  const message = textValue(record.message ?? record.body);

  if (!name) {
    throw new Error("Please enter your name.");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!message) {
    throw new Error("Please enter a message.");
  }

  return { name, email, message };
}

export function buildCorrectionInsert(
  submission: CorrectionSubmission
): CorrectionInsert {
  return {
    reporter_name: submission.name,
    reporter_email: submission.email,
    body: submission.message,
    field: "contact_message",
    suggested_value: submission.message,
    activity_catalog_id: null,
  };
}
