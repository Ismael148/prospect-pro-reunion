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
      client_activities: {
        Row: {
          activity_type: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          new_status: Database["public"]["Enums"]["pipeline_status"] | null
          old_status: Database["public"]["Enums"]["pipeline_status"] | null
          user_id: string
        }
        Insert: {
          activity_type: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["pipeline_status"] | null
          old_status?: Database["public"]["Enums"]["pipeline_status"] | null
          user_id: string
        }
        Update: {
          activity_type?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["pipeline_status"] | null
          old_status?: Database["public"]["Enums"]["pipeline_status"] | null
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
      clients: {
        Row: {
          address: string | null
          assigned_to: string | null
          city: string | null
          company_name: string
          created_at: string
          created_by: string
          email: string | null
          id: string
          ndi: string | null
          nfc_quantity: number
          notes: string | null
          pack_amount: number | null
          pack_type: Database["public"]["Enums"]["pack_type"] | null
          payment_method: string | null
          phone: string | null
          pipeline_status: Database["public"]["Enums"]["pipeline_status"]
          postal_code: string | null
          sector: string | null
          signature_date: string | null
          signed_by: string | null
          siret: string | null
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
          id?: string
          ndi?: string | null
          nfc_quantity?: number
          notes?: string | null
          pack_amount?: number | null
          pack_type?: Database["public"]["Enums"]["pack_type"] | null
          payment_method?: string | null
          phone?: string | null
          pipeline_status?: Database["public"]["Enums"]["pipeline_status"]
          postal_code?: string | null
          sector?: string | null
          signature_date?: string | null
          signed_by?: string | null
          siret?: string | null
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
          id?: string
          ndi?: string | null
          nfc_quantity?: number
          notes?: string | null
          pack_amount?: number | null
          pack_type?: Database["public"]["Enums"]["pack_type"] | null
          payment_method?: string | null
          phone?: string | null
          pipeline_status?: Database["public"]["Enums"]["pipeline_status"]
          postal_code?: string | null
          sector?: string | null
          signature_date?: string | null
          signed_by?: string | null
          siret?: string | null
          support_token?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          base_amount: number
          bonus_amount: number
          client_id: string
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
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["expense_frequency"]
          id: string
          is_active: boolean
          month_year: string | null
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["expense_frequency"]
          id?: string
          is_active?: boolean
          month_year?: string | null
          name: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["expense_frequency"]
          id?: string
          is_active?: boolean
          month_year?: string | null
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
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
          name: string
          pack_type: Database["public"]["Enums"]["pack_type"]
          progress: number | null
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
          name: string
          pack_type: Database["public"]["Enums"]["pack_type"]
          progress?: number | null
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
          name?: string
          pack_type?: Database["public"]["Enums"]["pack_type"]
          progress?: number | null
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
      pack_type: "star_bizness_numerik" | "star_bizness_nfc" | "autre"
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
      pack_type: ["star_bizness_numerik", "star_bizness_nfc", "autre"],
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
