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
      activity_booking_metadata: {
        Row: {
          activity_catalog_id: string
          age_minimum: number | null
          booking_url: string | null
          cancellation_policy: string | null
          duration_minutes: number | null
          id: string
          price_cents_max: number | null
          price_cents_min: number | null
          reservation_required: boolean | null
          source_document_id: string | null
          updated_at: string
        }
        Insert: {
          activity_catalog_id: string
          age_minimum?: number | null
          booking_url?: string | null
          cancellation_policy?: string | null
          duration_minutes?: number | null
          id?: string
          price_cents_max?: number | null
          price_cents_min?: number | null
          reservation_required?: boolean | null
          source_document_id?: string | null
          updated_at?: string
        }
        Update: {
          activity_catalog_id?: string
          age_minimum?: number | null
          booking_url?: string | null
          cancellation_policy?: string | null
          duration_minutes?: number | null
          id?: string
          price_cents_max?: number | null
          price_cents_min?: number | null
          reservation_required?: boolean | null
          source_document_id?: string | null
          updated_at?: string
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
          accessibility: Json
          activity_catalog_id: string
          age_fit: Json
          duration_minutes: number | null
          environment: string[]
          geo_lat: number | null
          geo_lng: number | null
          hero_image_url: string | null
          image_rights: Json | null
          meeting_location_detail: string | null
          price_notes: string | null
          price_state: Database["public"]["Enums"]["price_state"]
          reservation_notes: string | null
          reservation_required: boolean | null
          reservation_url: string | null
          search_vector: unknown
          sensory: Json
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
          accessibility?: Json
          activity_catalog_id: string
          age_fit?: Json
          duration_minutes?: number | null
          environment?: string[]
          geo_lat?: number | null
          geo_lng?: number | null
          hero_image_url?: string | null
          image_rights?: Json | null
          meeting_location_detail?: string | null
          price_notes?: string | null
          price_state?: Database["public"]["Enums"]["price_state"]
          reservation_notes?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          search_vector?: unknown
          sensory?: Json
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
          accessibility?: Json
          activity_catalog_id?: string
          age_fit?: Json
          duration_minutes?: number | null
          environment?: string[]
          geo_lat?: number | null
          geo_lng?: number | null
          hero_image_url?: string | null
          image_rights?: Json | null
          meeting_location_detail?: string | null
          price_notes?: string | null
          price_state?: Database["public"]["Enums"]["price_state"]
          reservation_notes?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          search_vector?: unknown
          sensory?: Json
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
          field: string
          id: string
          status: Database["public"]["Enums"]["correction_status"]
          submitted_at: string
          suggested_value: string
        }
        Insert: {
          activity_catalog_id?: string | null
          field: string
          id?: string
          status?: Database["public"]["Enums"]["correction_status"]
          submitted_at?: string
          suggested_value: string
        }
        Update: {
          activity_catalog_id?: string | null
          field?: string
          id?: string
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
    }
    Views: {
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
      check_activity_data_health: {
        Args: never
        Returns: {
          check_name: string
          detail: string
        }[]
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
