import assert from "node:assert/strict";

import {
  auditGoldSourceLegendParity,
  auditGoldRows,
  auditOfficialOfferingRows,
  auditSourceTrustLedger,
  hasUsableProvenance,
  hasValidStructuredGoldSource,
  hasUsableSourceHash,
  requiredGoldAuditFields,
  requiredOfficialAuditFields,
} from "./validate-db-trust.mjs";

const hash = "a".repeat(64);

assert.equal(hasUsableSourceHash(hash), true);
assert.equal(hasUsableSourceHash("not-a-real-hash"), false);
assert.equal(
  hasUsableProvenance({ field_provenance: { title: [{ text: "Bike Rentals" }] } }, "title"),
  true
);
assert.equal(
  hasUsableProvenance({ field_provenance: { title: [{}] } }, "title"),
  false
);

const goodGold = {
  id: "gold-good",
  calendar_group_key: "all-star-movies",
  canonical_slug: "wellness-scavenger-hunt",
  title: "Wellness Scavenger Hunt",
  description: "Find hidden wellness challenges.",
  schedule: { text: "Daily from 7:00am-11:00pm" },
  location: { label: "Throughout Disney's All-Star Resorts" },
  source_url: "https://example.test/calendar.pdf",
  source_sha256: hash,
  source: {
    url: "https://example.test/calendar.pdf",
    documentHash: hash,
    documentKeyLegends: [
      {
        kind: "fee",
        marker: "($)",
        label: "There is a fee associated with this activity.",
        spans: [{ text: "($) There is a fee associated with this activity." }],
      },
    ],
  },
  field_provenance: {
    title: [{ text: "WELLNESS SCAVENGER HUNT" }],
    schedule: [{ text: "Daily from 7:00am-11:00pm" }],
    location: [{ text: "Throughout Disney's All-Star Resorts" }],
    description: [{ text: "Find hidden wellness challenges." }],
  },
};

assert.equal(hasValidStructuredGoldSource(goodGold), true);
assert.equal(hasValidStructuredGoldSource({ ...goodGold, source: undefined }), false);
assert.equal(
  hasValidStructuredGoldSource({
    ...goodGold,
    source: { ...goodGold.source, documentHash: "b".repeat(64) },
  }),
  false
);
assert.equal(
  hasValidStructuredGoldSource({
    ...goodGold,
    source: { ...goodGold.source, documentKeyLegends: {} },
  }),
  false
);
assert.deepEqual(auditGoldRows([goodGold]), []);
assert.deepEqual(requiredGoldAuditFields(goodGold), [
  "title",
  "schedule",
  "location",
  "description",
]);
assert.deepEqual(auditGoldSourceLegendParity([goodGold], [goodGold]), []);
assert.deepEqual(
  auditGoldSourceLegendParity(
    [
      {
        ...goodGold,
        source: { ...goodGold.source, documentKeyLegends: [] },
      },
    ],
    [goodGold]
  ),
  ["gold:gold-good:missing_document_key_legends"]
);
assert.deepEqual(
  auditGoldSourceLegendParity([], [goodGold]),
  ["gold:gold-good:missing_live_row_for_source_legend"]
);
assert.deepEqual(
  auditGoldSourceLegendParity(
    [
      {
        ...goodGold,
        id: undefined,
      },
    ],
    [
      {
        ...goodGold,
        candidate_id: "candidate-good",
      },
    ]
  ),
  []
);
const duplicateGoldA = {
  ...goodGold,
  id: "gold-a",
  candidate_id: "source-a:all-star-movies:wellness-scavenger-hunt",
  source_sha256: "a".repeat(64),
  source: { ...goodGold.source, documentHash: "a".repeat(64) },
};
const duplicateGoldB = {
  ...goodGold,
  id: "gold-b",
  candidate_id: "source-b:all-star-movies:wellness-scavenger-hunt",
  source_sha256: "b".repeat(64),
  source: { ...goodGold.source, documentHash: "b".repeat(64) },
};
assert.deepEqual(
  auditGoldSourceLegendParity(
    [
      duplicateGoldA,
      {
        ...duplicateGoldB,
        source: { ...duplicateGoldB.source, documentKeyLegends: [] },
      },
    ],
    [duplicateGoldA, duplicateGoldB]
  ),
  ["gold:source-b:all-star-movies:wellness-scavenger-hunt:missing_document_key_legends"]
);
assert.deepEqual(
  auditGoldRows([
    {
      ...goodGold,
      id: "gold-bad",
      title: "Wellnessscav Engerhunt",
      source_sha256: "broken",
      source: { ...goodGold.source, documentHash: hash },
      field_provenance: {
        ...goodGold.field_provenance,
        schedule: [{}],
      },
    },
  ]),
  [
    "gold:gold-bad:invalid_source_sha256",
    "gold:gold-bad:invalid_structured_source",
    "gold:gold-bad:missing_schedule_provenance",
    "gold:gold-bad:bad_public_text:/Wellnessscav/i",
    "gold:gold-bad:bad_public_text:/Engerhunt/i",
  ]
);

const goodOffering = {
  id: "official-good",
  title: "Bike Rentals",
  description: "Explore by bicycle.",
  resort_slug: "old-key-west-resort",
  source_url: "https://example.test/recreation/bike-rentals/",
  source_sha256: hash,
  field_provenance: {
    title: [{ text: "Bike Rentals" }],
    resort_join: [{ text: "Disney's Old Key West Resort" }],
    description: [{ text: "Explore by bicycle." }],
    availability: [{ text: "Hours: 9:00 AM to 5:00 PM" }],
    location: [{ text: "Rental location: Bike Barn" }],
    price: [{ text: "$15 per hour" }],
    booking: [{ text: "Reservations are recommended." }],
    eligibility: [{ text: "Available to guests of this resort only." }],
    amenities: [{ text: "Life jackets are included." }],
  },
  availability: {
    kind: "evergreen_hours",
    hours_state: "source_hours",
    label: "Daily 9:00 AM-5:00 PM",
  },
  location: { label: "Bike Barn" },
  price: { state: "fee", notes: "$15 per hour" },
  booking: { reservation_recommended: true },
  eligibility: { resort_guest_only: true },
  amenities: ["Life jackets"],
};

assert.deepEqual(auditOfficialOfferingRows([goodOffering]), []);
assert.deepEqual(requiredOfficialAuditFields(goodOffering), [
  "title",
  "resort_join",
  "description",
  "price",
  "booking",
  "availability",
]);
assert.deepEqual(
  auditOfficialOfferingRows([
    {
      ...goodOffering,
      id: "official-bad",
      resort_slug: "",
      source_sha256: "1234",
      field_provenance: {
        title: [{}],
        resort_join: [],
        description: goodOffering.field_provenance.description,
        availability: goodOffering.field_provenance.availability,
        location: goodOffering.field_provenance.location,
        price: goodOffering.field_provenance.price,
        booking: goodOffering.field_provenance.booking,
        eligibility: goodOffering.field_provenance.eligibility,
        amenities: goodOffering.field_provenance.amenities,
      },
    },
  ]),
  [
    "official:official-bad:missing_resort_slug",
    "official:official-bad:invalid_source_sha256",
    "official:official-bad:missing_title_provenance",
    "official:official-bad:missing_resort_join_provenance",
  ]
);

assert.deepEqual(
  auditOfficialOfferingRows([
    {
      ...goodOffering,
      id: "official-missing-specific-field-sources",
      field_provenance: {
        ...goodOffering.field_provenance,
        location: [],
        price: [],
        booking: [],
        eligibility: [],
        amenities: [],
      },
    },
  ]),
  [
    "official:official-missing-specific-field-sources:missing_price_provenance",
    "official:official-missing-specific-field-sources:missing_booking_provenance",
    "official:official-missing-specific-field-sources:missing_eligibility_provenance",
    "official:official-missing-specific-field-sources:missing_amenities_provenance",
    "official:official-missing-specific-field-sources:missing_location_provenance",
  ]
);

assert.deepEqual(
  auditOfficialOfferingRows([
    {
      ...goodOffering,
      id: "official-missing-availability-source",
      field_provenance: {
        ...goodOffering.field_provenance,
        availability: [],
      },
    },
  ]),
  ["official:official-missing-availability-source:missing_availability_provenance"]
);

assert.deepEqual(
  auditOfficialOfferingRows([
    {
      ...goodOffering,
      id: "official-placeholder-availability",
      availability: {
        kind: "evergreen_all_day",
        hours_state: "source_unspecified",
        label: "Hours not specified by Disney",
      },
      field_provenance: {
        ...goodOffering.field_provenance,
        availability: [],
      },
    },
  ]),
  []
);

const sourceDocPdf = {
  id: "source-doc-pdf",
  source_type: "pdf",
  canonical_url: goodGold.source_url,
  content_sha256: hash,
};
const sourceDocPdfParent = {
  id: "source-doc-pdf-parent",
  source_type: "html",
  canonical_url: "https://example.test/resorts/all-star-movies/recreation/",
  content_sha256: "c".repeat(64),
};
const sourceDocHtml = {
  id: "source-doc-html",
  source_type: "html",
  canonical_url: goodOffering.source_url,
  content_sha256: hash,
};
const ledgerGold = {
  ...goodGold,
  source_document_id: sourceDocPdf.id,
  price: { state: "fee" },
};
const ledgerOffering = {
  ...goodOffering,
  source_document_id: sourceDocHtml.id,
};
assert.deepEqual(
  auditSourceTrustLedger({
    goldRows: [ledgerGold],
    officialRows: [ledgerOffering],
    sourceDocuments: [sourceDocPdf, sourceDocPdfParent, sourceDocHtml],
    currentnessChecks: [
      { source_document_id: sourceDocPdf.id, currentness: "current" },
      { source_document_id: sourceDocPdfParent.id, currentness: "current" },
      { source_document_id: sourceDocHtml.id, currentness: "current" },
    ],
    sourceRelationships: [
      {
        parent_source_document_id: sourceDocPdfParent.id,
        child_source_document_id: sourceDocPdf.id,
        relationship_type: "resort_page_links_pdf",
      },
    ],
    fieldAuditObservations: [
      ...requiredGoldAuditFields(ledgerGold).map((field_name) => ({
        row_kind: "gold_activity",
        row_key: "all-star-movies:wellness-scavenger-hunt",
        field_name,
      })),
      ...requiredOfficialAuditFields(ledgerOffering).map((field_name) => ({
        row_kind: "official_offering",
        row_key: "official-good",
        field_name,
      })),
    ],
  }),
  []
);
assert.deepEqual(
  auditSourceTrustLedger({
    goldRows: [ledgerGold],
    officialRows: [ledgerOffering],
    sourceDocuments: [sourceDocPdf, sourceDocPdfParent, sourceDocHtml],
    currentnessChecks: [{ source_document_id: sourceDocHtml.id, currentness: "current" }],
    sourceRelationships: [],
    fieldAuditObservations: [],
  }),
  [
    "source_document_missing_currentness_check:source-doc-pdf",
    "source_document_missing_relationship_for_pdf:source-doc-pdf",
    "gold_row_missing_source_chain:gold-good",
    "field_audit_observation_missing_for_required_field:gold_activity:all-star-movies:wellness-scavenger-hunt:title",
    "field_audit_observation_missing_for_required_field:gold_activity:all-star-movies:wellness-scavenger-hunt:schedule",
    "field_audit_observation_missing_for_required_field:gold_activity:all-star-movies:wellness-scavenger-hunt:location",
    "field_audit_observation_missing_for_required_field:gold_activity:all-star-movies:wellness-scavenger-hunt:description",
    "field_audit_observation_missing_for_required_field:gold_activity:all-star-movies:wellness-scavenger-hunt:price",
    "field_audit_observation_missing_for_required_field:official_offering:official-good:title",
    "field_audit_observation_missing_for_required_field:official_offering:official-good:resort_join",
    "field_audit_observation_missing_for_required_field:official_offering:official-good:description",
    "field_audit_observation_missing_for_required_field:official_offering:official-good:price",
    "field_audit_observation_missing_for_required_field:official_offering:official-good:booking",
    "field_audit_observation_missing_for_required_field:official_offering:official-good:availability",
  ]
);

assert.deepEqual(
  auditSourceTrustLedger({
    goldRows: [ledgerGold],
    officialRows: [],
    sourceDocuments: [sourceDocPdf, sourceDocPdfParent],
    currentnessChecks: [
      { source_document_id: sourceDocPdf.id, currentness: "current" },
      { source_document_id: sourceDocPdfParent.id, currentness: "current" },
    ],
    sourceRelationships: [
      {
        parent_source_document_id: null,
        child_source_document_id: sourceDocPdf.id,
        relationship_type: "resort_page_links_pdf",
      },
    ],
    fieldAuditObservations: requiredGoldAuditFields(ledgerGold).map((field_name) => ({
      row_kind: "gold_activity",
      row_key: "all-star-movies:wellness-scavenger-hunt",
      field_name,
    })),
  }),
  ["source_document_pdf_relationship_missing_parent:source-doc-pdf"]
);
