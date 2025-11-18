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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_analyses: {
        Row: {
          analysis_type: string
          confidence_score: number | null
          created_at: string | null
          id: string
          input_data: Json | null
          project_id: string
          results: Json | null
          user_id: string
        }
        Insert: {
          analysis_type: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          input_data?: Json | null
          project_id: string
          results?: Json | null
          user_id: string
        }
        Update: {
          analysis_type?: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          input_data?: Json | null
          project_id?: string
          results?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      au_pricing_regions: {
        Row: {
          cost_index: number | null
          created_at: string
          description: string | null
          id: string
          region: string
          state: string
        }
        Insert: {
          cost_index?: number | null
          created_at?: string
          description?: string | null
          id?: string
          region: string
          state: string
        }
        Update: {
          cost_index?: number | null
          created_at?: string
          description?: string | null
          id?: string
          region?: string
          state?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_materials: {
        Row: {
          avg_price: number
          category: string
          created_at: string | null
          id: string
          name: string
          notes: string | null
          subcategory: string | null
          supplier: string | null
          unit: string
          user_id: string
        }
        Insert: {
          avg_price: number
          category: string
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          subcategory?: string | null
          supplier?: string | null
          unit: string
          user_id: string
        }
        Update: {
          avg_price?: number
          category?: string
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          subcategory?: string | null
          supplier?: string | null
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_sow_rates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          rate: number
          sow_name: string
          state: string | null
          trade: string
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          rate: number
          sow_name: string
          state?: string | null
          trade: string
          unit: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          rate?: number
          sow_name?: string
          state?: string | null
          trade?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_trades: {
        Row: {
          created_at: string | null
          default_rate: number | null
          id: string
          trade_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_rate?: number | null
          id?: string
          trade_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_rate?: number | null
          id?: string
          trade_name?: string
          user_id?: string
        }
        Relationships: []
      }
      estimate_items: {
        Row: {
          category: string
          created_at: string | null
          description: string
          estimate_id: string
          id: string
          item_type: string
          labour_hours: number | null
          labour_rate: number | null
          labour_wastage_pct: number | null
          markup_pct: number | null
          material_wastage_pct: number | null
          quantity: number
          section_id: string | null
          supplier: string | null
          total_price: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          estimate_id: string
          id?: string
          item_type: string
          labour_hours?: number | null
          labour_rate?: number | null
          labour_wastage_pct?: number | null
          markup_pct?: number | null
          material_wastage_pct?: number | null
          quantity?: number
          section_id?: string | null
          supplier?: string | null
          total_price?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          estimate_id?: string
          id?: string
          item_type?: string
          labour_hours?: number | null
          labour_rate?: number | null
          labour_wastage_pct?: number | null
          markup_pct?: number | null
          material_wastage_pct?: number | null
          quantity?: number
          section_id?: string | null
          supplier?: string | null
          total_price?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_sections: {
        Row: {
          area: string
          created_at: string
          estimate_id: string
          id: string
          notes: string | null
          scope_of_work: string
          sequence_order: number | null
          trade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string
          estimate_id: string
          id?: string
          notes?: string | null
          scope_of_work: string
          sequence_order?: number | null
          trade: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string
          estimate_id?: string
          id?: string
          notes?: string | null
          scope_of_work?: string
          sequence_order?: number | null
          trade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      estimates: {
        Row: {
          created_at: string | null
          gst_percentage: number | null
          id: string
          margin_percentage: number | null
          overhead_percentage: number | null
          project_id: string
          subtotal: number | null
          total_inc_gst: number | null
          total_labour: number | null
          total_materials: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gst_percentage?: number | null
          id?: string
          margin_percentage?: number | null
          overhead_percentage?: number | null
          project_id: string
          subtotal?: number | null
          total_inc_gst?: number | null
          total_labour?: number | null
          total_materials?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gst_percentage?: number | null
          id?: string
          margin_percentage?: number | null
          overhead_percentage?: number | null
          project_id?: string
          subtotal?: number | null
          total_inc_gst?: number | null
          total_labour?: number | null
          total_materials?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      overhead_items: {
        Row: {
          amount: number
          category: string
          cost_center_id: string | null
          created_at: string
          frequency: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category: string
          cost_center_id?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          cost_center_id?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_sections: {
        Row: {
          analysis_results: Json | null
          analysis_status: string | null
          created_at: string | null
          file_name: string
          file_url: string
          id: string
          project_id: string
          section_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_results?: Json | null
          analysis_status?: string | null
          created_at?: string | null
          file_name: string
          file_url: string
          id?: string
          project_id: string
          section_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_results?: Json | null
          analysis_status?: string | null
          created_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          project_id?: string
          section_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_history: {
        Row: {
          created_at: string | null
          estimate_id: string | null
          id: string
          material_description: string
          project_id: string | null
          quantity: number
          region: string | null
          sow: string
          supplier: string | null
          trade: string
          unit: string
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estimate_id?: string | null
          id?: string
          material_description: string
          project_id?: string | null
          quantity?: number
          region?: string | null
          sow: string
          supplier?: string | null
          trade: string
          unit: string
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          estimate_id?: string | null
          id?: string
          material_description?: string
          project_id?: string | null
          quantity?: number
          region?: string | null
          sow?: string
          supplier?: string | null
          trade?: string
          unit?: string
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_history_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          abn: string | null
          address: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          phone: string | null
          postcode: string | null
          region: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          abn?: string | null
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          id: string
          logo_url?: string | null
          phone?: string | null
          postcode?: string | null
          region?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          abn?: string | null
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          postcode?: string | null
          region?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_name: string | null
          created_at: string | null
          id: string
          name: string
          plan_file_name: string | null
          plan_file_url: string | null
          scope_of_work: string[] | null
          site_address: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          id?: string
          name: string
          plan_file_name?: string | null
          plan_file_url?: string | null
          scope_of_work?: string[] | null
          site_address?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          id?: string
          name?: string
          plan_file_name?: string | null
          plan_file_url?: string | null
          scope_of_work?: string[] | null
          site_address?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tender_documents: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_templates: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tenders: {
        Row: {
          created_at: string | null
          deposit_percentage: number | null
          estimate_id: string
          exclusions: string[] | null
          final_payment_percentage: number | null
          id: string
          inclusions: string[] | null
          payment_terms: string | null
          pdf_url: string | null
          progress_payment_percentage: number | null
          project_id: string
          status: string | null
          tender_number: string | null
          updated_at: string | null
          user_id: string
          validity_days: number | null
        }
        Insert: {
          created_at?: string | null
          deposit_percentage?: number | null
          estimate_id: string
          exclusions?: string[] | null
          final_payment_percentage?: number | null
          id?: string
          inclusions?: string[] | null
          payment_terms?: string | null
          pdf_url?: string | null
          progress_payment_percentage?: number | null
          project_id: string
          status?: string | null
          tender_number?: string | null
          updated_at?: string | null
          user_id: string
          validity_days?: number | null
        }
        Update: {
          created_at?: string | null
          deposit_percentage?: number | null
          estimate_id?: string
          exclusions?: string[] | null
          final_payment_percentage?: number | null
          id?: string
          inclusions?: string[] | null
          payment_terms?: string | null
          pdf_url?: string | null
          progress_payment_percentage?: number | null
          project_id?: string
          status?: string | null
          tender_number?: string | null
          updated_at?: string | null
          user_id?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
