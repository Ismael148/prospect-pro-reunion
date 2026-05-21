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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          all_day: boolean
          client_id: string | null
          color: string
          created_at: string
          created_by: string
          description: string | null
          email_sent_at: string | null
          email_sent_to_client: boolean
          end_at: string
          event_type: string
          id: string
          location: string | null
          meet_link: string | null
          participants: string[]
          start_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          client_id?: string | null
          color?: string
          created_at?: string
          created_by: string
          description?: string | null
          email_sent_at?: string | null
          email_sent_to_client?: boolean
          end_at: string
          event_type?: string
          id?: string
          location?: string | null
          meet_link?: string | null
          participants?: string[]
          start_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          client_id?: string | null
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          email_sent_at?: string | null
          email_sent_to_client?: boolean
          end_at?: string
          event_type?: string
          id?: string
          location?: string | null
          meet_link?: string | null
          participants?: string[]
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_configs: {
        Row: {
          ai_model: string
          business_info: string | null
          client_id: string
          created_at: string
          created_by: string | null
          enabled: boolean
          escalation_keywords: string[] | null
          fallback_message: string
          id: string
          max_messages_per_conversation: number
          platforms: string[]
          system_prompt: string
          updated_at: string
        }
        Insert: {
          ai_model?: string
          business_info?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          escalation_keywords?: string[] | null
          fallback_message?: string
          id?: string
          max_messages_per_conversation?: number
          platforms?: string[]
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          ai_model?: string
          business_info?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          escalation_keywords?: string[] | null
          fallback_message?: string
          id?: string
          max_messages_per_conversation?: number
          platforms?: string[]
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_conversations: {
        Row: {
          ai_response: string | null
          client_id: string
          created_at: string
          error_message: string | null
          id: string
          incoming_message: string
          metadata: Json | null
          platform: string
          sender_id: string
          sender_name: string | null
          status: string
          tokens_used: number | null
        }
        Insert: {
          ai_response?: string | null
          client_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          incoming_message: string
          metadata?: Json | null
          platform: string
          sender_id: string
          sender_name?: string | null
          status?: string
          tokens_used?: number | null
        }
        Update: {
          ai_response?: string | null
          client_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          incoming_message?: string
          metadata?: Json | null
          platform?: string
          sender_id?: string
          sender_name?: string | null
          status?: string
          tokens_used?: number | null
        }
        Relationships: []
      }
      client_activities: {
        Row: {
          activity_type: string
          admin_seen: boolean
          admin_seen_at: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          new_status: Database["public"]["Enums"]["pipeline_status"] | null
          old_status: Database["public"]["Enums"]["pipeline_status"] | null
          parent_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          admin_seen?: boolean
          admin_seen_at?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["pipeline_status"] | null
          old_status?: Database["public"]["Enums"]["pipeline_status"] | null
          parent_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          admin_seen?: boolean
          admin_seen_at?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["pipeline_status"] | null
          old_status?: Database["public"]["Enums"]["pipeline_status"] | null
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_activities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "client_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      client_forms: {
        Row: {
          client_id: string
          created_at: string
          form_data: Json
          form_type: Database["public"]["Enums"]["client_form_type"]
          id: string
          status: Database["public"]["Enums"]["client_form_status"]
          submitted_at: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          form_data?: Json
          form_type: Database["public"]["Enums"]["client_form_type"]
          id?: string
          status?: Database["public"]["Enums"]["client_form_status"]
          submitted_at?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          form_data?: Json
          form_type?: Database["public"]["Enums"]["client_form_type"]
          id?: string
          status?: Database["public"]["Enums"]["client_form_status"]
          submitted_at?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_forms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_gmb: {
        Row: {
          access_level: Database["public"]["Enums"]["gmb_access_level"]
          average_rating: number | null
          business_name_on_google: string | null
          checklist_account_created: boolean
          checklist_code_received: boolean
          checklist_description_added: boolean
          checklist_hours_set: boolean
          checklist_logo_added: boolean
          checklist_photos_added: boolean
          checklist_postal_requested: boolean
          checklist_verified: boolean
          client_id: string
          code_received_at: string | null
          created_at: string
          created_by: string | null
          gmb_location_id: string | null
          gmb_url: string | null
          google_account_email: string | null
          id: string
          last_post_at: string | null
          last_review_replied_at: string | null
          notes: string | null
          postal_requested_at: string | null
          status: Database["public"]["Enums"]["gmb_status"]
          total_reviews: number | null
          unanswered_reviews: number | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["gmb_access_level"]
          average_rating?: number | null
          business_name_on_google?: string | null
          checklist_account_created?: boolean
          checklist_code_received?: boolean
          checklist_description_added?: boolean
          checklist_hours_set?: boolean
          checklist_logo_added?: boolean
          checklist_photos_added?: boolean
          checklist_postal_requested?: boolean
          checklist_verified?: boolean
          client_id: string
          code_received_at?: string | null
          created_at?: string
          created_by?: string | null
          gmb_location_id?: string | null
          gmb_url?: string | null
          google_account_email?: string | null
          id?: string
          last_post_at?: string | null
          last_review_replied_at?: string | null
          notes?: string | null
          postal_requested_at?: string | null
          status?: Database["public"]["Enums"]["gmb_status"]
          total_reviews?: number | null
          unanswered_reviews?: number | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          access_level?: Database["public"]["Enums"]["gmb_access_level"]
          average_rating?: number | null
          business_name_on_google?: string | null
          checklist_account_created?: boolean
          checklist_code_received?: boolean
          checklist_description_added?: boolean
          checklist_hours_set?: boolean
          checklist_logo_added?: boolean
          checklist_photos_added?: boolean
          checklist_postal_requested?: boolean
          checklist_verified?: boolean
          client_id?: string
          code_received_at?: string | null
          created_at?: string
          created_by?: string | null
          gmb_location_id?: string | null
          gmb_url?: string | null
          google_account_email?: string | null
          id?: string
          last_post_at?: string | null
          last_review_replied_at?: string | null
          notes?: string | null
          postal_requested_at?: string | null
          status?: Database["public"]["Enums"]["gmb_status"]
          total_reviews?: number | null
          unanswered_reviews?: number | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      client_reminders: {
        Row: {
          assigned_to: string | null
          client_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          notified: boolean
          notified_at: string | null
          remind_at: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          notified?: boolean
          notified_at?: string | null
          remind_at: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          notified?: boolean
          notified_at?: string | null
          remind_at?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          assigned_to: string | null
          city: string | null
          company_name: string
          created_at: string
          created_by: string
          email: string | null
          has_gmb: boolean | null
          id: string
          logo_created: boolean
          logo_created_at: string | null
          logo_drive_url: string | null
          logo_file_url: string | null
          logo_published_gmb: boolean
          logo_published_gmb_at: string | null
          logo_reminder_last_sent: string | null
          logo_tracking_enabled: boolean
          logo_validated_at: string | null
          logo_validated_by_client: boolean
          logo_validation_token: string | null
          manager_name: string | null
          ndi: string | null
          nfc_quantity: number
          notes: string | null
          pack_amount: number | null
          pack_type: Database["public"]["Enums"]["pack_type"] | null
          payment_method: string | null
          phone: string | null
          pipeline_status: Database["public"]["Enums"]["pipeline_status"]
          postal_code: string | null
          relance_facebook_at: string | null
          relance_facebook_by: string | null
          relance_facebook_needed: boolean
          relance_facebook_note: string | null
          relance_gmb_at: string | null
          relance_gmb_by: string | null
          relance_gmb_needed: boolean
          relance_gmb_note: string | null
          sector: string | null
          signature_date: string | null
          signed_by: string | null
          signed_by_commercial: string | null
          siret: string | null
          site_type: string | null
          support_token: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          company_name: string
          created_at?: string
          created_by: string
          email?: string | null
          has_gmb?: boolean | null
          id?: string
          logo_created?: boolean
          logo_created_at?: string | null
          logo_drive_url?: string | null
          logo_file_url?: string | null
          logo_published_gmb?: boolean
          logo_published_gmb_at?: string | null
          logo_reminder_last_sent?: string | null
          logo_tracking_enabled?: boolean
          logo_validated_at?: string | null
          logo_validated_by_client?: boolean
          logo_validation_token?: string | null
          manager_name?: string | null
          ndi?: string | null
          nfc_quantity?: number
          notes?: string | null
          pack_amount?: number | null
          pack_type?: Database["public"]["Enums"]["pack_type"] | null
          payment_method?: string | null
          phone?: string | null
          pipeline_status?: Database["public"]["Enums"]["pipeline_status"]
          postal_code?: string | null
          relance_facebook_at?: string | null
          relance_facebook_by?: string | null
          relance_facebook_needed?: boolean
          relance_facebook_note?: string | null
          relance_gmb_at?: string | null
          relance_gmb_by?: string | null
          relance_gmb_needed?: boolean
          relance_gmb_note?: string | null
          sector?: string | null
          signature_date?: string | null
          signed_by?: string | null
          signed_by_commercial?: string | null
          siret?: string | null
          site_type?: string | null
          support_token?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          created_by?: string
          email?: string | null
          has_gmb?: boolean | null
          id?: string
          logo_created?: boolean
          logo_created_at?: string | null
          logo_drive_url?: string | null
          logo_file_url?: string | null
          logo_published_gmb?: boolean
          logo_published_gmb_at?: string | null
          logo_reminder_last_sent?: string | null
          logo_tracking_enabled?: boolean
          logo_validated_at?: string | null
          logo_validated_by_client?: boolean
          logo_validation_token?: string | null
          manager_name?: string | null
          ndi?: string | null
          nfc_quantity?: number
          notes?: string | null
          pack_amount?: number | null
          pack_type?: Database["public"]["Enums"]["pack_type"] | null
          payment_method?: string | null
          phone?: string | null
          pipeline_status?: Database["public"]["Enums"]["pipeline_status"]
          postal_code?: string | null
          relance_facebook_at?: string | null
          relance_facebook_by?: string | null
          relance_facebook_needed?: boolean
          relance_facebook_note?: string | null
          relance_gmb_at?: string | null
          relance_gmb_by?: string | null
          relance_gmb_needed?: boolean
          relance_gmb_note?: string | null
          sector?: string | null
          signature_date?: string | null
          signed_by?: string | null
          signed_by_commercial?: string | null
          siret?: string | null
          site_type?: string | null
          support_token?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_signed_by_commercial_fkey"
            columns: ["signed_by_commercial"]
            isOneToOne: false
            referencedRelation: "external_commercials"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          base_amount: number
          bonus_amount: number
          client_id: string
          commercial_id: string | null
          created_at: string
          id: string
          month_year: string
          pack_type: string
          paid_at: string | null
          role: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_amount?: number
          bonus_amount?: number
          client_id: string
          commercial_id?: string | null
          created_at?: string
          id?: string
          month_year: string
          pack_type: string
          paid_at?: string | null
          role: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_amount?: number
          bonus_amount?: number
          client_id?: string
          commercial_id?: string | null
          created_at?: string
          id?: string
          month_year?: string
          pack_type?: string
          paid_at?: string | null
          role?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_commercial_id_fkey"
            columns: ["commercial_id"]
            isOneToOne: false
            referencedRelation: "external_commercials"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean | null
          last_name: string
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean | null
          last_name: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_clients_log: {
        Row: {
          activities_data: Json | null
          client_data: Json
          contacts_data: Json | null
          deleted_at: string
          deleted_by: string | null
          id: string
          original_client_id: string
          restored_at: string | null
          restored_by: string | null
        }
        Insert: {
          activities_data?: Json | null
          client_data: Json
          contacts_data?: Json | null
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          original_client_id: string
          restored_at?: string | null
          restored_by?: string | null
        }
        Update: {
          activities_data?: Json | null
          client_data?: Json
          contacts_data?: Json | null
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          original_client_id?: string
          restored_at?: string | null
          restored_by?: string | null
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          approved_at: string | null
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          name: string
          project_id: string
          status: Database["public"]["Enums"]["deliverable_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          name: string
          project_id: string
          status?: Database["public"]["Enums"]["deliverable_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: Database["public"]["Enums"]["deliverable_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_renewal_reminders: {
        Row: {
          client_id: string
          id: string
          message: string | null
          recipient_email: string | null
          reminder_type: string
          renewal_id: string
          sent_at: string
          sent_by: string | null
          status: string
          subject: string | null
        }
        Insert: {
          client_id: string
          id?: string
          message?: string | null
          recipient_email?: string | null
          reminder_type?: string
          renewal_id: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          client_id?: string
          id?: string
          message?: string | null
          recipient_email?: string | null
          reminder_type?: string
          renewal_id?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_renewal_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_renewal_reminders_renewal_id_fkey"
            columns: ["renewal_id"]
            isOneToOne: false
            referencedRelation: "domain_renewals"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_renewals: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string
          domain_name: string
          id: string
          invoice_id: string | null
          last_reminder_at: string | null
          next_renewal_date: string | null
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          registered_date: string | null
          reminder_count: number
          renewal_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          created_by: string
          domain_name: string
          id?: string
          invoice_id?: string | null
          last_reminder_at?: string | null
          next_renewal_date?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          registered_date?: string | null
          reminder_count?: number
          renewal_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string
          domain_name?: string
          id?: string
          invoice_id?: string | null
          last_reminder_at?: string | null
          next_renewal_date?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          registered_date?: string | null
          reminder_count?: number
          renewal_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_renewals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_branding: {
        Row: {
          brand_color: string
          footer_company: string
          footer_copyright: string
          footer_phone: string
          footer_tagline: string
          id: string
          logo_url: string
          slogan: string
          support_cta_button: string
          support_cta_text: string
          support_cta_title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_color?: string
          footer_company?: string
          footer_copyright?: string
          footer_phone?: string
          footer_tagline?: string
          id?: string
          logo_url?: string
          slogan?: string
          support_cta_button?: string
          support_cta_text?: string
          support_cta_title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_color?: string
          footer_company?: string
          footer_copyright?: string
          footer_phone?: string
          footer_tagline?: string
          id?: string
          logo_url?: string
          slogan?: string
          support_cta_button?: string
          support_cta_text?: string
          support_cta_title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          campaign_name: string | null
          created_at: string
          deliverable_id: string | null
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          project_id: string | null
          recipient_email: string
          recipient_name: string | null
          status: string
          subject: string
          template_name: string | null
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string
          deliverable_id?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          project_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          status?: string
          subject: string
          template_name?: string | null
        }
        Update: {
          campaign_name?: string | null
          created_at?: string
          deliverable_id?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          project_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          status?: string
          subject?: string
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string
          description: string | null
          employee_name: string | null
          employee_role: string | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["expense_frequency"]
          id: string
          is_active: boolean
          is_group: boolean
          month_year: string | null
          name: string
          parent_id: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by: string
          description?: string | null
          employee_name?: string | null
          employee_role?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["expense_frequency"]
          id?: string
          is_active?: boolean
          is_group?: boolean
          month_year?: string | null
          name: string
          parent_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          employee_name?: string | null
          employee_role?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["expense_frequency"]
          id?: string
          is_active?: boolean
          is_group?: boolean
          month_year?: string | null
          name?: string
          parent_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      external_commercials: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fb_onboarding_submissions: {
        Row: {
          business_manager_email: string
          business_manager_id: string | null
          client_id: string | null
          client_ndi: string | null
          company_name: string
          contact_email: string
          created_at: string
          fb_page_name: string | null
          fb_page_url: string | null
          has_existing_page: boolean | null
          id: string
          last_reminder_at: string | null
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          reminder_count: number
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_manager_email: string
          business_manager_id?: string | null
          client_id?: string | null
          client_ndi?: string | null
          company_name: string
          contact_email: string
          created_at?: string
          fb_page_name?: string | null
          fb_page_url?: string | null
          has_existing_page?: boolean | null
          id?: string
          last_reminder_at?: string | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reminder_count?: number
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_manager_email?: string
          business_manager_id?: string | null
          client_id?: string | null
          client_ndi?: string | null
          company_name?: string
          contact_email?: string
          created_at?: string
          fb_page_name?: string | null
          fb_page_url?: string | null
          has_existing_page?: boolean | null
          id?: string
          last_reminder_at?: string | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reminder_count?: number
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fb_onboarding_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      gmb_onboarding_submissions: {
        Row: {
          client_id: string | null
          client_ndi: string | null
          company_name: string
          contact_email: string
          created_at: string
          gmb_address: string | null
          gmb_business_name: string | null
          gmb_maps_url: string | null
          gmb_phone: string | null
          google_account_email: string | null
          has_existing_listing: boolean | null
          id: string
          last_reminder_at: string | null
          manager_added: boolean | null
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          reminder_count: number
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_ndi?: string | null
          company_name: string
          contact_email: string
          created_at?: string
          gmb_address?: string | null
          gmb_business_name?: string | null
          gmb_maps_url?: string | null
          gmb_phone?: string | null
          google_account_email?: string | null
          has_existing_listing?: boolean | null
          id?: string
          last_reminder_at?: string | null
          manager_added?: boolean | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reminder_count?: number
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_ndi?: string | null
          company_name?: string
          contact_email?: string
          created_at?: string
          gmb_address?: string | null
          gmb_business_name?: string | null
          gmb_maps_url?: string | null
          gmb_phone?: string | null
          google_account_email?: string | null
          has_existing_listing?: boolean | null
          id?: string
          last_reminder_at?: string | null
          manager_added?: boolean | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reminder_count?: number
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmb_onboarding_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          invoice_number: string
          issued_date: string
          items: Json
          notes: string | null
          paid_date: string | null
          payment_methods: string[] | null
          status: string
          tax_amount: number
          tax_rate: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string
          items?: Json
          notes?: string | null
          paid_date?: string | null
          payment_methods?: string[] | null
          status?: string
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string
          items?: Json
          notes?: string | null
          paid_date?: string | null
          payment_methods?: string[] | null
          status?: string
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      logo_reminder_log: {
        Row: {
          client_id: string
          id: string
          message: string | null
          recipients: Json
          recipients_count: number
          sent_at: string
          step: string
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          client_id: string
          id?: string
          message?: string | null
          recipients?: Json
          recipients_count?: number
          sent_at?: string
          step: string
          trigger_type?: string
          triggered_by?: string | null
        }
        Update: {
          client_id?: string
          id?: string
          message?: string | null
          recipients?: Json
          recipients_count?: number
          sent_at?: string
          step?: string
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      module_note_export_log: {
        Row: {
          created_at: string
          exported_by: string
          file_data: string
          file_name: string
          format: string
          id: string
          mime_type: string
          module_id: string
          module_name: string | null
          note_id: string | null
          project_id: string
          rows_count: number
          scope: string
        }
        Insert: {
          created_at?: string
          exported_by: string
          file_data: string
          file_name: string
          format: string
          id?: string
          mime_type: string
          module_id: string
          module_name?: string | null
          note_id?: string | null
          project_id: string
          rows_count?: number
          scope?: string
        }
        Update: {
          created_at?: string
          exported_by?: string
          file_data?: string
          file_name?: string
          format?: string
          id?: string
          mime_type?: string
          module_id?: string
          module_name?: string | null
          note_id?: string | null
          project_id?: string
          rows_count?: number
          scope?: string
        }
        Relationships: []
      }
      module_note_history: {
        Row: {
          action: string
          edited_at: string
          edited_by: string
          id: string
          module_id: string
          note_id: string
          previous_content: string
          project_id: string
        }
        Insert: {
          action?: string
          edited_at?: string
          edited_by: string
          id?: string
          module_id: string
          note_id: string
          previous_content: string
          project_id: string
        }
        Update: {
          action?: string
          edited_at?: string
          edited_by?: string
          id?: string
          module_id?: string
          note_id?: string
          previous_content?: string
          project_id?: string
        }
        Relationships: []
      }
      module_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          module_id: string
          project_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          module_id: string
          project_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          module_id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_invitations: {
        Row: {
          client_id: string | null
          client_ndi: string | null
          company_name: string
          completed_at: string | null
          contact_email: string
          created_at: string
          id: string
          kind: string
          last_reminder_at: string | null
          reminder_count: number
          sent_at: string
          sent_by: string | null
        }
        Insert: {
          client_id?: string | null
          client_ndi?: string | null
          company_name: string
          completed_at?: string | null
          contact_email: string
          created_at?: string
          id?: string
          kind: string
          last_reminder_at?: string | null
          reminder_count?: number
          sent_at?: string
          sent_by?: string | null
        }
        Update: {
          client_id?: string | null
          client_ndi?: string | null
          company_name?: string
          completed_at?: string | null
          contact_email?: string
          created_at?: string
          id?: string
          kind?: string
          last_reminder_at?: string | null
          reminder_count?: number
          sent_at?: string
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_access: {
        Row: {
          accepted_at: string | null
          access_type: Database["public"]["Enums"]["partner_access_type"]
          asset_id: string | null
          asset_name: string | null
          business_manager_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          granted_role:
            | Database["public"]["Enums"]["partner_access_role"]
            | null
          id: string
          invitation_email: string | null
          invitation_link: string | null
          invitation_sent_at: string | null
          last_reminder_sent_at: string | null
          notes: string | null
          platform: string
          status: Database["public"]["Enums"]["partner_access_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          access_type: Database["public"]["Enums"]["partner_access_type"]
          asset_id?: string | null
          asset_name?: string | null
          business_manager_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          granted_role?:
            | Database["public"]["Enums"]["partner_access_role"]
            | null
          id?: string
          invitation_email?: string | null
          invitation_link?: string | null
          invitation_sent_at?: string | null
          last_reminder_sent_at?: string | null
          notes?: string | null
          platform: string
          status?: Database["public"]["Enums"]["partner_access_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          access_type?: Database["public"]["Enums"]["partner_access_type"]
          asset_id?: string | null
          asset_name?: string | null
          business_manager_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          granted_role?:
            | Database["public"]["Enums"]["partner_access_role"]
            | null
          id?: string
          invitation_email?: string | null
          invitation_link?: string | null
          invitation_sent_at?: string | null
          last_reminder_sent_at?: string | null
          notes?: string | null
          platform?: string
          status?: Database["public"]["Enums"]["partner_access_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_notifications: {
        Row: {
          client_id: string
          content: string
          created_at: string
          created_by: string | null
          external_post_id: string | null
          id: string
          media_urls: string[] | null
          notes: string | null
          notification_type: Database["public"]["Enums"]["partner_notification_type"]
          partner_access_id: string | null
          platform: string
          published_at: string | null
          published_by: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["partner_notification_status"]
          target_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          created_by?: string | null
          external_post_id?: string | null
          id?: string
          media_urls?: string[] | null
          notes?: string | null
          notification_type: Database["public"]["Enums"]["partner_notification_type"]
          partner_access_id?: string | null
          platform: string
          published_at?: string | null
          published_by?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["partner_notification_status"]
          target_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          external_post_id?: string | null
          id?: string
          media_urls?: string[] | null
          notes?: string | null
          notification_type?: Database["public"]["Enums"]["partner_notification_type"]
          partner_access_id?: string | null
          platform?: string
          published_at?: string | null
          published_by?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["partner_notification_status"]
          target_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_notifications_partner_access_id_fkey"
            columns: ["partner_access_id"]
            isOneToOne: false
            referencedRelation: "partner_access"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_credentials: {
        Row: {
          client_id: string | null
          client_ndi: string | null
          company_name: string | null
          contact_email: string
          contact_name: string | null
          created_at: string
          credentials: Json
          environment: Database["public"]["Enums"]["payment_env"]
          id: string
          notes: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          submitted_at: string
          submitted_via: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_ndi?: string | null
          company_name?: string | null
          contact_email: string
          contact_name?: string | null
          created_at?: string
          credentials?: Json
          environment?: Database["public"]["Enums"]["payment_env"]
          id?: string
          notes?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string
          submitted_via?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_ndi?: string | null
          company_name?: string | null
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          credentials?: Json
          environment?: Database["public"]["Enums"]["payment_env"]
          id?: string
          notes?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string
          submitted_via?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_invitations: {
        Row: {
          client_id: string | null
          client_ndi: string | null
          company_name: string | null
          completed_at: string | null
          contact_email: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          last_reminder_at: string | null
          last_sent_at: string | null
          providers: Database["public"]["Enums"]["payment_provider"][] | null
          reminder_count: number
          token: string
        }
        Insert: {
          client_id?: string | null
          client_ndi?: string | null
          company_name?: string | null
          completed_at?: string | null
          contact_email: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_reminder_at?: string | null
          last_sent_at?: string | null
          providers?: Database["public"]["Enums"]["payment_provider"][] | null
          reminder_count?: number
          token?: string
        }
        Update: {
          client_id?: string | null
          client_ndi?: string | null
          company_name?: string | null
          completed_at?: string | null
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_reminder_at?: string | null
          last_sent_at?: string | null
          providers?: Database["public"]["Enums"]["payment_provider"][] | null
          reminder_count?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          link_url: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          sort_order: number | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          link_url?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          link_url?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          module_links: Json | null
          name: string
          pack_type: Database["public"]["Enums"]["pack_type"]
          progress: number | null
          site_type: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          module_links?: Json | null
          name: string
          pack_type: Database["public"]["Enums"]["pack_type"]
          progress?: number | null
          site_type?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          module_links?: Json | null
          name?: string
          pack_type?: Database["public"]["Enums"]["pack_type"]
          progress?: number | null
          site_type?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          address: string | null
          appointment_date: string | null
          appointment_time: string | null
          assigned_to: string | null
          business_name: string
          callback_date: string | null
          callback_notes: string | null
          city: string | null
          converted_client_id: string | null
          created_at: string
          created_by: string
          email: string | null
          google_maps_url: string | null
          id: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          rating: number | null
          reviews_count: number | null
          search_query: string | null
          search_zone: string | null
          sector: string | null
          source: string | null
          status: Database["public"]["Enums"]["prospect_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          assigned_to?: string | null
          business_name: string
          callback_date?: string | null
          callback_notes?: string | null
          city?: string | null
          converted_client_id?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          google_maps_url?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          reviews_count?: number | null
          search_query?: string | null
          search_zone?: string | null
          sector?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["prospect_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          assigned_to?: string | null
          business_name?: string
          callback_date?: string | null
          callback_notes?: string | null
          city?: string | null
          converted_client_id?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          google_maps_url?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          reviews_count?: number | null
          search_query?: string | null
          search_zone?: string | null
          sector?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["prospect_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_ical_submissions: {
        Row: {
          airbnb_url: string | null
          booking_url: string | null
          client_id: string
          created_at: string
          expedia_url: string | null
          gites_url: string | null
          id: string
          notes: string | null
          other_urls: Json | null
          status: string
          submitted_at: string
          updated_at: string
          vrbo_url: string | null
        }
        Insert: {
          airbnb_url?: string | null
          booking_url?: string | null
          client_id: string
          created_at?: string
          expedia_url?: string | null
          gites_url?: string | null
          id?: string
          notes?: string | null
          other_urls?: Json | null
          status?: string
          submitted_at?: string
          updated_at?: string
          vrbo_url?: string | null
        }
        Update: {
          airbnb_url?: string | null
          booking_url?: string | null
          client_id?: string
          created_at?: string
          expedia_url?: string | null
          gites_url?: string | null
          id?: string
          notes?: string | null
          other_urls?: Json | null
          status?: string
          submitted_at?: string
          updated_at?: string
          vrbo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_ical_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          employee_name: string
          expense_id: string
          id: string
          notes: string | null
          reason: string | null
          reimbursed_at: string | null
          request_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          employee_name: string
          expense_id: string
          id?: string
          notes?: string | null
          reason?: string | null
          reimbursed_at?: string | null
          request_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          employee_name?: string
          expense_id?: string
          id?: string
          notes?: string | null
          reason?: string | null
          reimbursed_at?: string | null
          request_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      seen_marks: {
        Row: {
          id: string
          item_id: string
          item_type: string
          seen_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          item_type: string
          seen_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          item_type?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          access_token: string | null
          client_id: string
          created_at: string
          id: string
          page_id: string | null
          platform: string
          profile_url: string | null
          token_expires_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          access_token?: string | null
          client_id: string
          created_at?: string
          id?: string
          page_id?: string | null
          platform: string
          profile_url?: string | null
          token_expires_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          access_token?: string | null
          client_id?: string
          created_at?: string
          id?: string
          page_id?: string | null
          platform?: string
          profile_url?: string | null
          token_expires_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      social_deliverables: {
        Row: {
          client_id: string
          created_at: string
          delivered_at: string | null
          delivered_by: string | null
          file_url: string | null
          id: string
          month_year: string
          notes: string | null
          project_id: string
          status: string
          type: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          delivered_at?: string | null
          delivered_by?: string | null
          file_url?: string | null
          id?: string
          month_year: string
          notes?: string | null
          project_id: string
          status?: string
          type: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          delivered_at?: string | null
          delivered_by?: string | null
          file_url?: string | null
          id?: string
          month_year?: string
          notes?: string | null
          project_id?: string
          status?: string
          type?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_publications: {
        Row: {
          client_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          platform: string
          scheduled_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          platform: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          platform?: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_publications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          attachments: string[] | null
          category: Database["public"]["Enums"]["support_category"]
          client_id: string
          created_at: string
          id: string
          message: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          attachments?: string[] | null
          category?: Database["public"]["Enums"]["support_category"]
          client_id: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          attachments?: string[] | null
          category?: Database["public"]["Enums"]["support_category"]
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fire_due_client_reminders: { Args: never; Returns: undefined }
      generate_monthly_social_deliverables: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "agent_telephonique"
        | "commercial_terrain"
        | "webmaster"
        | "designer"
        | "agent_master"
        | "agent_support"
      client_form_status: "en_attente" | "soumis" | "valide"
      client_form_type: "nfc" | "site"
      deliverable_status:
        | "en_attente"
        | "en_cours"
        | "soumis"
        | "approuve"
        | "rejete"
      expense_category:
        | "charges_sociales"
        | "abonnement_plateforme"
        | "salaire"
        | "loyer"
        | "marketing"
        | "materiel"
        | "autre"
      expense_frequency: "ponctuel" | "mensuel" | "trimestriel" | "annuel"
      gmb_access_level:
        | "aucun"
        | "gestionnaire"
        | "proprietaire"
        | "proprietaire_principal"
      gmb_status:
        | "a_creer"
        | "compte_cree"
        | "verification_postale_demandee"
        | "code_recu"
        | "active"
        | "suspendue"
        | "non_applicable"
      pack_type: "star_bizness_numerik" | "star_bizness_nfc" | "autre"
      partner_access_role:
        | "admin"
        | "editor"
        | "advertiser"
        | "analyst"
        | "manager"
        | "owner"
      partner_access_status:
        | "a_inviter"
        | "invitation_envoyee"
        | "accepte"
        | "refuse"
        | "expire"
        | "revoque"
      partner_access_type:
        | "fb_page"
        | "fb_business_manager"
        | "ig_account"
        | "ad_account"
        | "catalog"
        | "gmb_location"
        | "pixel"
      partner_notification_status:
        | "brouillon"
        | "planifie"
        | "publie_manuel"
        | "publie_api"
        | "echec"
      partner_notification_type:
        | "post"
        | "story"
        | "reel"
        | "gmb_post"
        | "gmb_review_reply"
        | "message_reply"
        | "announcement"
      payment_env: "test" | "live"
      payment_provider:
        | "stripe"
        | "paypal"
        | "alma"
        | "mollie"
        | "lyra"
        | "helloasso"
        | "sumup"
      payment_status: "en_attente" | "recu" | "configure" | "actif" | "rejete"
      pipeline_status:
        | "nouveau"
        | "contacte"
        | "rdv_planifie"
        | "proposition_envoyee"
        | "negociation"
        | "contrat_signe"
        | "perdu"
      project_status:
        | "en_attente"
        | "en_cours"
        | "en_revision"
        | "termine"
        | "annule"
      prospect_status:
        | "nouveau"
        | "a_contacter"
        | "contacte"
        | "qualifie"
        | "non_interesse"
        | "converti"
        | "rdv_planifie"
        | "a_rappeler"
      support_category:
        | "modification_site"
        | "modification_carte_nfc"
        | "fiche_google"
        | "reseaux_sociaux"
        | "bug_technique"
        | "question"
        | "autre"
      task_priority: "basse" | "moyenne" | "haute" | "urgente"
      task_status: "a_faire" | "en_cours" | "en_revision" | "termine"
      ticket_status: "ouvert" | "en_cours" | "resolu" | "ferme"
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
      app_role: [
        "admin",
        "agent_telephonique",
        "commercial_terrain",
        "webmaster",
        "designer",
        "agent_master",
        "agent_support",
      ],
      client_form_status: ["en_attente", "soumis", "valide"],
      client_form_type: ["nfc", "site"],
      deliverable_status: [
        "en_attente",
        "en_cours",
        "soumis",
        "approuve",
        "rejete",
      ],
      expense_category: [
        "charges_sociales",
        "abonnement_plateforme",
        "salaire",
        "loyer",
        "marketing",
        "materiel",
        "autre",
      ],
      expense_frequency: ["ponctuel", "mensuel", "trimestriel", "annuel"],
      gmb_access_level: [
        "aucun",
        "gestionnaire",
        "proprietaire",
        "proprietaire_principal",
      ],
      gmb_status: [
        "a_creer",
        "compte_cree",
        "verification_postale_demandee",
        "code_recu",
        "active",
        "suspendue",
        "non_applicable",
      ],
      pack_type: ["star_bizness_numerik", "star_bizness_nfc", "autre"],
      partner_access_role: [
        "admin",
        "editor",
        "advertiser",
        "analyst",
        "manager",
        "owner",
      ],
      partner_access_status: [
        "a_inviter",
        "invitation_envoyee",
        "accepte",
        "refuse",
        "expire",
        "revoque",
      ],
      partner_access_type: [
        "fb_page",
        "fb_business_manager",
        "ig_account",
        "ad_account",
        "catalog",
        "gmb_location",
        "pixel",
      ],
      partner_notification_status: [
        "brouillon",
        "planifie",
        "publie_manuel",
        "publie_api",
        "echec",
      ],
      partner_notification_type: [
        "post",
        "story",
        "reel",
        "gmb_post",
        "gmb_review_reply",
        "message_reply",
        "announcement",
      ],
      payment_env: ["test", "live"],
      payment_provider: [
        "stripe",
        "paypal",
        "alma",
        "mollie",
        "lyra",
        "helloasso",
        "sumup",
      ],
      payment_status: ["en_attente", "recu", "configure", "actif", "rejete"],
      pipeline_status: [
        "nouveau",
        "contacte",
        "rdv_planifie",
        "proposition_envoyee",
        "negociation",
        "contrat_signe",
        "perdu",
      ],
      project_status: [
        "en_attente",
        "en_cours",
        "en_revision",
        "termine",
        "annule",
      ],
      prospect_status: [
        "nouveau",
        "a_contacter",
        "contacte",
        "qualifie",
        "non_interesse",
        "converti",
        "rdv_planifie",
        "a_rappeler",
      ],
      support_category: [
        "modification_site",
        "modification_carte_nfc",
        "fiche_google",
        "reseaux_sociaux",
        "bug_technique",
        "question",
        "autre",
      ],
      task_priority: ["basse", "moyenne", "haute", "urgente"],
      task_status: ["a_faire", "en_cours", "en_revision", "termine"],
      ticket_status: ["ouvert", "en_cours", "resolu", "ferme"],
    },
  },
} as const
