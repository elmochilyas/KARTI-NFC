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
      cards: {
        Row: {
          card_number: string
          client_id: string | null
          created_at: string
          destination_profile_id: string | null
          destination_type: string | null
          destination_url: string | null
          id: string
          short_code: string
          status: string
          updated_at: string
        }
        Insert: {
          card_number?: string
          client_id?: string | null
          created_at?: string
          destination_profile_id?: string | null
          destination_type?: string | null
          destination_url?: string | null
          id?: string
          short_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          card_number?: string
          client_id?: string | null
          created_at?: string
          destination_profile_id?: string | null
          destination_type?: string | null
          destination_url?: string | null
          id?: string
          short_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_destination_profile_id_fkey"
            columns: ["destination_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          email_normalized: string | null
          id: string
          inquiry_type: string | null
          landing_path: string | null
          locale: string | null
          message: string
          name: string
          phone: string | null
          phone_normalized: string | null
          referrer: string | null
          source: string | null
          status: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          email_normalized?: string | null
          id?: string
          inquiry_type?: string | null
          landing_path?: string | null
          locale?: string | null
          message: string
          name: string
          phone?: string | null
          phone_normalized?: string | null
          referrer?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          email_normalized?: string | null
          id?: string
          inquiry_type?: string | null
          landing_path?: string | null
          locale?: string | null
          message?: string
          name?: string
          phone?: string | null
          phone_normalized?: string | null
          referrer?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor_type: string
          actor_user_id: string | null
          created_at: string
          event_type: string
          from_value: string | null
          id: string
          metadata: Json
          order_id: string
          to_value: string | null
        }
        Insert: {
          actor_type: string
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          from_value?: string | null
          id?: string
          metadata?: Json
          order_id: string
          to_value?: string | null
        }
        Update: {
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          from_value?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_cards: {
        Row: {
          card_id: string
          created_at: string
          order_item_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          order_item_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_cards_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          line_total_minor: number | null
          order_id: string
          product_type: string
          profile_id: string | null
          quantity: number
          unit_price_minor: number | null
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          id?: string
          line_total_minor?: number | null
          order_id: string
          product_type: string
          profile_id?: string | null
          quantity: number
          unit_price_minor?: number | null
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          line_total_minor?: number | null
          order_id?: string
          product_type?: string
          profile_id?: string | null
          quantity?: number
          unit_price_minor?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: string
          city: string
          client_id: string | null
          conversion_path: string | null
          created_at: string
          currency: string
          customer_name: string
          customer_notes: string | null
          delivery_address: string
          delivery_fee_minor: number | null
          delivery_notes: string | null
          discount_minor: number
          email: string | null
          email_normalized: string | null
          first_landing_path: string | null
          first_referrer: string | null
          first_touch_source: string | null
          first_utm_campaign: string | null
          first_utm_content: string | null
          first_utm_medium: string | null
          first_utm_source: string | null
          first_utm_term: string | null
          fulfillment_status: string
          id: string
          idempotency_key: string | null
          internal_notes: string | null
          last_referrer: string | null
          last_touch_source: string | null
          last_utm_campaign: string | null
          last_utm_content: string | null
          last_utm_medium: string | null
          last_utm_source: string | null
          last_utm_term: string | null
          locale: string
          order_number: string
          payment_status: string
          phone: string
          phone_normalized: string
          preferred_contact: string
          pricing_status: string
          receipt_token_hash: string | null
          status: string
          subtotal_minor: number | null
          total_minor: number | null
          updated_at: string
          whatsapp: string | null
          whatsapp_normalized: string | null
        }
        Insert: {
          channel?: string
          city: string
          client_id?: string | null
          conversion_path?: string | null
          created_at?: string
          currency?: string
          customer_name: string
          customer_notes?: string | null
          delivery_address: string
          delivery_fee_minor?: number | null
          delivery_notes?: string | null
          discount_minor?: number
          email?: string | null
          email_normalized?: string | null
          first_landing_path?: string | null
          first_referrer?: string | null
          first_touch_source?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_medium?: string | null
          first_utm_source?: string | null
          first_utm_term?: string | null
          fulfillment_status?: string
          id?: string
          idempotency_key?: string | null
          internal_notes?: string | null
          last_referrer?: string | null
          last_touch_source?: string | null
          last_utm_campaign?: string | null
          last_utm_content?: string | null
          last_utm_medium?: string | null
          last_utm_source?: string | null
          last_utm_term?: string | null
          locale: string
          order_number?: string
          payment_status?: string
          phone: string
          phone_normalized: string
          preferred_contact: string
          pricing_status: string
          receipt_token_hash?: string | null
          status?: string
          subtotal_minor?: number | null
          total_minor?: number | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_normalized?: string | null
        }
        Update: {
          channel?: string
          city?: string
          client_id?: string | null
          conversion_path?: string | null
          created_at?: string
          currency?: string
          customer_name?: string
          customer_notes?: string | null
          delivery_address?: string
          delivery_fee_minor?: number | null
          delivery_notes?: string | null
          discount_minor?: number
          email?: string | null
          email_normalized?: string | null
          first_landing_path?: string | null
          first_referrer?: string | null
          first_touch_source?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_medium?: string | null
          first_utm_source?: string | null
          first_utm_term?: string | null
          fulfillment_status?: string
          id?: string
          idempotency_key?: string | null
          internal_notes?: string | null
          last_referrer?: string | null
          last_touch_source?: string | null
          last_utm_campaign?: string | null
          last_utm_content?: string | null
          last_utm_medium?: string | null
          last_utm_source?: string | null
          last_utm_term?: string | null
          locale?: string
          order_number?: string
          payment_status?: string
          phone?: string
          phone_normalized?: string
          preferred_contact?: string
          pricing_status?: string
          receipt_token_hash?: string | null
          status?: string
          subtotal_minor?: number | null
          total_minor?: number | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_normalized?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_links: {
        Row: {
          created_at: string
          enabled: boolean
          icon: string | null
          id: string
          label: string
          profile_id: string
          sort_order: number
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          label: string
          profile_id: string
          sort_order?: number
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          label?: string
          profile_id?: string
          sort_order?: number
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_sections: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          position: number
          profile_id: string
          settings: Json
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          position: number
          profile_id: string
          settings?: Json
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          profile_id?: string
          settings?: Json
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_sections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accent_color: string | null
          address: string | null
          avatar_path: string | null
          bio: string | null
          client_id: string
          company_name: string | null
          cover_path: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          job_title: string | null
          maps_url: string | null
          phone: string | null
          profile_type: string
          public_code: string
          slug: string
          status: string
          template: string
          theme: string
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          avatar_path?: string | null
          bio?: string | null
          client_id: string
          company_name?: string | null
          cover_path?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          job_title?: string | null
          maps_url?: string | null
          phone?: string | null
          profile_type: string
          public_code?: string
          slug: string
          status?: string
          template?: string
          theme?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          avatar_path?: string | null
          bio?: string | null
          client_id?: string
          company_name?: string | null
          cover_path?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          job_title?: string | null
          maps_url?: string | null
          phone?: string | null
          profile_type?: string
          public_code?: string
          slug?: string
          status?: string
          template?: string
          theme?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_public_inquiry: {
        Args: {
          p_company: string;
          p_email: string;
          p_email_normalized: string;
          p_inquiry_type: string;
          p_landing_path: string;
          p_locale: string;
          p_message: string;
          p_name: string;
          p_phone: string;
          p_phone_normalized: string;
          p_referrer: string;
          p_source: string;
          p_utm_campaign: string;
          p_utm_content: string;
          p_utm_medium: string;
          p_utm_source: string;
          p_utm_term: string;
        };
        Returns: string;
      };
      create_public_order: {
        Args: {
          p_city: string;
          p_configuration: Json;
          p_conversion_path: string;
          p_customer_name: string;
          p_customer_notes: string;
          p_delivery_address: string;
          p_delivery_fee_minor: number;
          p_delivery_notes: string;
          p_discount_minor: number;
          p_email: string;
          p_email_normalized: string;
          p_first_landing_path: string;
          p_first_referrer: string;
          p_first_touch_source: string;
          p_first_utm_campaign: string;
          p_first_utm_content: string;
          p_first_utm_medium: string;
          p_first_utm_source: string;
          p_first_utm_term: string;
          p_idempotency_key: string;
          p_last_referrer: string;
          p_last_touch_source: string;
          p_last_utm_campaign: string;
          p_last_utm_content: string;
          p_last_utm_medium: string;
          p_last_utm_source: string;
          p_last_utm_term: string;
          p_line_total_minor: number;
          p_locale: string;
          p_phone: string;
          p_phone_normalized: string;
          p_preferred_contact: string;
          p_pricing_status: string;
          p_product_type: string;
          p_quantity: number;
          p_receipt_token_hash: string;
          p_subtotal_minor: number;
          p_total_minor: number;
          p_unit_price_minor: number;
          p_whatsapp: string;
          p_whatsapp_normalized: string;
        };
        Returns: {
          created: boolean;
          order_number: string;
        }[];
      };
      generate_profile_public_code: { Args: never; Returns: string };
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
          versioning_status: string
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          archived_at: string | null
          bucket_id: string | null
          created_at: string | null
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
