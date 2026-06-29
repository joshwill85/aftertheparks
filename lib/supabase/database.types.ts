export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_access_rules: {
        Row: {
          access_notes: string | null
          activity_catalog_id: string
          adult_required: boolean | null
          evidence: Json
          id: string
          open_to_non_resort_guests: boolean | null
          pool_gated: boolean | null
          resort_guest_only: boolean | null
          sister_resort_access: boolean | null
          source_document_id: string | null
          source_fact_id: string | null
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          activity_catalog_id: string
          adult_required?: boolean | null
          evidence?: Json
          id?: string
          open_to_non_resort_guests?: boolean | null
          pool_gated?: boolean | null
          resort_guest_only?: boolean | null
          sister_resort_access?: boolean | null
          source_document_id?: string | null
          source_fact_id?: string | null
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          activity_catalog_id?: string
          adult_required?: boolean | null
          evidence?: Json
          id?: string
          open_to_non_resort_guests?: boolean | null
          pool_gated?: boolean | null
          resort_guest_only?: boolean | null
          sister_resort_access?: boolean | null
          source_document_id?: string | null
          source_fact_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_access_rules_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: true
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_access_rules_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: true
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "activity_access_rules_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_access_rules_source_fact_id_fkey"
            columns: ["source_fact_id"]
            isOneToOne: false
            referencedRelation: "external_activity_facts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_booking_metadata: {
        Row: {
          activity_catalog_id: string
          age_minimum: number | null
          booking_url: string | null
          booking_window_days: number | null
          cancellation_policy: string | null
          check_in_offset_minutes: number | null
          duration_minutes: number | null
          evidence: Json
          id: string
          payment_methods: string[]
          payment_timing: string | null
          price_basis: string | null
          price_cents_max: number | null
          price_cents_min: number | null
          price_options_json: Json
          reservation_method: string | null
          reservation_phone: string | null
          reservation_recommended: boolean | null
          reservation_required: boolean | null
          same_day_available: boolean | null
          source_document_id: string | null
          source_url: string | null
          tax_notes: string | null
          updated_at: string
          walk_ups_allowed: boolean | null
        }
        Insert: {
          activity_catalog_id: string
          age_minimum?: number | null
          booking_url?: string | null
          booking_window_days?: number | null
          cancellation_policy?: string | null
          check_in_offset_minutes?: number | null
          duration_minutes?: number | null
          evidence?: Json
          id?: string
          payment_methods?: string[]
          payment_timing?: string | null
          price_basis?: string | null
          price_cents_max?: number | null
          price_cents_min?: number | null
          price_options_json?: Json
          reservation_method?: string | null
          reservation_phone?: string | null
          reservation_recommended?: boolean | null
          reservation_required?: boolean | null
          same_day_available?: boolean | null
          source_document_id?: string | null
          source_url?: string | null
          tax_notes?: string | null
          updated_at?: string
          walk_ups_allowed?: boolean | null
        }
        Update: {
          activity_catalog_id?: string
          age_minimum?: number | null
          booking_url?: string | null
          booking_window_days?: number | null
          cancellation_policy?: string | null
          check_in_offset_minutes?: number | null
          duration_minutes?: number | null
          evidence?: Json
          id?: string
          payment_methods?: string[]
          payment_timing?: string | null
          price_basis?: string | null
          price_cents_max?: number | null
          price_cents_min?: number | null
          price_options_json?: Json
          reservation_method?: string | null
          reservation_phone?: string | null
          reservation_recommended?: boolean | null
          reservation_required?: boolean | null
          same_day_available?: boolean | null
          source_document_id?: string | null
          source_url?: string | null
          tax_notes?: string | null
          updated_at?: string
          walk_ups_allowed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_booking_metadata_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: true
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_booking_metadata_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: true
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "activity_booking_metadata_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_calendar_groups: {
        Row: {
          calendar_group_key: string
          created_at: string
          current_edition_id: string | null
          ingested_at: string
          notes: string | null
          pdf_edition: string | null
          pdf_url: string | null
          recreation_page_url: string
        }
        Insert: {
          calendar_group_key: string
          created_at?: string
          current_edition_id?: string | null
          ingested_at: string
          notes?: string | null
          pdf_edition?: string | null
          pdf_url?: string | null
          recreation_page_url: string
        }
        Update: {
          calendar_group_key?: string
          created_at?: string
          current_edition_id?: string | null
          ingested_at?: string
          notes?: string | null
          pdf_edition?: string | null
          pdf_url?: string | null
          recreation_page_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_calendar_groups_current_edition_id_fkey"
            columns: ["current_edition_id"]
            isOneToOne: false
            referencedRelation: "calendar_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_calendar_groups_current_edition_id_fkey"
            columns: ["current_edition_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["edition_id"]
          },
        ]
      }
      activity_catalog: {
        Row: {
          calendar_group_key: string
          canonical_name: string
          default_category: Database["public"]["Enums"]["activity_category"]
          id: string
          is_deprecated: boolean
          normalized_name: string
        }
        Insert: {
          calendar_group_key: string
          canonical_name: string
          default_category: Database["public"]["Enums"]["activity_category"]
          id: string
          is_deprecated?: boolean
          normalized_name: string
        }
        Update: {
          calendar_group_key?: string
          canonical_name?: string
          default_category?: Database["public"]["Enums"]["activity_category"]
          id?: string
          is_deprecated?: boolean
          normalized_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_catalog_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "activity_catalog_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
        ]
      }
      activity_claims: {
        Row: {
          activity_catalog_id: string | null
          candidate_id: string | null
          claim_kind: string
          claim_value: string
          confidence: number
          created_at: string
          evidence: Json
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          activity_catalog_id?: string | null
          candidate_id?: string | null
          claim_kind: string
          claim_value?: string
          confidence?: number
          created_at?: string
          evidence?: Json
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          activity_catalog_id?: string | null
          candidate_id?: string | null
          claim_kind?: string
          claim_value?: string
          confidence?: number
          created_at?: string
          evidence?: Json
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_claims_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_claims_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "activity_claims_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "activity_extraction_candidates"
            referencedColumns: ["candidate_id"]
          },
        ]
      }
      activity_cross_resort_access: {
        Row: {
          edition_id: string
          guest_resort_id: string
          host_calendar_group_key: string
          id: string
          notes: string | null
          rule_type: Database["public"]["Enums"]["cross_resort_rule_type"]
        }
        Insert: {
          edition_id: string
          guest_resort_id: string
          host_calendar_group_key: string
          id?: string
          notes?: string | null
          rule_type?: Database["public"]["Enums"]["cross_resort_rule_type"]
        }
        Update: {
          edition_id?: string
          guest_resort_id?: string
          host_calendar_group_key?: string
          id?: string
          notes?: string | null
          rule_type?: Database["public"]["Enums"]["cross_resort_rule_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activity_cross_resort_access_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "calendar_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_cross_resort_access_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["edition_id"]
          },
          {
            foreignKeyName: "activity_cross_resort_access_guest_resort_id_fkey"
            columns: ["guest_resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_cross_resort_access_guest_resort_id_fkey"
            columns: ["guest_resort_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_id"]
          },
          {
            foreignKeyName: "activity_cross_resort_access_host_calendar_group_key_fkey"
            columns: ["host_calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "activity_cross_resort_access_host_calendar_group_key_fkey"
            columns: ["host_calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
        ]
      }
      activity_enrichment: {
        Row: {
          access_notes: string | null
          accessibility: Json
          activity_catalog_id: string
          activity_variant: string | null
          age_fit: Json
          duration_minutes: number | null
          environment: string[]
          exact_venue: string | null
          geo_lat: number | null
          geo_lng: number | null
          hero_image_url: string | null
          hidden_character_name: string | null
          host_area_or_wing: string | null
          image_rights: Json | null
          meeting_location_detail: string | null
          open_to_non_resort_guests: boolean | null
          operator_type: string | null
          pool_gated: boolean | null
          price_notes: string | null
          price_state: Database["public"]["Enums"]["price_state"]
          prize_or_completion_rule: string | null
          program_family: string | null
          redemption_location: string | null
          reservation_notes: string | null
          reservation_required: boolean | null
          reservation_url: string | null
          resort_guest_only: boolean | null
          search_vector: unknown
          sensory: Json
          sister_resort_access: boolean | null
          source_facts: Json
          status: Database["public"]["Enums"]["activity_status"]
          summary_original: string | null
          updated_at: string
          verification_last_checked: string | null
          verification_source_url: string | null
          weather_dependency:
            | Database["public"]["Enums"]["weather_dependency"]
            | null
        }
        Insert: {
          access_notes?: string | null
          accessibility?: Json
          activity_catalog_id: string
          activity_variant?: string | null
          age_fit?: Json
          duration_minutes?: number | null
          environment?: string[]
          exact_venue?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          hero_image_url?: string | null
          hidden_character_name?: string | null
          host_area_or_wing?: string | null
          image_rights?: Json | null
          meeting_location_detail?: string | null
          open_to_non_resort_guests?: boolean | null
          operator_type?: string | null
          pool_gated?: boolean | null
          price_notes?: string | null
          price_state?: Database["public"]["Enums"]["price_state"]
          prize_or_completion_rule?: string | null
          program_family?: string | null
          redemption_location?: string | null
          reservation_notes?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          resort_guest_only?: boolean | null
          search_vector?: unknown
          sensory?: Json
          sister_resort_access?: boolean | null
          source_facts?: Json
          status?: Database["public"]["Enums"]["activity_status"]
          summary_original?: string | null
          updated_at?: string
          verification_last_checked?: string | null
          verification_source_url?: string | null
          weather_dependency?:
            | Database["public"]["Enums"]["weather_dependency"]
            | null
        }
        Update: {
          access_notes?: string | null
          accessibility?: Json
          activity_catalog_id?: string
          activity_variant?: string | null
          age_fit?: Json
          duration_minutes?: number | null
          environment?: string[]
          exact_venue?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          hero_image_url?: string | null
          hidden_character_name?: string | null
          host_area_or_wing?: string | null
          image_rights?: Json | null
          meeting_location_detail?: string | null
          open_to_non_resort_guests?: boolean | null
          operator_type?: string | null
          pool_gated?: boolean | null
          price_notes?: string | null
          price_state?: Database["public"]["Enums"]["price_state"]
          prize_or_completion_rule?: string | null
          program_family?: string | null
          redemption_location?: string | null
          reservation_notes?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          resort_guest_only?: boolean | null
          search_vector?: unknown
          sensory?: Json
          sister_resort_access?: boolean | null
          source_facts?: Json
          status?: Database["public"]["Enums"]["activity_status"]
          summary_original?: string | null
          updated_at?: string
          verification_last_checked?: string | null
          verification_source_url?: string | null
          weather_dependency?:
            | Database["public"]["Enums"]["weather_dependency"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_enrichment_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: true
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_enrichment_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: true
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
        ]
      }
      activity_extraction_candidates: {
        Row: {
          activity_slug: string
          calendar_group_key: string
          candidate_id: string
          confidence: number
          content_sha256: string
          created_at: string
          ingest_run_id: string | null
          layout_snapshot_id: string | null
          normalized_fields: Json
          parser_version: string
          profile_key: string
          raw_fields: Json
          source_document_id: string | null
          source_spans: Json
          status: string
          updated_at: string
          validation_errors: Json
          warnings: Json
        }
        Insert: {
          activity_slug: string
          calendar_group_key: string
          candidate_id: string
          confidence?: number
          content_sha256: string
          created_at?: string
          ingest_run_id?: string | null
          layout_snapshot_id?: string | null
          normalized_fields: Json
          parser_version: string
          profile_key: string
          raw_fields: Json
          source_document_id?: string | null
          source_spans?: Json
          status?: string
          updated_at?: string
          validation_errors?: Json
          warnings?: Json
        }
        Update: {
          activity_slug?: string
          calendar_group_key?: string
          candidate_id?: string
          confidence?: number
          content_sha256?: string
          created_at?: string
          ingest_run_id?: string | null
          layout_snapshot_id?: string | null
          normalized_fields?: Json
          parser_version?: string
          profile_key?: string
          raw_fields?: Json
          source_document_id?: string | null
          source_spans?: Json
          status?: string
          updated_at?: string
          validation_errors?: Json
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_extraction_candidates_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "activity_extraction_candidates_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "activity_extraction_candidates_ingest_run_id_fkey"
            columns: ["ingest_run_id"]
            isOneToOne: false
            referencedRelation: "ingest_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_extraction_candidates_layout_snapshot_id_fkey"
            columns: ["layout_snapshot_id"]
            isOneToOne: false
            referencedRelation: "activity_layout_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_extraction_candidates_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_field_provenance: {
        Row: {
          candidate_id: string
          confidence: number
          created_at: string
          field_name: string
          field_value: string | null
          id: string
          is_required: boolean
          source_spans: Json
          source_type: string
          transformation: string | null
        }
        Insert: {
          candidate_id: string
          confidence?: number
          created_at?: string
          field_name: string
          field_value?: string | null
          id?: string
          is_required?: boolean
          source_spans?: Json
          source_type?: string
          transformation?: string | null
        }
        Update: {
          candidate_id?: string
          confidence?: number
          created_at?: string
          field_name?: string
          field_value?: string | null
          id?: string
          is_required?: boolean
          source_spans?: Json
          source_type?: string
          transformation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_field_provenance_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "activity_extraction_candidates"
            referencedColumns: ["candidate_id"]
          },
        ]
      }
      activity_layout_snapshots: {
        Row: {
          content_sha256: string
          created_at: string
          id: string
          page_count: number
          parser_version: string
          snapshot_json: Json
          source_document_id: string | null
        }
        Insert: {
          content_sha256: string
          created_at?: string
          id?: string
          page_count: number
          parser_version: string
          snapshot_json: Json
          source_document_id?: string | null
        }
        Update: {
          content_sha256?: string
          created_at?: string
          id?: string
          page_count?: number
          parser_version?: string
          snapshot_json?: Json
          source_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_layout_snapshots_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_occurrence_rules: {
        Row: {
          activity_catalog_id: string
          created_at: string
          day_of_week: number | null
          edition_id: string | null
          effective_from: string | null
          effective_until: string | null
          end_time: string | null
          id: string
          is_daily: boolean
          schedule_notes: string | null
          start_time: string | null
          timezone: string
        }
        Insert: {
          activity_catalog_id: string
          created_at?: string
          day_of_week?: number | null
          edition_id?: string | null
          effective_from?: string | null
          effective_until?: string | null
          end_time?: string | null
          id?: string
          is_daily?: boolean
          schedule_notes?: string | null
          start_time?: string | null
          timezone?: string
        }
        Update: {
          activity_catalog_id?: string
          created_at?: string
          day_of_week?: number | null
          edition_id?: string | null
          effective_from?: string | null
          effective_until?: string | null
          end_time?: string | null
          id?: string
          is_daily?: boolean
          schedule_notes?: string | null
          start_time?: string | null
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_occurrence_rules_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_occurrence_rules_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "activity_occurrence_rules_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "calendar_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_occurrence_rules_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["edition_id"]
          },
        ]
      }
      activity_pool_links: {
        Row: {
          activity_catalog_id: string
          pool_id: string
        }
        Insert: {
          activity_catalog_id: string
          pool_id: string
        }
        Update: {
          activity_catalog_id?: string
          pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_pool_links_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_pool_links_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "activity_pool_links_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "resort_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_price_options: {
        Row: {
          activity_catalog_id: string
          day_of_week: Database["public"]["Enums"]["day_of_week"] | null
          evidence: Json
          id: string
          notes: string | null
          option_key: string
          option_name: string | null
          price_basis: string | null
          price_cents_max: number | null
          price_cents_min: number | null
          source_document_id: string | null
          source_fact_id: string | null
          updated_at: string
        }
        Insert: {
          activity_catalog_id: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"] | null
          evidence?: Json
          id?: string
          notes?: string | null
          option_key?: string
          option_name?: string | null
          price_basis?: string | null
          price_cents_max?: number | null
          price_cents_min?: number | null
          source_document_id?: string | null
          source_fact_id?: string | null
          updated_at?: string
        }
        Update: {
          activity_catalog_id?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"] | null
          evidence?: Json
          id?: string
          notes?: string | null
          option_key?: string
          option_name?: string | null
          price_basis?: string | null
          price_cents_max?: number | null
          price_cents_min?: number | null
          source_document_id?: string | null
          source_fact_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_price_options_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_price_options_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "activity_price_options_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_price_options_source_fact_id_fkey"
            columns: ["source_fact_id"]
            isOneToOne: false
            referencedRelation: "external_activity_facts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_program_links: {
        Row: {
          activity_catalog_id: string
          program_key: string
          source_fact_id: string | null
          variant_name: string | null
        }
        Insert: {
          activity_catalog_id: string
          program_key: string
          source_fact_id?: string | null
          variant_name?: string | null
        }
        Update: {
          activity_catalog_id?: string
          program_key?: string
          source_fact_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_program_links_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_program_links_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "activity_program_links_program_key_fkey"
            columns: ["program_key"]
            isOneToOne: false
            referencedRelation: "activity_programs"
            referencedColumns: ["program_key"]
          },
          {
            foreignKeyName: "activity_program_links_source_fact_id_fkey"
            columns: ["source_fact_id"]
            isOneToOne: false
            referencedRelation: "external_activity_facts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_programs: {
        Row: {
          category: Database["public"]["Enums"]["activity_category"] | null
          created_at: string
          description: string | null
          label: string
          program_key: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["activity_category"] | null
          created_at?: string
          description?: string | null
          label: string
          program_key: string
        }
        Update: {
          category?: Database["public"]["Enums"]["activity_category"] | null
          created_at?: string
          description?: string | null
          label?: string
          program_key?: string
        }
        Relationships: []
      }
      activity_review_queue: {
        Row: {
          calendar_group_key: string | null
          candidate_id: string | null
          created_at: string
          detail: string | null
          id: string
          reason_code: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewer: string | null
          severity: string
          source_document_id: string | null
          status: string
        }
        Insert: {
          calendar_group_key?: string | null
          candidate_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          reason_code: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewer?: string | null
          severity?: string
          source_document_id?: string | null
          status?: string
        }
        Update: {
          calendar_group_key?: string | null
          candidate_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          reason_code?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewer?: string | null
          severity?: string
          source_document_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_review_queue_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "activity_review_queue_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "activity_review_queue_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "activity_extraction_candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "activity_review_queue_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_schedules: {
        Row: {
          activity_catalog_id: string | null
          activity_id: string
          day_of_week: Database["public"]["Enums"]["day_of_week"] | null
          edition_id: string | null
          end_time: string | null
          id: string
          is_daily: boolean
          schedule_notes: string | null
          start_time: string | null
        }
        Insert: {
          activity_catalog_id?: string | null
          activity_id: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"] | null
          edition_id?: string | null
          end_time?: string | null
          id: string
          is_daily?: boolean
          schedule_notes?: string | null
          start_time?: string | null
        }
        Update: {
          activity_catalog_id?: string | null
          activity_id?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"] | null
          edition_id?: string | null
          end_time?: string | null
          id?: string
          is_daily?: boolean
          schedule_notes?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_schedules_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_schedules_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "activity_schedules_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "resort_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_schedules_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_current"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_schedules_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "calendar_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_schedules_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["edition_id"]
          },
        ]
      }
      activity_slug_redirects: {
        Row: {
          canonical_slug: string
          created_at: string
          legacy_slug: string
          reason: string | null
        }
        Insert: {
          canonical_slug: string
          created_at?: string
          legacy_slug: string
          reason?: string | null
        }
        Update: {
          canonical_slug?: string
          created_at?: string
          legacy_slug?: string
          reason?: string | null
        }
        Relationships: []
      }
      activity_weather_profiles: {
        Row: {
          activity_slug: string
          created_at: string
          profile_payload: Json
          profile_tags: string[]
          updated_at: string
        }
        Insert: {
          activity_slug: string
          created_at?: string
          profile_payload?: Json
          profile_tags?: string[]
          updated_at?: string
        }
        Update: {
          activity_slug?: string
          created_at?: string
          profile_payload?: Json
          profile_tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      api_rate_limit_buckets: {
        Row: {
          bucket_key: string
          request_count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          request_count?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      calendar_edition_overlays: {
        Row: {
          edition_id: string
          overlay_id: string
        }
        Insert: {
          edition_id: string
          overlay_id: string
        }
        Update: {
          edition_id?: string
          overlay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_edition_overlays_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "calendar_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_edition_overlays_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["edition_id"]
          },
          {
            foreignKeyName: "calendar_edition_overlays_overlay_id_fkey"
            columns: ["overlay_id"]
            isOneToOne: false
            referencedRelation: "seasonal_overlays"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_editions: {
        Row: {
          calendar_group_key: string
          created_at: string
          edition_code: string
          id: string
          is_current: boolean
          source_document_id: string | null
          supersedes_edition_id: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          calendar_group_key: string
          created_at?: string
          edition_code: string
          id?: string
          is_current?: boolean
          source_document_id?: string | null
          supersedes_edition_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          calendar_group_key?: string
          created_at?: string
          edition_code?: string
          id?: string
          is_current?: boolean
          source_document_id?: string | null
          supersedes_edition_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_editions_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "calendar_editions_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "calendar_editions_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_editions_supersedes_edition_id_fkey"
            columns: ["supersedes_edition_id"]
            isOneToOne: false
            referencedRelation: "calendar_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_editions_supersedes_edition_id_fkey"
            columns: ["supersedes_edition_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["edition_id"]
          },
        ]
      }
      character_appearances: {
        Row: {
          appearance_time: string | null
          calendar_group_key: string
          character_name: string
          day_of_week: Database["public"]["Enums"]["day_of_week"] | null
          edition_id: string | null
          id: string
          is_scheduled: boolean
          location: string | null
          source_document_id: string | null
        }
        Insert: {
          appearance_time?: string | null
          calendar_group_key: string
          character_name: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"] | null
          edition_id?: string | null
          id?: string
          is_scheduled?: boolean
          location?: string | null
          source_document_id?: string | null
        }
        Update: {
          appearance_time?: string | null
          calendar_group_key?: string
          character_name?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"] | null
          edition_id?: string | null
          id?: string
          is_scheduled?: boolean
          location?: string | null
          source_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_appearances_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "character_appearances_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "character_appearances_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "calendar_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_appearances_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["edition_id"]
          },
          {
            foreignKeyName: "character_appearances_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      content_corrections: {
        Row: {
          activity_catalog_id: string | null
          body: string | null
          field: string
          id: string
          reporter_email: string | null
          reporter_name: string | null
          status: Database["public"]["Enums"]["correction_status"]
          submitted_at: string
          suggested_value: string
        }
        Insert: {
          activity_catalog_id?: string | null
          body?: string | null
          field: string
          id?: string
          reporter_email?: string | null
          reporter_name?: string | null
          status?: Database["public"]["Enums"]["correction_status"]
          submitted_at?: string
          suggested_value: string
        }
        Update: {
          activity_catalog_id?: string | null
          body?: string | null
          field?: string
          id?: string
          reporter_email?: string | null
          reporter_name?: string | null
          status?: Database["public"]["Enums"]["correction_status"]
          submitted_at?: string
          suggested_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_corrections_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_corrections_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
        ]
      }
      email_marketing_consents: {
        Row: {
          consent_version: string
          consented_at: string
          email: string
          id: string
          source: string
          status: Database["public"]["Enums"]["marketing_consent_status"]
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_version: string
          consented_at?: string
          email: string
          id?: string
          source: string
          status: Database["public"]["Enums"]["marketing_consent_status"]
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_version?: string
          consented_at?: string
          email?: string
          id?: string
          source?: string
          status?: Database["public"]["Enums"]["marketing_consent_status"]
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      external_activity_facts: {
        Row: {
          activity_catalog_id: string | null
          activity_slug: string
          activity_title: string
          calendar_group_key: string | null
          created_at: string
          evidence_json: Json
          facts_json: Json
          fetched_at: string | null
          id: string
          match_confidence: number | null
          match_status: string
          match_type: string | null
          resort_slugs: string[]
          review_status: string
          source_content_sha256: string | null
          source_document_id: string | null
          source_page_kind: string
          source_provider: string
          source_url: string
          updated_at: string
        }
        Insert: {
          activity_catalog_id?: string | null
          activity_slug: string
          activity_title: string
          calendar_group_key?: string | null
          created_at?: string
          evidence_json?: Json
          facts_json?: Json
          fetched_at?: string | null
          id?: string
          match_confidence?: number | null
          match_status?: string
          match_type?: string | null
          resort_slugs?: string[]
          review_status?: string
          source_content_sha256?: string | null
          source_document_id?: string | null
          source_page_kind: string
          source_provider?: string
          source_url: string
          updated_at?: string
        }
        Update: {
          activity_catalog_id?: string | null
          activity_slug?: string
          activity_title?: string
          calendar_group_key?: string | null
          created_at?: string
          evidence_json?: Json
          facts_json?: Json
          fetched_at?: string | null
          id?: string
          match_confidence?: number | null
          match_status?: string
          match_type?: string | null
          resort_slugs?: string[]
          review_status?: string
          source_content_sha256?: string | null
          source_document_id?: string | null
          source_page_kind?: string
          source_provider?: string
          source_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_activity_facts_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_activity_facts_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "external_activity_facts_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "external_activity_facts_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "external_activity_facts_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      field_audit_observations: {
        Row: {
          confidence: string
          created_at: string
          evidence: Json
          field_name: string
          id: string
          method: string
          observed_value: string | null
          published_row_id: string | null
          row_key: string
          row_kind: string
          source_document_id: string | null
        }
        Insert: {
          confidence: string
          created_at?: string
          evidence?: Json
          field_name: string
          id?: string
          method: string
          observed_value?: string | null
          published_row_id?: string | null
          row_key: string
          row_kind: string
          source_document_id?: string | null
        }
        Update: {
          confidence?: string
          created_at?: string
          evidence?: Json
          field_name?: string
          id?: string
          method?: string
          observed_value?: string | null
          published_row_id?: string | null
          row_key?: string
          row_kind?: string
          source_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_audit_observations_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_runs: {
        Row: {
          finished_at: string | null
          id: string
          parser_version: string
          started_at: string
          status: Database["public"]["Enums"]["ingest_status"]
          summary_json: Json
          trigger: Database["public"]["Enums"]["ingest_trigger"]
        }
        Insert: {
          finished_at?: string | null
          id?: string
          parser_version: string
          started_at?: string
          status?: Database["public"]["Enums"]["ingest_status"]
          summary_json?: Json
          trigger?: Database["public"]["Enums"]["ingest_trigger"]
        }
        Update: {
          finished_at?: string | null
          id?: string
          parser_version?: string
          started_at?: string
          status?: Database["public"]["Enums"]["ingest_status"]
          summary_json?: Json
          trigger?: Database["public"]["Enums"]["ingest_trigger"]
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          created_at: string
          deleted_at: string | null
          home_resort_slug: string | null
          id: string
          last_opened_at: string | null
          owner_user_id: string
          status: Database["public"]["Enums"]["itinerary_status"]
          timezone: string
          title: string
          trip_end_date: string | null
          trip_start_date: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          home_resort_slug?: string | null
          id?: string
          last_opened_at?: string | null
          owner_user_id: string
          status?: Database["public"]["Enums"]["itinerary_status"]
          timezone?: string
          title?: string
          trip_end_date?: string | null
          trip_start_date?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          home_resort_slug?: string | null
          id?: string
          last_opened_at?: string | null
          owner_user_id?: string
          status?: Database["public"]["Enums"]["itinerary_status"]
          timezone?: string
          title?: string
          trip_end_date?: string | null
          trip_start_date?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_home_resort_slug_fkey"
            columns: ["home_resort_slug"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "itineraries_home_resort_slug_fkey"
            columns: ["home_resort_slug"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_slug"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          all_day: boolean
          category: string | null
          created_at: string
          deleted_at: string | null
          ends_at: string | null
          id: string
          itinerary_id: string
          location: string | null
          price_label: string | null
          resort_id: string | null
          resort_name: string
          saved_source_version: string | null
          snapshot_json: Json
          sort_order: number | null
          source_activity_id: string | null
          source_occurrence_id: string | null
          source_type: Database["public"]["Enums"]["itinerary_item_source_type"]
          source_url: string | null
          source_verified_at: string | null
          starts_at: string | null
          title: string
          updated_at: string
          user_note: string | null
        }
        Insert: {
          all_day?: boolean
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: string
          itinerary_id: string
          location?: string | null
          price_label?: string | null
          resort_id?: string | null
          resort_name: string
          saved_source_version?: string | null
          snapshot_json?: Json
          sort_order?: number | null
          source_activity_id?: string | null
          source_occurrence_id?: string | null
          source_type?: Database["public"]["Enums"]["itinerary_item_source_type"]
          source_url?: string | null
          source_verified_at?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
          user_note?: string | null
        }
        Update: {
          all_day?: boolean
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: string
          itinerary_id?: string
          location?: string | null
          price_label?: string | null
          resort_id?: string | null
          resort_name?: string
          saved_source_version?: string | null
          snapshot_json?: Json
          sort_order?: number | null
          source_activity_id?: string | null
          source_occurrence_id?: string | null
          source_type?: Database["public"]["Enums"]["itinerary_item_source_type"]
          source_url?: string | null
          source_verified_at?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
          user_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_shares: {
        Row: {
          created_at: string
          id: string
          itinerary_id: string
          last_accessed_at: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["itinerary_share_status"]
          token_hash: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          itinerary_id: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["itinerary_share_status"]
          token_hash: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          itinerary_id?: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["itinerary_share_status"]
          token_hash?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_shares_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_nights: {
        Row: {
          activity_catalog_id: string | null
          activity_id: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          edition_id: string | null
          id: string
          location: string | null
          movie_title: string
          parse_confidence: number
          rain_backup_location: string | null
          show_time: string | null
        }
        Insert: {
          activity_catalog_id?: string | null
          activity_id: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          edition_id?: string | null
          id: string
          location?: string | null
          movie_title: string
          parse_confidence?: number
          rain_backup_location?: string | null
          show_time?: string | null
        }
        Update: {
          activity_catalog_id?: string | null
          activity_id?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          edition_id?: string | null
          id?: string
          location?: string | null
          movie_title?: string
          parse_confidence?: number
          rain_backup_location?: string | null
          show_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movie_nights_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_nights_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "movie_nights_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "resort_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_nights_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_current"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_nights_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "calendar_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_nights_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["edition_id"]
          },
        ]
      }
      movie_poster_cache: {
        Row: {
          backdrop_path: string | null
          backdrop_url: string | null
          display_title: string
          lookup_status: string
          overview: string | null
          poster_path: string | null
          poster_url: string | null
          release_year: number | null
          resolved_at: string
          runtime_minutes: number | null
          title_key: string
          tmdb_id: number | null
          vote_average: number | null
        }
        Insert: {
          backdrop_path?: string | null
          backdrop_url?: string | null
          display_title: string
          lookup_status?: string
          overview?: string | null
          poster_path?: string | null
          poster_url?: string | null
          release_year?: number | null
          resolved_at?: string
          runtime_minutes?: number | null
          title_key: string
          tmdb_id?: number | null
          vote_average?: number | null
        }
        Update: {
          backdrop_path?: string | null
          backdrop_url?: string | null
          display_title?: string
          lookup_status?: string
          overview?: string | null
          poster_path?: string | null
          poster_url?: string | null
          release_year?: number | null
          resolved_at?: string
          runtime_minutes?: number | null
          title_key?: string
          tmdb_id?: number | null
          vote_average?: number | null
        }
        Relationships: []
      }
      official_activity_ingest_quarantine: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          program_key: string
          reason_code: string
          source_document_id: string | null
          source_sha256: string
          source_spans: Json
          source_url: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          program_key: string
          reason_code: string
          source_document_id?: string | null
          source_sha256: string
          source_spans?: Json
          source_url: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          program_key?: string
          reason_code?: string
          source_document_id?: string | null
          source_sha256?: string
          source_spans?: Json
          source_url?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_activity_ingest_quarantine_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      official_activity_offerings: {
        Row: {
          amenities: string[]
          availability: Json
          booking: Json
          category: Database["public"]["Enums"]["activity_category"]
          claims: Json
          created_at: string
          description: string | null
          eligibility: Json
          field_provenance: Json
          id: string
          is_current: boolean
          location: Json
          offering_key: string
          price: Json
          program_id: string
          promoted_at: string
          resort_slug: string
          source_document_id: string
          source_sha256: string
          source_url: string
          tags: string[]
          title: string
          trust_state: string
          updated_at: string
          variant_key: string
        }
        Insert: {
          amenities?: string[]
          availability?: Json
          booking?: Json
          category?: Database["public"]["Enums"]["activity_category"]
          claims?: Json
          created_at?: string
          description?: string | null
          eligibility?: Json
          field_provenance?: Json
          id?: string
          is_current?: boolean
          location?: Json
          offering_key: string
          price?: Json
          program_id: string
          promoted_at?: string
          resort_slug: string
          source_document_id: string
          source_sha256: string
          source_url: string
          tags?: string[]
          title: string
          trust_state?: string
          updated_at?: string
          variant_key?: string
        }
        Update: {
          amenities?: string[]
          availability?: Json
          booking?: Json
          category?: Database["public"]["Enums"]["activity_category"]
          claims?: Json
          created_at?: string
          description?: string | null
          eligibility?: Json
          field_provenance?: Json
          id?: string
          is_current?: boolean
          location?: Json
          offering_key?: string
          price?: Json
          program_id?: string
          promoted_at?: string
          resort_slug?: string
          source_document_id?: string
          source_sha256?: string
          source_url?: string
          tags?: string[]
          title?: string
          trust_state?: string
          updated_at?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_activity_offerings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "official_activity_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_activity_offerings_resort_slug_fkey"
            columns: ["resort_slug"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "official_activity_offerings_resort_slug_fkey"
            columns: ["resort_slug"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_slug"]
          },
          {
            foreignKeyName: "official_activity_offerings_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      official_activity_programs: {
        Row: {
          availability: Json
          category: Database["public"]["Enums"]["activity_category"]
          created_at: string
          description: string | null
          field_provenance: Json
          id: string
          is_current: boolean
          program_key: string
          source_document_id: string
          source_sha256: string
          source_url: string
          tags: string[]
          title: string
          trust_state: string
          updated_at: string
        }
        Insert: {
          availability?: Json
          category?: Database["public"]["Enums"]["activity_category"]
          created_at?: string
          description?: string | null
          field_provenance?: Json
          id?: string
          is_current?: boolean
          program_key: string
          source_document_id: string
          source_sha256: string
          source_url: string
          tags?: string[]
          title: string
          trust_state?: string
          updated_at?: string
        }
        Update: {
          availability?: Json
          category?: Database["public"]["Enums"]["activity_category"]
          created_at?: string
          description?: string | null
          field_provenance?: Json
          id?: string
          is_current?: boolean
          program_key?: string
          source_document_id?: string
          source_sha256?: string
          source_url?: string
          tags?: string[]
          title?: string
          trust_state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_activity_programs_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      parse_profiles: {
        Row: {
          description: string | null
          layout_hints_json: Json
          parser_version: string
          profile_key: string
          section_headers_json: Json
        }
        Insert: {
          description?: string | null
          layout_hints_json?: Json
          parser_version: string
          profile_key: string
          section_headers_json?: Json
        }
        Update: {
          description?: string | null
          layout_hints_json?: Json
          parser_version?: string
          profile_key?: string
          section_headers_json?: Json
        }
        Relationships: []
      }
      plan_interest_signups: {
        Row: {
          consent_version: string
          created_at: string
          email: string
          id: string
          marketing_consent: boolean
          source: string
        }
        Insert: {
          consent_version?: string
          created_at?: string
          email: string
          id?: string
          marketing_consent?: boolean
          source?: string
        }
        Update: {
          consent_version?: string
          created_at?: string
          email?: string
          id?: string
          marketing_consent?: boolean
          source?: string
        }
        Relationships: []
      }
      plan_weather_snapshots: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          resilience_score: Json | null
          snapshot_payload: Json
          source_snapshot_keys: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          resilience_score?: Json | null
          snapshot_payload: Json
          source_snapshot_keys?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          resilience_score?: Json | null
          snapshot_payload?: Json
          source_snapshot_keys?: string[]
        }
        Relationships: []
      }
      processed_plan_operations: {
        Row: {
          operation_id: string
          operation_type: string
          owner_user_id: string
          processed_at: string
          result_reference: string | null
        }
        Insert: {
          operation_id: string
          operation_type: string
          owner_user_id: string
          processed_at?: string
          result_reference?: string | null
        }
        Update: {
          operation_id?: string
          operation_type?: string
          owner_user_id?: string
          processed_at?: string
          result_reference?: string | null
        }
        Relationships: []
      }
      public_activity_gold: {
        Row: {
          activity_catalog_id: string
          calendar_group_key: string
          canonical_slug: string
          category: Database["public"]["Enums"]["activity_category"]
          claims: Json
          created_at: string
          description: string | null
          enrichment: Json
          external_facts: Json
          field_provenance: Json
          id: string
          is_current: boolean
          location: Json
          price: Json
          promoted_at: string
          promoted_from_candidate_id: string | null
          resort_slugs: string[]
          schedule: Json
          source: Json
          source_document_id: string
          source_pdf_edition: string | null
          source_sha256: string
          source_url: string
          title: string
          trust_state: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          activity_catalog_id: string
          calendar_group_key: string
          canonical_slug: string
          category: Database["public"]["Enums"]["activity_category"]
          claims?: Json
          created_at?: string
          description?: string | null
          enrichment?: Json
          external_facts?: Json
          field_provenance: Json
          id?: string
          is_current?: boolean
          location: Json
          price?: Json
          promoted_at?: string
          promoted_from_candidate_id?: string | null
          resort_slugs?: string[]
          schedule: Json
          source?: Json
          source_document_id: string
          source_pdf_edition?: string | null
          source_sha256: string
          source_url: string
          title: string
          trust_state?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          activity_catalog_id?: string
          calendar_group_key?: string
          canonical_slug?: string
          category?: Database["public"]["Enums"]["activity_category"]
          claims?: Json
          created_at?: string
          description?: string | null
          enrichment?: Json
          external_facts?: Json
          field_provenance?: Json
          id?: string
          is_current?: boolean
          location?: Json
          price?: Json
          promoted_at?: string
          promoted_from_candidate_id?: string | null
          resort_slugs?: string[]
          schedule?: Json
          source?: Json
          source_document_id?: string
          source_pdf_edition?: string | null
          source_sha256?: string
          source_url?: string
          title?: string
          trust_state?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_activity_gold_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_activity_gold_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "public_activity_gold_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "public_activity_gold_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "public_activity_gold_promoted_from_candidate_id_fkey"
            columns: ["promoted_from_candidate_id"]
            isOneToOne: false
            referencedRelation: "activity_extraction_candidates"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "public_activity_gold_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_extractions: {
        Row: {
          confidence: number
          created_at: string
          extraction_json: Json
          id: string
          ingest_run_id: string | null
          ocr_text: string | null
          parser_version: string
          profile_key: string
          source_document_id: string
          warnings: Json
        }
        Insert: {
          confidence?: number
          created_at?: string
          extraction_json?: Json
          id?: string
          ingest_run_id?: string | null
          ocr_text?: string | null
          parser_version: string
          profile_key?: string
          source_document_id: string
          warnings?: Json
        }
        Update: {
          confidence?: number
          created_at?: string
          extraction_json?: Json
          id?: string
          ingest_run_id?: string | null
          ocr_text?: string | null
          parser_version?: string
          profile_key?: string
          source_document_id?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "raw_extractions_ingest_run_id_fkey"
            columns: ["ingest_run_id"]
            isOneToOne: false
            referencedRelation: "ingest_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_extractions_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      resort_activities: {
        Row: {
          calendar_group_key: string
          category: Database["public"]["Enums"]["activity_category"]
          description: string | null
          id: string
          is_daily: boolean
          is_fee_based: boolean
          location: string | null
          name: string
          normalized_name: string
          schedule_text: string | null
          section: string
          source_pdf_url: string | null
        }
        Insert: {
          calendar_group_key: string
          category: Database["public"]["Enums"]["activity_category"]
          description?: string | null
          id: string
          is_daily?: boolean
          is_fee_based?: boolean
          location?: string | null
          name: string
          normalized_name: string
          schedule_text?: string | null
          section: string
          source_pdf_url?: string | null
        }
        Update: {
          calendar_group_key?: string
          category?: Database["public"]["Enums"]["activity_category"]
          description?: string | null
          id?: string
          is_daily?: boolean
          is_fee_based?: boolean
          location?: string | null
          name?: string
          normalized_name?: string
          schedule_text?: string | null
          section?: string
          source_pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resort_activities_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "resort_activities_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
        ]
      }
      resort_activity_editions: {
        Row: {
          activity_catalog_id: string
          category: Database["public"]["Enums"]["activity_category"]
          description: string | null
          edition_id: string
          fee_amount_cents: number | null
          id: string
          is_active: boolean
          is_daily: boolean
          is_fee_based: boolean
          location: string | null
          name: string
          needs_review: boolean
          parse_confidence: number
          raw_extraction_id: string | null
          schedule_text: string | null
          section: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          activity_catalog_id: string
          category: Database["public"]["Enums"]["activity_category"]
          description?: string | null
          edition_id: string
          fee_amount_cents?: number | null
          id?: string
          is_active?: boolean
          is_daily?: boolean
          is_fee_based?: boolean
          location?: string | null
          name: string
          needs_review?: boolean
          parse_confidence?: number
          raw_extraction_id?: string | null
          schedule_text?: string | null
          section: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          activity_catalog_id?: string
          category?: Database["public"]["Enums"]["activity_category"]
          description?: string | null
          edition_id?: string
          fee_amount_cents?: number | null
          id?: string
          is_active?: boolean
          is_daily?: boolean
          is_fee_based?: boolean
          location?: string | null
          name?: string
          needs_review?: boolean
          parse_confidence?: number
          raw_extraction_id?: string | null
          schedule_text?: string | null
          section?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resort_activity_editions_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resort_activity_editions_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "resort_activity_editions_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "calendar_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resort_activity_editions_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["edition_id"]
          },
          {
            foreignKeyName: "resort_activity_editions_raw_extraction_id_fkey"
            columns: ["raw_extraction_id"]
            isOneToOne: false
            referencedRelation: "raw_extractions"
            referencedColumns: ["id"]
          },
        ]
      }
      resort_activity_sources: {
        Row: {
          calendar_group_key: string
          id: string
          is_primary_source: boolean
          recreation_page_url: string
          resort_id: string
        }
        Insert: {
          calendar_group_key: string
          id?: string
          is_primary_source?: boolean
          recreation_page_url: string
          resort_id: string
        }
        Update: {
          calendar_group_key?: string
          id?: string
          is_primary_source?: boolean
          recreation_page_url?: string
          resort_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resort_activity_sources_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "resort_activity_sources_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "resort_activity_sources_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: true
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resort_activity_sources_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: true
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_id"]
          },
        ]
      }
      resort_pools: {
        Row: {
          disney_url: string | null
          hours_text: string | null
          id: string
          is_feature_pool: boolean
          name: string
          resort_id: string
          slug: string
          source_document_id: string | null
        }
        Insert: {
          disney_url?: string | null
          hours_text?: string | null
          id?: string
          is_feature_pool?: boolean
          name: string
          resort_id: string
          slug: string
          source_document_id?: string | null
        }
        Update: {
          disney_url?: string | null
          hours_text?: string | null
          id?: string
          is_feature_pool?: boolean
          name?: string
          resort_id?: string
          slug?: string
          source_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resort_pools_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resort_pools_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_id"]
          },
          {
            foreignKeyName: "resort_pools_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      resort_recreation_sources: {
        Row: {
          created_at: string
          discovered_pdf_url: string | null
          disney_recreation_slug: string
          id: string
          last_discovered_at: string | null
          notes: string | null
          recreation_page_url: string
          resort_id: string
          resort_slug: string
          source_document_id: string | null
          source_kind: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discovered_pdf_url?: string | null
          disney_recreation_slug: string
          id?: string
          last_discovered_at?: string | null
          notes?: string | null
          recreation_page_url: string
          resort_id: string
          resort_slug: string
          source_document_id?: string | null
          source_kind: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discovered_pdf_url?: string | null
          disney_recreation_slug?: string
          id?: string
          last_discovered_at?: string | null
          notes?: string | null
          recreation_page_url?: string
          resort_id?: string
          resort_slug?: string
          source_document_id?: string | null
          source_kind?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resort_recreation_sources_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: true
            referencedRelation: "resorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resort_recreation_sources_resort_id_fkey"
            columns: ["resort_id"]
            isOneToOne: true
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_id"]
          },
          {
            foreignKeyName: "resort_recreation_sources_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      resorts: {
        Row: {
          category: Database["public"]["Enums"]["resort_category"]
          created_at: string
          disney_url: string
          id: string
          is_dvc: boolean
          name: string
          resort_area: Database["public"]["Enums"]["resort_area"]
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["resort_category"]
          created_at?: string
          disney_url: string
          id?: string
          is_dvc?: boolean
          name: string
          resort_area: Database["public"]["Enums"]["resort_area"]
          slug: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["resort_category"]
          created_at?: string
          disney_url?: string
          id?: string
          is_dvc?: boolean
          name?: string
          resort_area?: Database["public"]["Enums"]["resort_area"]
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      saved_plans: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          payload: Json
          share_slug: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          share_slug: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          share_slug?: string
        }
        Relationships: []
      }
      seasonal_overlays: {
        Row: {
          description: string | null
          disney_url: string | null
          id: string
          name: string
          slug: string
          source_document_id: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          description?: string | null
          disney_url?: string | null
          id?: string
          name: string
          slug: string
          source_document_id?: string | null
          valid_from: string
          valid_until: string
        }
        Update: {
          description?: string | null
          disney_url?: string | null
          id?: string
          name?: string
          slug?: string
          source_document_id?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_overlays_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      source_currentness_checks: {
        Row: {
          canonical_url: string
          checked_at: string
          currentness: string
          detail: Json
          fetched_url: string | null
          http_status: number | null
          id: string
          live_content_sha256: string | null
          source_document_id: string | null
          stored_content_sha256: string | null
        }
        Insert: {
          canonical_url: string
          checked_at?: string
          currentness: string
          detail?: Json
          fetched_url?: string | null
          http_status?: number | null
          id?: string
          live_content_sha256?: string | null
          source_document_id?: string | null
          stored_content_sha256?: string | null
        }
        Update: {
          canonical_url?: string
          checked_at?: string
          currentness?: string
          detail?: Json
          fetched_url?: string | null
          http_status?: number | null
          id?: string
          live_content_sha256?: string | null
          source_document_id?: string | null
          stored_content_sha256?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_currentness_checks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      source_documents: {
        Row: {
          calendar_group_key: string | null
          canonical_url: string
          content_length: number | null
          content_sha256: string
          etag: string | null
          fetched_at: string
          fetched_url: string | null
          http_status: number | null
          id: string
          source_type: Database["public"]["Enums"]["source_type"]
          storage_path: string | null
        }
        Insert: {
          calendar_group_key?: string | null
          canonical_url: string
          content_length?: number | null
          content_sha256: string
          etag?: string | null
          fetched_at?: string
          fetched_url?: string | null
          http_status?: number | null
          id?: string
          source_type: Database["public"]["Enums"]["source_type"]
          storage_path?: string | null
        }
        Update: {
          calendar_group_key?: string | null
          canonical_url?: string
          content_length?: number | null
          content_sha256?: string
          etag?: string | null
          fetched_at?: string
          fetched_url?: string | null
          http_status?: number | null
          id?: string
          source_type?: Database["public"]["Enums"]["source_type"]
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_documents_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "source_documents_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
        ]
      }
      source_relationships: {
        Row: {
          child_source_document_id: string
          discovered_at: string
          id: string
          parent_source_document_id: string | null
          relationship_evidence: Json
          relationship_type: string
        }
        Insert: {
          child_source_document_id: string
          discovered_at?: string
          id?: string
          parent_source_document_id?: string | null
          relationship_evidence?: Json
          relationship_type: string
        }
        Update: {
          child_source_document_id?: string
          discovered_at?: string
          id?: string
          parent_source_document_id?: string | null
          relationship_evidence?: Json
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_relationships_child_source_document_id_fkey"
            columns: ["child_source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_relationships_parent_source_document_id_fkey"
            columns: ["parent_source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      wdw_transport_edges: {
        Row: {
          bidirectional_service: boolean
          directness: string | null
          duration_min: Json
          edge_id: string
          edge_kind: string | null
          evidence_level: string | null
          from_place_id: string
          from_stop_id: string | null
          graph_id: string
          headway_min: Json | null
          mode: string
          notes: string[]
          operating_rule_id: string | null
          route_color_or_flag: string | null
          route_pattern_id: string
          route_public_identifier: string | null
          source_ids: string[]
          to_place_id: string
          to_stop_id: string | null
          transfer_count: number
        }
        Insert: {
          bidirectional_service?: boolean
          directness?: string | null
          duration_min?: Json
          edge_id: string
          edge_kind?: string | null
          evidence_level?: string | null
          from_place_id: string
          from_stop_id?: string | null
          graph_id: string
          headway_min?: Json | null
          mode: string
          notes?: string[]
          operating_rule_id?: string | null
          route_color_or_flag?: string | null
          route_pattern_id: string
          route_public_identifier?: string | null
          source_ids?: string[]
          to_place_id: string
          to_stop_id?: string | null
          transfer_count?: number
        }
        Update: {
          bidirectional_service?: boolean
          directness?: string | null
          duration_min?: Json
          edge_id?: string
          edge_kind?: string | null
          evidence_level?: string | null
          from_place_id?: string
          from_stop_id?: string | null
          graph_id?: string
          headway_min?: Json | null
          mode?: string
          notes?: string[]
          operating_rule_id?: string | null
          route_color_or_flag?: string | null
          route_pattern_id?: string
          route_public_identifier?: string | null
          source_ids?: string[]
          to_place_id?: string
          to_stop_id?: string | null
          transfer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "wdw_transport_edges_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wdw_transport_edges_graph_id_from_place_id_fkey"
            columns: ["graph_id", "from_place_id"]
            isOneToOne: false
            referencedRelation: "v_public_wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_edges_graph_id_from_place_id_fkey"
            columns: ["graph_id", "from_place_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_edges_graph_id_from_stop_id_fkey"
            columns: ["graph_id", "from_stop_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_stops"
            referencedColumns: ["graph_id", "stop_id"]
          },
          {
            foreignKeyName: "wdw_transport_edges_graph_id_operating_rule_id_fkey"
            columns: ["graph_id", "operating_rule_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_operating_rules"
            referencedColumns: ["graph_id", "rule_id"]
          },
          {
            foreignKeyName: "wdw_transport_edges_graph_id_route_pattern_id_fkey"
            columns: ["graph_id", "route_pattern_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_route_patterns"
            referencedColumns: ["graph_id", "route_pattern_id"]
          },
          {
            foreignKeyName: "wdw_transport_edges_graph_id_to_place_id_fkey"
            columns: ["graph_id", "to_place_id"]
            isOneToOne: false
            referencedRelation: "v_public_wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_edges_graph_id_to_place_id_fkey"
            columns: ["graph_id", "to_place_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_edges_graph_id_to_stop_id_fkey"
            columns: ["graph_id", "to_stop_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_stops"
            referencedColumns: ["graph_id", "stop_id"]
          },
        ]
      }
      wdw_transport_graphs: {
        Row: {
          checksum_sha256: string
          dataset_id: string
          generated_date: string | null
          id: string
          imported_at: string
          is_active: boolean
          metadata: Json
          name: string
          source_sha256: string | null
          version: string
          warnings: Json
        }
        Insert: {
          checksum_sha256: string
          dataset_id: string
          generated_date?: string | null
          id: string
          imported_at?: string
          is_active?: boolean
          metadata?: Json
          name: string
          source_sha256?: string | null
          version: string
          warnings?: Json
        }
        Update: {
          checksum_sha256?: string
          dataset_id?: string
          generated_date?: string | null
          id?: string
          imported_at?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          source_sha256?: string | null
          version?: string
          warnings?: Json
        }
        Relationships: []
      }
      wdw_transport_od_services: {
        Row: {
          destination_place_id: string
          duration_source_level: string | null
          estimated_duration_min: Json | null
          evidence_level: string | null
          graph_id: string
          mode: string
          notes: string[]
          od_service_id: string
          operating_rule_id: string | null
          origin_place_id: string
          route_color_or_flag: string | null
          route_pattern_id: string
          route_public_identifier: string | null
          service_type: string | null
          source_ids: string[]
          transfer_count: number
          via_place_ids: string[]
        }
        Insert: {
          destination_place_id: string
          duration_source_level?: string | null
          estimated_duration_min?: Json | null
          evidence_level?: string | null
          graph_id: string
          mode: string
          notes?: string[]
          od_service_id: string
          operating_rule_id?: string | null
          origin_place_id: string
          route_color_or_flag?: string | null
          route_pattern_id: string
          route_public_identifier?: string | null
          service_type?: string | null
          source_ids?: string[]
          transfer_count?: number
          via_place_ids?: string[]
        }
        Update: {
          destination_place_id?: string
          duration_source_level?: string | null
          estimated_duration_min?: Json | null
          evidence_level?: string | null
          graph_id?: string
          mode?: string
          notes?: string[]
          od_service_id?: string
          operating_rule_id?: string | null
          origin_place_id?: string
          route_color_or_flag?: string | null
          route_pattern_id?: string
          route_public_identifier?: string | null
          service_type?: string | null
          source_ids?: string[]
          transfer_count?: number
          via_place_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_destination_place_id_fkey"
            columns: ["graph_id", "destination_place_id"]
            isOneToOne: false
            referencedRelation: "v_public_wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_destination_place_id_fkey"
            columns: ["graph_id", "destination_place_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_operating_rule_id_fkey"
            columns: ["graph_id", "operating_rule_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_operating_rules"
            referencedColumns: ["graph_id", "rule_id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_origin_place_id_fkey"
            columns: ["graph_id", "origin_place_id"]
            isOneToOne: false
            referencedRelation: "v_public_wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_origin_place_id_fkey"
            columns: ["graph_id", "origin_place_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_route_pattern_id_fkey"
            columns: ["graph_id", "route_pattern_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_route_patterns"
            referencedColumns: ["graph_id", "route_pattern_id"]
          },
        ]
      }
      wdw_transport_operating_rules: {
        Row: {
          graph_id: string
          mode: string | null
          rule_id: string
          rule_json: Json
          source_ids: string[]
          summary: string | null
        }
        Insert: {
          graph_id: string
          mode?: string | null
          rule_id: string
          rule_json?: Json
          source_ids?: string[]
          summary?: string | null
        }
        Update: {
          graph_id?: string
          mode?: string | null
          rule_id?: string
          rule_json?: Json
          source_ids?: string[]
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wdw_transport_operating_rules_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_graphs"
            referencedColumns: ["id"]
          },
        ]
      }
      wdw_transport_places: {
        Row: {
          aliases: string[]
          area: string
          category: string | null
          graph_id: string
          name: string
          notes: string[]
          official_transport_modes_badged_by_disney: string[]
          official_url: string | null
          place_id: string
          place_type: string
          resort_slug: string | null
          selectable: boolean
          source_ids: string[]
          stop_ids: string[]
          transport_complex_id: string | null
        }
        Insert: {
          aliases?: string[]
          area: string
          category?: string | null
          graph_id: string
          name: string
          notes?: string[]
          official_transport_modes_badged_by_disney?: string[]
          official_url?: string | null
          place_id: string
          place_type: string
          resort_slug?: string | null
          selectable?: boolean
          source_ids?: string[]
          stop_ids?: string[]
          transport_complex_id?: string | null
        }
        Update: {
          aliases?: string[]
          area?: string
          category?: string | null
          graph_id?: string
          name?: string
          notes?: string[]
          official_transport_modes_badged_by_disney?: string[]
          official_url?: string | null
          place_id?: string
          place_type?: string
          resort_slug?: string | null
          selectable?: boolean
          source_ids?: string[]
          stop_ids?: string[]
          transport_complex_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wdw_transport_places_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wdw_transport_places_resort_slug_fkey"
            columns: ["resort_slug"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "wdw_transport_places_resort_slug_fkey"
            columns: ["resort_slug"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_slug"]
          },
        ]
      }
      wdw_transport_route_patterns: {
        Row: {
          bidirectional: boolean
          color_meaning: string | null
          directional_loop: boolean
          estimated_total_duration_min: Json | null
          evidence_level: string | null
          graph_id: string
          gtfs_route_type: number | null
          headway_min: Json | null
          mode: string
          name: string
          notes: string[]
          operating_rule_id: string | null
          public_color_or_flag: string | null
          public_identifier: string | null
          route_pattern_id: string
          source_ids: string[]
          stop_sequence_place_ids: string[]
          submode: string | null
          transfer_notes: string[]
        }
        Insert: {
          bidirectional?: boolean
          color_meaning?: string | null
          directional_loop?: boolean
          estimated_total_duration_min?: Json | null
          evidence_level?: string | null
          graph_id: string
          gtfs_route_type?: number | null
          headway_min?: Json | null
          mode: string
          name: string
          notes?: string[]
          operating_rule_id?: string | null
          public_color_or_flag?: string | null
          public_identifier?: string | null
          route_pattern_id: string
          source_ids?: string[]
          stop_sequence_place_ids?: string[]
          submode?: string | null
          transfer_notes?: string[]
        }
        Update: {
          bidirectional?: boolean
          color_meaning?: string | null
          directional_loop?: boolean
          estimated_total_duration_min?: Json | null
          evidence_level?: string | null
          graph_id?: string
          gtfs_route_type?: number | null
          headway_min?: Json | null
          mode?: string
          name?: string
          notes?: string[]
          operating_rule_id?: string | null
          public_color_or_flag?: string | null
          public_identifier?: string | null
          route_pattern_id?: string
          source_ids?: string[]
          stop_sequence_place_ids?: string[]
          submode?: string | null
          transfer_notes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "wdw_transport_route_patterns_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wdw_transport_route_patterns_graph_id_operating_rule_id_fkey"
            columns: ["graph_id", "operating_rule_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_operating_rules"
            referencedColumns: ["graph_id", "rule_id"]
          },
        ]
      }
      wdw_transport_sources: {
        Row: {
          graph_id: string
          notes: string | null
          publisher: string
          source_id: string
          source_level: string
          title: string
          url: string
        }
        Insert: {
          graph_id: string
          notes?: string | null
          publisher: string
          source_id: string
          source_level: string
          title: string
          url: string
        }
        Update: {
          graph_id?: string
          notes?: string | null
          publisher?: string
          source_id?: string
          source_level?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "wdw_transport_sources_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_graphs"
            referencedColumns: ["id"]
          },
        ]
      }
      wdw_transport_stops: {
        Row: {
          graph_id: string
          location_description: string | null
          mode: string
          name: string
          notes: string[]
          parent_station_id: string | null
          place_ids: string[]
          source_ids: string[]
          stop_id: string
          stop_type: string | null
          transport_complex_id: string | null
        }
        Insert: {
          graph_id: string
          location_description?: string | null
          mode: string
          name: string
          notes?: string[]
          parent_station_id?: string | null
          place_ids?: string[]
          source_ids?: string[]
          stop_id: string
          stop_type?: string | null
          transport_complex_id?: string | null
        }
        Update: {
          graph_id?: string
          location_description?: string | null
          mode?: string
          name?: string
          notes?: string[]
          parent_station_id?: string | null
          place_ids?: string[]
          source_ids?: string[]
          stop_id?: string
          stop_type?: string | null
          transport_complex_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wdw_transport_stops_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_graphs"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_alert_cache_state: {
        Row: {
          active_alert_count: number
          cache_key: string
          created_at: string
          fetched_at: string
          location_key: string
          stale_after: string
          status: string
          updated_at: string
        }
        Insert: {
          active_alert_count?: number
          cache_key: string
          created_at?: string
          fetched_at: string
          location_key: string
          stale_after: string
          status?: string
          updated_at?: string
        }
        Update: {
          active_alert_count?: number
          cache_key?: string
          created_at?: string
          fetched_at?: string
          location_key?: string
          stale_after?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      weather_alerts: {
        Row: {
          area_desc: string | null
          certainty: string
          created_at: string
          description: string | null
          effective: string
          event: string
          expires: string
          headline: string
          instruction: string | null
          location_key: string
          payload: Json
          provider_alert_id: string
          severity: string
          source_url: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          area_desc?: string | null
          certainty: string
          created_at?: string
          description?: string | null
          effective: string
          event: string
          expires: string
          headline: string
          instruction?: string | null
          location_key: string
          payload: Json
          provider_alert_id: string
          severity: string
          source_url?: string | null
          updated_at?: string
          urgency: string
        }
        Update: {
          area_desc?: string | null
          certainty?: string
          created_at?: string
          description?: string | null
          effective?: string
          event?: string
          expires?: string
          headline?: string
          instruction?: string | null
          location_key?: string
          payload?: Json
          provider_alert_id?: string
          severity?: string
          source_url?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      weather_locations: {
        Row: {
          created_at: string
          display_name: string
          latitude: number
          location_key: string
          longitude: number
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          latitude: number
          location_key: string
          longitude: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          latitude?: number
          location_key?: string
          longitude?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      weather_material_changes: {
        Row: {
          acknowledged_at: string | null
          change_kind: string
          created_at: string
          detected_at: string
          entity_id: string
          entity_type: string
          id: string
          location_key: string
          next_guidance: Json
          previous_guidance: Json | null
          severity: string
        }
        Insert: {
          acknowledged_at?: string | null
          change_kind: string
          created_at?: string
          detected_at?: string
          entity_id: string
          entity_type: string
          id?: string
          location_key: string
          next_guidance: Json
          previous_guidance?: Json | null
          severity: string
        }
        Update: {
          acknowledged_at?: string | null
          change_kind?: string
          created_at?: string
          detected_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          location_key?: string
          next_guidance?: Json
          previous_guidance?: Json | null
          severity?: string
        }
        Relationships: []
      }
      weather_snapshots: {
        Row: {
          attribution: Json | null
          cache_key: string
          confidence: string
          created_at: string
          expires_at: string
          fetched_at: string
          is_stale: boolean
          location_key: string
          payload: Json
          provider: string
          stale_after: string
          updated_at: string
        }
        Insert: {
          attribution?: Json | null
          cache_key: string
          confidence: string
          created_at?: string
          expires_at: string
          fetched_at: string
          is_stale?: boolean
          location_key: string
          payload: Json
          provider: string
          stale_after: string
          updated_at?: string
        }
        Update: {
          attribution?: Json | null
          cache_key?: string
          confidence?: string
          created_at?: string
          expires_at?: string
          fetched_at?: string
          is_stale?: boolean
          location_key?: string
          payload?: Json
          provider?: string
          stale_after?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_public_activity_gold: {
        Row: {
          activity_catalog_id: string | null
          calendar_group_key: string | null
          canonical_slug: string | null
          category: Database["public"]["Enums"]["activity_category"] | null
          claims: Json | null
          description: string | null
          enrichment: Json | null
          external_facts: Json | null
          field_provenance: Json | null
          id: string | null
          location: Json | null
          price: Json | null
          resort_slugs: string[] | null
          schedule: Json | null
          source: Json | null
          source_document_id: string | null
          source_pdf_edition: string | null
          source_sha256: string | null
          source_url: string | null
          title: string | null
          trust_state: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          activity_catalog_id?: string | null
          calendar_group_key?: string | null
          canonical_slug?: string | null
          category?: Database["public"]["Enums"]["activity_category"] | null
          claims?: Json | null
          description?: string | null
          enrichment?: Json | null
          external_facts?: Json | null
          field_provenance?: Json | null
          id?: string | null
          location?: Json | null
          price?: Json | null
          resort_slugs?: string[] | null
          schedule?: Json | null
          source?: Json | null
          source_document_id?: string | null
          source_pdf_edition?: string | null
          source_sha256?: string | null
          source_url?: string | null
          title?: string | null
          trust_state?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          activity_catalog_id?: string | null
          calendar_group_key?: string | null
          canonical_slug?: string | null
          category?: Database["public"]["Enums"]["activity_category"] | null
          claims?: Json | null
          description?: string | null
          enrichment?: Json | null
          external_facts?: Json | null
          field_provenance?: Json | null
          id?: string | null
          location?: Json | null
          price?: Json | null
          resort_slugs?: string[] | null
          schedule?: Json | null
          source?: Json | null
          source_document_id?: string | null
          source_pdf_edition?: string | null
          source_sha256?: string | null
          source_url?: string | null
          title?: string | null
          trust_state?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_activity_gold_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "activity_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_activity_gold_activity_catalog_id_fkey"
            columns: ["activity_catalog_id"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["activity_catalog_id"]
          },
          {
            foreignKeyName: "public_activity_gold_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "public_activity_gold_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "public_activity_gold_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      v_public_activity_offerings: {
        Row: {
          amenities: string[] | null
          availability: Json | null
          booking: Json | null
          category: Database["public"]["Enums"]["activity_category"] | null
          claims: Json | null
          description: string | null
          eligibility: Json | null
          field_provenance: Json | null
          id: string | null
          location: Json | null
          offering_key: string | null
          price: Json | null
          program_id: string | null
          program_key: string | null
          resort_area: Database["public"]["Enums"]["resort_area"] | null
          resort_category: Database["public"]["Enums"]["resort_category"] | null
          resort_name: string | null
          resort_slug: string | null
          source_document_id: string | null
          source_sha256: string | null
          source_url: string | null
          tags: string[] | null
          title: string | null
          trust_state: string | null
          variant_key: string | null
        }
        Relationships: [
          {
            foreignKeyName: "official_activity_offerings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "official_activity_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_activity_offerings_resort_slug_fkey"
            columns: ["resort_slug"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "official_activity_offerings_resort_slug_fkey"
            columns: ["resort_slug"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_slug"]
          },
          {
            foreignKeyName: "official_activity_offerings_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      v_public_wdw_resort_transport_modes: {
        Row: {
          evidence_kind: string | null
          graph_id: string | null
          notes: string[] | null
          place_id: string | null
          place_name: string | null
          resort_slug: string | null
          source_ids: string[] | null
          transport_filter_mode: string | null
        }
        Relationships: []
      }
      v_public_wdw_transport_connection_options: {
        Row: {
          destination_name: string | null
          destination_place_id: string | null
          destination_resort_slug: string | null
          directness: string | null
          evidence_level: string | null
          graph_id: string | null
          graph_version: string | null
          mode: string | null
          notes: string[] | null
          option_id: string | null
          option_kind: string | null
          origin_name: string | null
          origin_place_id: string | null
          origin_resort_slug: string | null
          route_color_or_flag: string | null
          route_pattern_id: string | null
          route_public_identifier: string | null
          service_type: string | null
          source_ids: string[] | null
          transfer_count: number | null
          transport_filter_mode: string | null
          via_place_ids: string[] | null
          via_place_names: string[] | null
        }
        Relationships: []
      }
      v_public_wdw_transport_od_services: {
        Row: {
          destination_name: string | null
          destination_place_id: string | null
          destination_resort_slug: string | null
          duration_source_level: string | null
          estimated_duration_min: Json | null
          evidence_level: string | null
          graph_id: string | null
          graph_version: string | null
          mode: string | null
          notes: string[] | null
          od_service_id: string | null
          operating_rule_id: string | null
          origin_name: string | null
          origin_place_id: string | null
          origin_resort_slug: string | null
          route_color_or_flag: string | null
          route_pattern_id: string | null
          route_public_identifier: string | null
          service_type: string | null
          source_ids: string[] | null
          transfer_count: number | null
          transport_filter_mode: string | null
          via_place_ids: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_destination_place_id_fkey"
            columns: ["graph_id", "destination_place_id"]
            isOneToOne: false
            referencedRelation: "v_public_wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_destination_place_id_fkey"
            columns: ["graph_id", "destination_place_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_operating_rule_id_fkey"
            columns: ["graph_id", "operating_rule_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_operating_rules"
            referencedColumns: ["graph_id", "rule_id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_origin_place_id_fkey"
            columns: ["graph_id", "origin_place_id"]
            isOneToOne: false
            referencedRelation: "v_public_wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_origin_place_id_fkey"
            columns: ["graph_id", "origin_place_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_places"
            referencedColumns: ["graph_id", "place_id"]
          },
          {
            foreignKeyName: "wdw_transport_od_services_graph_id_route_pattern_id_fkey"
            columns: ["graph_id", "route_pattern_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_route_patterns"
            referencedColumns: ["graph_id", "route_pattern_id"]
          },
          {
            foreignKeyName: "wdw_transport_places_resort_slug_fkey"
            columns: ["destination_resort_slug"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "wdw_transport_places_resort_slug_fkey"
            columns: ["origin_resort_slug"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "wdw_transport_places_resort_slug_fkey"
            columns: ["destination_resort_slug"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_slug"]
          },
          {
            foreignKeyName: "wdw_transport_places_resort_slug_fkey"
            columns: ["origin_resort_slug"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_slug"]
          },
        ]
      }
      v_public_wdw_transport_places: {
        Row: {
          aliases: string[] | null
          area: string | null
          category: string | null
          graph_id: string | null
          graph_version: string | null
          name: string | null
          notes: string[] | null
          official_transport_modes_badged_by_disney: string[] | null
          official_url: string | null
          place_id: string | null
          place_type: string | null
          resort_slug: string | null
          selectable: boolean | null
          source_ids: string[] | null
          stop_ids: string[] | null
          transport_complex_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wdw_transport_places_graph_id_fkey"
            columns: ["graph_id"]
            isOneToOne: false
            referencedRelation: "wdw_transport_graphs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wdw_transport_places_resort_slug_fkey"
            columns: ["resort_slug"]
            isOneToOne: false
            referencedRelation: "resorts"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "wdw_transport_places_resort_slug_fkey"
            columns: ["resort_slug"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["resort_slug"]
          },
        ]
      }
      v_resort_activities_current: {
        Row: {
          calendar_group_key: string | null
          category: Database["public"]["Enums"]["activity_category"] | null
          description: string | null
          id: string | null
          is_daily: boolean | null
          is_fee_based: boolean | null
          location: string | null
          name: string | null
          normalized_name: string | null
          schedule_text: string | null
          section: string | null
          source_pdf_url: string | null
        }
        Insert: {
          calendar_group_key?: string | null
          category?: Database["public"]["Enums"]["activity_category"] | null
          description?: string | null
          id?: string | null
          is_daily?: boolean | null
          is_fee_based?: boolean | null
          location?: string | null
          name?: string | null
          normalized_name?: string | null
          schedule_text?: string | null
          section?: string | null
          source_pdf_url?: string | null
        }
        Update: {
          calendar_group_key?: string | null
          category?: Database["public"]["Enums"]["activity_category"] | null
          description?: string | null
          id?: string | null
          is_daily?: boolean | null
          is_fee_based?: boolean | null
          location?: string | null
          name?: string | null
          normalized_name?: string | null
          schedule_text?: string | null
          section?: string | null
          source_pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resort_activities_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "activity_calendar_groups"
            referencedColumns: ["calendar_group_key"]
          },
          {
            foreignKeyName: "resort_activities_calendar_group_key_fkey"
            columns: ["calendar_group_key"]
            isOneToOne: false
            referencedRelation: "v_resort_activities_today"
            referencedColumns: ["calendar_group_key"]
          },
        ]
      }
      v_resort_activities_today: {
        Row: {
          activity_catalog_id: string | null
          activity_edition_id: string | null
          activity_name: string | null
          calendar_group_key: string | null
          category: Database["public"]["Enums"]["activity_category"] | null
          description: string | null
          edition_code: string | null
          edition_id: string | null
          edition_valid_from: string | null
          edition_valid_until: string | null
          fee_amount_cents: number | null
          is_daily: boolean | null
          is_fee_based: boolean | null
          location: string | null
          needs_review: boolean | null
          normalized_name: string | null
          parse_confidence: number | null
          resort_id: string | null
          resort_name: string | null
          resort_slug: string | null
          schedule_text: string | null
          section: string | null
          source_sha256: string | null
          source_url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_itinerary_item_operation: {
        Args: {
          p_category: string
          p_ends_at: string
          p_location: string
          p_max_active_items: number
          p_max_lifetime_items: number
          p_operation_id: string
          p_owner_user_id: string
          p_price_label: string
          p_resort_id: string
          p_resort_name: string
          p_saved_source_version: string
          p_snapshot_json: Json
          p_source_activity_id: string
          p_source_occurrence_id: string
          p_source_type: Database["public"]["Enums"]["itinerary_item_source_type"]
          p_source_url: string
          p_source_verified_at: string
          p_starts_at: string
          p_title: string
          p_user_note: string
        }
        Returns: {
          category: string
          created_at: string
          ends_at: string
          id: string
          item_created: boolean
          itinerary_id: string
          location: string
          plan_id: string
          plan_timezone: string
          plan_title: string
          plan_updated_at: string
          plan_version: number
          price_label: string
          resort_id: string
          resort_name: string
          saved_source_version: string
          snapshot_json: Json
          sort_order: number
          source_activity_id: string
          source_occurrence_id: string
          source_type: string
          source_url: string
          source_verified_at: string
          starts_at: string
          title: string
          user_note: string
        }[]
      }
      check_activity_data_health: {
        Args: never
        Returns: {
          check_name: string
          detail: string
        }[]
      }
      check_activity_pipeline_v2_health: {
        Args: never
        Returns: {
          check_name: string
          detail: string
        }[]
      }
      check_official_activity_offerings_health: {
        Args: never
        Returns: {
          check_name: string
          detail: string
        }[]
      }
      cleanup_abandoned_guest_plans: {
        Args: never
        Returns: {
          deleted_items: number
          deleted_itineraries: number
          pruned_rate_buckets: number
        }[]
      }
      consume_rate_limit: {
        Args: {
          p_bucket_key: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      create_live_share_operation: {
        Args: {
          p_max_rotations_per_day: number
          p_owner_user_id: string
          p_rotate: boolean
          p_token_hash: string
        }
        Returns: {
          reused: boolean
          share_id: string
        }[]
      }
      delete_itinerary_operation: {
        Args: { p_operation_id: string; p_owner_user_id: string }
        Returns: undefined
      }
      get_or_create_active_itinerary: {
        Args: { p_owner_user_id: string }
        Returns: {
          id: string
          owner_user_id: string
          timezone: string
          title: string
          updated_at: string
          version: number
        }[]
      }
      prune_api_rate_limit_buckets: {
        Args: { p_older_than?: string }
        Returns: number
      }
      remove_itinerary_item_operation: {
        Args: {
          p_item_id: string
          p_operation_id: string
          p_owner_user_id: string
        }
        Returns: {
          id: string
          owner_user_id: string
          timezone: string
          title: string
          updated_at: string
          version: number
        }[]
      }
      rename_itinerary_operation: {
        Args: {
          p_operation_id: string
          p_owner_user_id: string
          p_title: string
        }
        Returns: {
          id: string
          owner_user_id: string
          timezone: string
          title: string
          updated_at: string
          version: number
        }[]
      }
      revoke_live_share_operation: {
        Args: { p_owner_user_id: string }
        Returns: undefined
      }
      search_activities: {
        Args: { filters?: Json; query_text: string }
        Returns: {
          activity_catalog_id: string
          activity_name: string
          category: Database["public"]["Enums"]["activity_category"]
          normalized_name: string
          rank: number
          resort_name: string
          resort_slug: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_itinerary_item_note_operation: {
        Args: {
          p_item_id: string
          p_operation_id: string
          p_owner_user_id: string
          p_user_note: string
        }
        Returns: {
          id: string
          owner_user_id: string
          timezone: string
          title: string
          updated_at: string
          version: number
        }[]
      }
      update_itinerary_settings_operation: {
        Args: {
          p_home_resort_slug: string
          p_operation_id: string
          p_owner_user_id: string
          p_trip_end_date: string
          p_trip_start_date: string
        }
        Returns: {
          home_resort_slug: string
          id: string
          owner_user_id: string
          timezone: string
          title: string
          trip_end_date: string
          trip_start_date: string
          updated_at: string
          version: number
        }[]
      }
    }
    Enums: {
      activity_category:
        | "poolside"
        | "campfire"
        | "movies_under_stars"
        | "fitness_wellness"
        | "arts_crafts"
        | "signature"
        | "resort_activity"
        | "arcade"
        | "character_experience"
        | "nighttime_entertainment"
        | "rental"
        | "other"
      activity_status: "active" | "seasonal" | "paused" | "needs_review"
      correction_status: "pending" | "reviewed" | "applied" | "rejected"
      cross_resort_rule_type: "full_access" | "specific_activities"
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      ingest_status: "running" | "success" | "failed" | "partial"
      ingest_trigger: "scheduled" | "manual" | "discovery"
      itinerary_item_source_type: "scheduled_occurrence" | "offering" | "custom"
      itinerary_share_status: "active" | "revoked"
      itinerary_status: "active" | "archived" | "deleted"
      marketing_consent_status: "subscribed" | "unsubscribed"
      price_state: "free" | "fee" | "unknown"
      resort_area:
        | "magic_kingdom"
        | "epcot"
        | "animal_kingdom"
        | "disney_springs"
        | "wide_world_of_sports"
      resort_category:
        | "value"
        | "moderate"
        | "deluxe"
        | "deluxe_villa"
        | "campground"
      source_type: "pdf" | "html" | "events_tours" | "image"
      weather_dependency: "indoor" | "outdoor" | "mixed" | "weather_dependent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_category: [
        "poolside",
        "campfire",
        "movies_under_stars",
        "fitness_wellness",
        "arts_crafts",
        "signature",
        "resort_activity",
        "arcade",
        "character_experience",
        "nighttime_entertainment",
        "rental",
        "other",
      ],
      activity_status: ["active", "seasonal", "paused", "needs_review"],
      correction_status: ["pending", "reviewed", "applied", "rejected"],
      cross_resort_rule_type: ["full_access", "specific_activities"],
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      ingest_status: ["running", "success", "failed", "partial"],
      ingest_trigger: ["scheduled", "manual", "discovery"],
      itinerary_item_source_type: [
        "scheduled_occurrence",
        "offering",
        "custom",
      ],
      itinerary_share_status: ["active", "revoked"],
      itinerary_status: ["active", "archived", "deleted"],
      marketing_consent_status: ["subscribed", "unsubscribed"],
      price_state: ["free", "fee", "unknown"],
      resort_area: [
        "magic_kingdom",
        "epcot",
        "animal_kingdom",
        "disney_springs",
        "wide_world_of_sports",
      ],
      resort_category: [
        "value",
        "moderate",
        "deluxe",
        "deluxe_villa",
        "campground",
      ],
      source_type: ["pdf", "html", "events_tours", "image"],
      weather_dependency: ["indoor", "outdoor", "mixed", "weather_dependent"],
    },
  },
} as const
