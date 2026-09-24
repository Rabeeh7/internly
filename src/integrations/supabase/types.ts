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
      applications: {
        Row: {
          ai_summary: string | null
          ai_summary_at: string | null
          attachment_url: string | null
          certificate_id: string | null
          created_at: string
          employer_approved: boolean
          id: string
          listing_id: string
          mentor_approved: boolean
          motivation: string
          selected_mentor_id: string | null
          status: Database["public"]["Enums"]["application_status"]
          student_id: string
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_at?: string | null
          attachment_url?: string | null
          certificate_id?: string | null
          created_at?: string
          employer_approved?: boolean
          id?: string
          listing_id: string
          mentor_approved?: boolean
          motivation?: string
          selected_mentor_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_id: string
        }
        Update: {
          ai_summary?: string | null
          ai_summary_at?: string | null
          attachment_url?: string | null
          certificate_id?: string | null
          created_at?: string
          employer_approved?: boolean
          id?: string
          listing_id?: string
          mentor_approved?: boolean
          motivation?: string
          selected_mentor_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_selected_mentor_id_fkey"
            columns: ["selected_mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      aptitude_results: {
        Row: {
          answers: Json
          created_at: string
          id: string
          student_id: string
          suggested_categories: string[]
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          student_id: string
          suggested_categories?: string[]
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          student_id?: string
          suggested_categories?: string[]
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      escalations: {
        Row: {
          application_id: string | null
          created_at: string
          details: string | null
          id: string
          involved: string | null
          reason: string
          resolved: boolean
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          involved?: string | null
          reason: string
          resolved?: boolean
        }
        Update: {
          application_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          involved?: string | null
          reason?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "escalations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "application_progress"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "escalations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          application_id: string
          content: string
          created_at: string
          id: string
          link_url: string | null
          mentor_note: string | null
          status: Database["public"]["Enums"]["follow_up_status"]
        }
        Insert: {
          application_id: string
          content: string
          created_at?: string
          id?: string
          link_url?: string | null
          mentor_note?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
        }
        Update: {
          application_id?: string
          content?: string
          created_at?: string
          id?: string
          link_url?: string | null
          mentor_note?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "application_progress"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "follow_ups_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          type: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          type?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          type?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          category: string
          created_at: string
          description: string
          duration: string | null
          featured: boolean
          id: string
          institution_id: string
          location: string | null
          mode: Database["public"]["Enums"]["listing_mode"]
          openings: number
          remote: boolean
          status: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          duration?: string | null
          featured?: boolean
          id?: string
          institution_id: string
          location?: string | null
          mode?: Database["public"]["Enums"]["listing_mode"]
          openings?: number
          remote?: boolean
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          duration?: string | null
          featured?: boolean
          id?: string
          institution_id?: string
          location?: string | null
          mode?: Database["public"]["Enums"]["listing_mode"]
          openings?: number
          remote?: boolean
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_pool: {
        Row: {
          category: string | null
          created_at: string
          id: string
          listing_id: string | null
          mentor_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          mentor_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          mentor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_pool_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_pool_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          course: string | null
          created_at: string
          email: string | null
          expertise_tags: string[]
          id: string
          institution_id: string | null
          institution_name: string | null
          max_load: number
          name: string
          onboarded: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          course?: string | null
          created_at?: string
          email?: string | null
          expertise_tags?: string[]
          id: string
          institution_id?: string | null
          institution_name?: string | null
          max_load?: number
          name?: string
          onboarded?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          course?: string | null
          created_at?: string
          email?: string | null
          expertise_tags?: string[]
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          max_load?: number
          name?: string
          onboarded?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      project_briefs: {
        Row: {
          application_id: string
          created_at: string
          deliverables: string | null
          id: string
          scope: string | null
          start_date: string | null
          title: string
        }
        Insert: {
          application_id: string
          created_at?: string
          deliverables?: string | null
          id?: string
          scope?: string | null
          start_date?: string | null
          title: string
        }
        Update: {
          application_id?: string
          created_at?: string
          deliverables?: string | null
          id?: string
          scope?: string | null
          start_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_briefs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "application_progress"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "project_briefs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          application_id: string
          comment: string | null
          created_at: string
          disputed: boolean
          from_role: Database["public"]["Enums"]["app_role"]
          from_user: string
          id: string
          stars: number
          to_role: Database["public"]["Enums"]["app_role"]
          to_user: string | null
        }
        Insert: {
          application_id: string
          comment?: string | null
          created_at?: string
          disputed?: boolean
          from_role: Database["public"]["Enums"]["app_role"]
          from_user: string
          id?: string
          stars: number
          to_role: Database["public"]["Enums"]["app_role"]
          to_user?: string | null
        }
        Update: {
          application_id?: string
          comment?: string | null
          created_at?: string
          disputed?: boolean
          from_role?: Database["public"]["Enums"]["app_role"]
          from_user?: string
          id?: string
          stars?: number
          to_role?: Database["public"]["Enums"]["app_role"]
          to_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "application_progress"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "ratings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_preferences: {
        Row: {
          categories: string[]
          location: string | null
          mode: Database["public"]["Enums"]["listing_mode"] | null
          remote: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          categories?: string[]
          location?: string | null
          mode?: Database["public"]["Enums"]["listing_mode"] | null
          remote?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          categories?: string[]
          location?: string | null
          mode?: Database["public"]["Enums"]["listing_mode"] | null
          remote?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: []
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
      application_progress: {
        Row: {
          application_id: string | null
          created_at: string | null
          employer_approved: boolean | null
          follow_up_count: number | null
          last_follow_up_at: string | null
          listing_id: string | null
          mentor_approved: boolean | null
          overdue: boolean | null
          selected_mentor_id: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_selected_mentor_id_fkey"
            columns: ["selected_mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      my_institution_id: { Args: never; Returns: string }
      my_role: { Args: never; Returns: Database["public"]["Enums"]["app_role"] }
      owns_application: { Args: { _application_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "mentor" | "employer" | "admin"
      application_status:
        | "pending"
        | "mentor_selected"
        | "approved"
        | "rejected"
        | "in_progress"
        | "completed"
      follow_up_status: "submitted" | "approved" | "changes_requested"
      listing_mode: "internship" | "exchange"
      listing_status: "open" | "closed" | "taken_down"
      verification_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["student", "mentor", "employer", "admin"],
      application_status: [
        "pending",
        "mentor_selected",
        "approved",
        "rejected",
        "in_progress",
        "completed",
      ],
      follow_up_status: ["submitted", "approved", "changes_requested"],
      listing_mode: ["internship", "exchange"],
      listing_status: ["open", "closed", "taken_down"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
