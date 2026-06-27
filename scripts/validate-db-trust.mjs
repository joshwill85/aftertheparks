#!/usr/bin/env node
/**
 * Read-only trust audit for published Supabase activity views.
 *
 * This verifies the live database-facing source contract after a publish:
 * - Gold rows have source URL/hash and title/schedule/location provenance.
 * - Official offering rows have source URL/hash, resort joins, and title/resort-join provenance.
 * - Public fields do not contain known OCR/helper contamination fragments.
 * - Health RPCs report no issues when callable with the configured key.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function loadLocalEnvIfPresent() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] != null) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadLocalEnvIfPresent();

const SUPABASE_URL = (
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  ""
).replace(/\/+$/, "");
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const GOLD_PREVIEW_PATH = resolve(
  process.cwd(),
  "data/processed/activity_gold_v2_preview.json"
);

const BAD_PUBLIC_TEXT = [
  /Wellnessscav/i,
  /Engerhunt/i,
  /ACTIVITIES SCHEDULE TO VIEW/i,
  /THIS INFORMATION DIGITALLY/i,
  /Walkable\s+[—-]\s+no transportation/i,
  /no transportation needed/i,
];
const SHA256_HEX = /^[a-f0-9]{64}$/i;

function ok(detail = "ok") {
  return { pass: true, detail };
}

function fail(detail) {
  return { pass: false, detail };
}

export function hasUsableSourceHash(value) {
  return typeof value === "string" && SHA256_HEX.test(value);
}

function hasUsableSpan(span) {
  if (!span || typeof span !== "object") return false;
  return Boolean(
    String(span.text ?? "").trim() ||
      String(span.source_url ?? "").trim() ||
      String(span.source ?? "").trim() ||
      Number.isFinite(span.page) ||
      Number.isFinite(span.line) ||
      Number.isFinite(span.line_no)
  );
}

export function hasUsableProvenance(row, field) {
  const spans = row.field_provenance?.[field];
  return (
    Array.isArray(spans) &&
    spans.some(hasUsableSpan)
  );
}

export function hasValidStructuredGoldSource(row) {
  if (row.source == null) return false;
  if (!row.source || typeof row.source !== "object" || Array.isArray(row.source)) {
    return false;
  }
  if (row.source.url && row.source_url && row.source.url !== row.source_url) {
    return false;
  }
  if (
    row.source.documentHash &&
    row.source_sha256 &&
    row.source.documentHash !== row.source_sha256
  ) {
    return false;
  }
  if (
    row.source.documentKeyLegends != null &&
    !Array.isArray(row.source.documentKeyLegends)
  ) {
    return false;
  }
  return true;
}

function sourceLegends(row) {
  const legends = row?.source?.documentKeyLegends;
  return Array.isArray(legends) ? legends : [];
}

function rowKey(row) {
  for (const field of ["candidate_id", "promoted_from_candidate_id", "id"]) {
    const value = String(row?.[field] ?? "").trim();
    if (value) return value;
  }
  return `${row.calendar_group_key ?? ""}:${row.canonical_slug ?? ""}`;
}

function rowKeys(row) {
  const keys = [];
  for (const field of ["candidate_id", "promoted_from_candidate_id", "id"]) {
    const value = String(row?.[field] ?? "").trim();
    if (value) keys.push(value);
  }
  const fallback = `${row?.calendar_group_key ?? ""}:${row?.canonical_slug ?? ""}`;
  if (fallback !== ":") keys.push(fallback);
  return [...new Set(keys)];
}

function sourceDocumentId(row) {
  return String(row?.source_document_id ?? row?.source?.documentId ?? "").trim();
}

function goldAuditRowKey(row) {
  return `${row?.calendar_group_key ?? ""}:${row?.canonical_slug ?? ""}`;
}

function officialAuditRowKey(row) {
  return String(row?.offering_key ?? row?.id ?? "").trim();
}

export function requiredGoldAuditFields(row) {
  const fields = ["title", "schedule", "location"];
  if (String(row?.description ?? "").trim()) fields.push("description");
  if (row?.price?.state === "free" || row?.price?.state === "fee") {
    fields.push("price");
  }
  return fields;
}

export function requiredOfficialAuditFields(row) {
  const fields = ["title", "resort_join"];
  if (String(row?.description ?? "").trim()) fields.push("description");
  if (hasSpecificPrice(row)) fields.push("price");
  if (hasSpecificBooking(row)) fields.push("booking");
  const availability = row?.availability;
  const availabilityLabel =
    availability && typeof availability === "object"
      ? String(availability.label ?? "").trim()
      : "";
  const availabilityHoursState =
    availability && typeof availability === "object"
      ? String(availability.hours_state ?? availability.hoursState ?? "")
      : "";
  if (availabilityLabel && availabilityHoursState !== "source_unspecified") {
    fields.push("availability");
  }
  return fields;
}

export function auditSourceTrustLedger({
  goldRows = [],
  officialRows = [],
  sourceDocuments = [],
  currentnessChecks = [],
  sourceRelationships = [],
  fieldAuditObservations = [],
} = {}) {
  const errors = [];
  const docsById = new Map(
    sourceDocuments
      .filter((row) => row?.id)
      .map((row) => [String(row.id), row])
  );
  const currentnessByDocId = new Set(
    currentnessChecks
      .map((row) => String(row?.source_document_id ?? "").trim())
      .filter(Boolean)
  );
  const pdfRelationshipsByChildId = new Map();
  for (const row of sourceRelationships) {
    if (row?.relationship_type !== "resort_page_links_pdf") continue;
    const childId = String(row?.child_source_document_id ?? "").trim();
    if (!childId) continue;
    if (!pdfRelationshipsByChildId.has(childId)) pdfRelationshipsByChildId.set(childId, []);
    pdfRelationshipsByChildId.get(childId).push(row);
  }
  const observedFields = new Set(
    fieldAuditObservations
      .map((row) => {
        const kind = String(row?.row_kind ?? "").trim();
        const key = String(row?.row_key ?? "").trim();
        const field = String(row?.field_name ?? "").trim();
        return kind && key && field ? `${kind}:${key}:${field}` : "";
      })
      .filter(Boolean)
  );

  const referencedDocIds = new Set();
  for (const row of [...goldRows, ...officialRows]) {
    const docId = sourceDocumentId(row);
    if (docId) referencedDocIds.add(docId);
  }

  for (const docId of referencedDocIds) {
    if (!currentnessByDocId.has(docId)) {
      errors.push(`source_document_missing_currentness_check:${docId}`);
    }
    const doc = docsById.get(docId);
    if (doc?.source_type === "pdf") {
      const relationships = pdfRelationshipsByChildId.get(docId) ?? [];
      if (relationships.length === 0) {
        errors.push(`source_document_missing_relationship_for_pdf:${docId}`);
      }
      let hasValidParentRelationship = false;
      let hasMissingParentRelationship = false;
      for (const relationship of relationships) {
        const parentId = String(relationship?.parent_source_document_id ?? "").trim();
        if (!parentId) {
          hasMissingParentRelationship = true;
          continue;
        }
        if (!docsById.has(parentId)) {
          errors.push(`source_document_pdf_relationship_parent_missing_document:${docId}:${parentId}`);
          continue;
        }
        if (!currentnessByDocId.has(parentId)) {
          errors.push(`source_document_pdf_relationship_parent_missing_currentness_check:${docId}:${parentId}`);
          continue;
        }
        hasValidParentRelationship = true;
      }
      if (hasMissingParentRelationship && !hasValidParentRelationship) {
        errors.push(`source_document_pdf_relationship_missing_parent:${docId}`);
      }
    }
  }

  for (const row of goldRows) {
    const id = row.id ?? goldAuditRowKey(row);
    const docId = sourceDocumentId(row);
    const doc = docsById.get(docId);
    if (!docId || !doc || !currentnessByDocId.has(docId)) {
      errors.push(`gold_row_missing_source_chain:${id}`);
    } else if (doc.source_type === "pdf" && !pdfRelationshipsByChildId.has(docId)) {
      errors.push(`gold_row_missing_source_chain:${id}`);
    }
    const rowKeyValue = goldAuditRowKey(row);
    for (const field of requiredGoldAuditFields(row)) {
      if (!observedFields.has(`gold_activity:${rowKeyValue}:${field}`)) {
        errors.push(
          `field_audit_observation_missing_for_required_field:gold_activity:${rowKeyValue}:${field}`
        );
      }
    }
  }

  for (const row of officialRows) {
    const id = row.id ?? officialAuditRowKey(row);
    const docId = sourceDocumentId(row);
    if (!docId || !docsById.has(docId) || !currentnessByDocId.has(docId)) {
      errors.push(`official_offering_missing_source_chain:${id}`);
    }
    const rowKeyValue = officialAuditRowKey(row);
    for (const field of requiredOfficialAuditFields(row)) {
      if (!observedFields.has(`official_offering:${rowKeyValue}:${field}`)) {
        errors.push(
          `field_audit_observation_missing_for_required_field:official_offering:${rowKeyValue}:${field}`
        );
      }
    }
  }

  return errors;
}

export function auditGoldSourceLegendParity(liveRows, expectedRows) {
  const errors = [];
  const liveByKey = new Map();
  for (const row of liveRows) {
    for (const key of rowKeys(row)) {
      if (!liveByKey.has(key)) liveByKey.set(key, row);
    }
  }

  for (const expected of expectedRows) {
    const expectedLegends = sourceLegends(expected);
    if (expectedLegends.length === 0) continue;

    const key = rowKey(expected);
    const live = rowKeys(expected)
      .map((candidateKey) => liveByKey.get(candidateKey))
      .find(Boolean);
    if (!live) {
      errors.push(`gold:${key}:missing_live_row_for_source_legend`);
      continue;
    }

    const liveLegends = sourceLegends(live);
    if (liveLegends.length < expectedLegends.length) {
      errors.push(`gold:${key}:missing_document_key_legends`);
      continue;
    }

    for (const expectedLegend of expectedLegends) {
      const expectedKind = String(expectedLegend.kind ?? "");
      const expectedMarker = String(expectedLegend.marker ?? "");
      const match = liveLegends.some((legend) => {
        const kindMatches = String(legend.kind ?? "") === expectedKind;
        const markerMatches = expectedMarker
          ? String(legend.marker ?? "") === expectedMarker
          : true;
        const spans = Array.isArray(legend.spans) ? legend.spans : [];
        return kindMatches && markerMatches && spans.some(hasUsableSpan);
      });
      if (!match) {
        errors.push(`gold:${key}:missing_document_key_legend:${expectedKind}`);
      }
    }
  }

  return errors;
}

function publicText(row) {
  return JSON.stringify({
    title: row.title,
    description: row.description,
    schedule: row.schedule,
    location: row.location,
    availability: row.availability,
  });
}

function hasSpecificPrice(row) {
  const price = row.price;
  if (!price || typeof price !== "object") return false;
  if (price.state === "fee" || price.state === "free") return true;
  return ["notes", "amountCents", "amount_cents", "options"].some((key) => {
    const value = price[key];
    return Array.isArray(value) ? value.length > 0 : value != null && value !== "";
  });
}

function hasSpecificBooking(row) {
  const booking = row.booking;
  if (!booking || typeof booking !== "object") return false;
  return Object.values(booking).some(
    (value) => value != null && value !== false && value !== ""
  );
}

function hasSpecificEligibility(row) {
  const eligibility = row.eligibility;
  if (!eligibility || typeof eligibility !== "object") return false;
  return Object.entries(eligibility).some(
    ([key, value]) =>
      key !== "ages" && value != null && value !== false && value !== ""
  );
}

function hasSpecificAmenities(row) {
  return Array.isArray(row.amenities) && row.amenities.length > 0;
}

function hasSpecificLocation(row) {
  const location = row.location;
  if (!location || typeof location !== "object") return false;
  const label = String(location.label ?? "").trim();
  const title = String(row.title ?? "").trim();
  return Boolean(label && label !== title);
}

async function rest(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${path} -> ${response.status}: ${body}`);
  }
  return response.json();
}

async function selectRows(table, columns = "*") {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await rest(
      `${table}?select=${encodeURIComponent(columns)}&limit=${pageSize}&offset=${offset}`
    );
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function rpc(fn) {
  return rest(`rpc/${fn}`, {
    method: "POST",
    body: "{}",
  });
}

export function auditGoldRows(rows) {
  const errors = [];
  for (const row of rows) {
    const id = row.id ?? row.activity_catalog_id ?? row.canonical_slug;
    if (!row.source_url) errors.push(`gold:${id}:missing_source_url`);
    if (!hasUsableSourceHash(row.source_sha256)) {
      errors.push(`gold:${id}:invalid_source_sha256`);
    }
    if (!hasValidStructuredGoldSource(row)) {
      errors.push(`gold:${id}:invalid_structured_source`);
    }
    for (const field of ["title", "schedule", "location"]) {
      if (!hasUsableProvenance(row, field)) {
        errors.push(`gold:${id}:missing_${field}_provenance`);
      }
    }
    if ((row.description ?? "").trim() && !hasUsableProvenance(row, "description")) {
      errors.push(`gold:${id}:missing_description_provenance`);
    }
    for (const pattern of BAD_PUBLIC_TEXT) {
      if (pattern.test(publicText(row))) {
        errors.push(`gold:${id}:bad_public_text:${pattern}`);
      }
    }
  }
  return errors;
}

export function auditOfficialOfferingRows(rows) {
  const errors = [];
  for (const row of rows) {
    const id = row.id ?? row.offering_key ?? row.program_key;
    if (!row.resort_slug) errors.push(`official:${id}:missing_resort_slug`);
    if (!row.source_url) errors.push(`official:${id}:missing_source_url`);
    if (!hasUsableSourceHash(row.source_sha256)) {
      errors.push(`official:${id}:invalid_source_sha256`);
    }
    for (const field of ["title", "resort_join"]) {
      if (!hasUsableProvenance(row, field)) {
        errors.push(`official:${id}:missing_${field}_provenance`);
      }
    }
    if ((row.description ?? "").trim() && !hasUsableProvenance(row, "description")) {
      errors.push(`official:${id}:missing_description_provenance`);
    }
    const availability = row.availability;
    const availabilityLabel =
      availability && typeof availability === "object"
        ? String(availability.label ?? "").trim()
        : "";
    const availabilityHoursState =
      availability && typeof availability === "object"
        ? String(availability.hours_state ?? availability.hoursState ?? "")
        : "";
    if (
      availabilityLabel &&
      availabilityHoursState !== "source_unspecified" &&
      !hasUsableProvenance(row, "availability")
    ) {
      errors.push(`official:${id}:missing_availability_provenance`);
    }
    for (const [field, predicate] of [
      ["price", hasSpecificPrice],
      ["booking", hasSpecificBooking],
      ["eligibility", hasSpecificEligibility],
      ["amenities", hasSpecificAmenities],
      ["location", hasSpecificLocation],
    ]) {
      if (predicate(row) && !hasUsableProvenance(row, field)) {
        errors.push(`official:${id}:missing_${field}_provenance`);
      }
    }
    for (const pattern of BAD_PUBLIC_TEXT) {
      if (pattern.test(publicText(row))) {
        errors.push(`official:${id}:bad_public_text:${pattern}`);
      }
    }
  }
  return errors;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log(
      JSON.stringify(
        {
          skipped: true,
          reason:
            "SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY are required",
        },
        null,
        2
      )
    );
    return;
  }

  const checks = [];
  const expectedGoldRows = existsSync(GOLD_PREVIEW_PATH)
    ? JSON.parse(readFileSync(GOLD_PREVIEW_PATH, "utf8"))
    : [];
  const [goldRows, officialRows] = await Promise.all([
    selectRows("v_public_activity_gold"),
    selectRows("v_public_activity_offerings"),
  ]);

  const goldErrors = auditGoldRows(goldRows);
  checks.push(
    goldErrors.length === 0
      ? ok(`${goldRows.length} Gold rows`)
      : fail(goldErrors)
  );

  const legendErrors = auditGoldSourceLegendParity(goldRows, expectedGoldRows);
  checks.push(
    legendErrors.length === 0
      ? ok(`${expectedGoldRows.filter((row) => sourceLegends(row).length > 0).length} Gold source legend rows preserved`)
      : fail(legendErrors)
  );

  const officialErrors = auditOfficialOfferingRows(officialRows);
  checks.push(
    officialErrors.length === 0
      ? ok(`${officialRows.length} official offering rows`)
      : fail(officialErrors)
  );

  try {
    const [sourceDocuments, currentnessChecks, sourceRelationships, fieldAuditObservations] =
      await Promise.all([
        selectRows("source_documents", "id,source_type,canonical_url,content_sha256"),
        selectRows("source_currentness_checks", "source_document_id,canonical_url,currentness,checked_at"),
        selectRows("source_relationships", "parent_source_document_id,child_source_document_id,relationship_type"),
        selectRows("field_audit_observations", "row_kind,row_key,field_name,source_document_id,created_at"),
      ]);
    const ledgerErrors = auditSourceTrustLedger({
      goldRows,
      officialRows,
      sourceDocuments,
      currentnessChecks,
      sourceRelationships,
      fieldAuditObservations,
    });
    checks.push(
      ledgerErrors.length === 0
        ? ok(
            `${sourceDocuments.length} source docs, ${currentnessChecks.length} currentness checks, ${sourceRelationships.length} source relationships, ${fieldAuditObservations.length} field observations`
          )
        : fail(ledgerErrors)
    );
  } catch (error) {
    checks.push(
      fail({
        code: "source_trust_ledger_tables_unavailable",
        error: String(error),
      })
    );
  }

  for (const fn of [
    "check_activity_pipeline_v2_health",
    "check_official_activity_offerings_health",
  ]) {
    try {
      const result = await rpc(fn);
      checks.push(
        Array.isArray(result) && result.length === 0
          ? ok(`${fn}: no issues`)
          : fail({ rpc: fn, result })
      );
    } catch (error) {
      checks.push(fail({ rpc: fn, error: String(error) }));
    }
  }

  const passed = checks.every((check) => check.pass);
  const report = {
    passed,
    summary: {
      goldRows: goldRows.length,
      goldRowsWithExpectedSourceLegends: expectedGoldRows.filter(
        (row) => sourceLegends(row).length > 0
      ).length,
      officialOfferingRows: officialRows.length,
    },
    checks,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!passed) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
