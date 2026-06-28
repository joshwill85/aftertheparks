export const SEARCH_COLLECTION_ALIAS = "search_documents";
export const SEARCH_COLLECTION_VERSION = "search_documents_v1";
export const SEARCH_SYNONYM_SET = "search_document_synonyms";

export const SEARCH_COLLECTION_SCHEMA = {
  name: SEARCH_COLLECTION_VERSION,
  synonym_sets: [SEARCH_SYNONYM_SET],
  fields: [
    { name: "kind", type: "string", facet: true },

    { name: "title", type: "string" },
    { name: "titleSort", type: "string", sort: true },

    { name: "subtitle", type: "string", optional: true },
    { name: "description", type: "string", optional: true },

    { name: "aliases", type: "string[]", optional: true },
    { name: "keywords", type: "string[]", optional: true },

    { name: "resortSlug", type: "string", facet: true, optional: true },
    { name: "resortName", type: "string", facet: true, optional: true },
    { name: "resortArea", type: "string", facet: true, optional: true },
    { name: "resortTier", type: "string", facet: true, optional: true },

    { name: "category", type: "string", facet: true, optional: true },
    { name: "categoryLabel", type: "string", facet: true, optional: true },
    { name: "locationLabel", type: "string", optional: true },
    { name: "daypart", type: "string", facet: true, optional: true },
    { name: "scheduleText", type: "string", optional: true },

    { name: "priceState", type: "string", facet: true, optional: true },
    { name: "reservationState", type: "string", facet: true, optional: true },

    { name: "isHappeningNow", type: "bool", facet: true, optional: true },
    { name: "isTonight", type: "bool", facet: true, optional: true },

    { name: "href", type: "string", index: false },
    { name: "sourceId", type: "string", index: false },
  ],
};
