export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      orgs: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string | null;
          name: string;
          slug: string;
          domain: string | null;
          settings: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          name: string;
          slug: string;
          domain?: string | null;
          settings?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          name?: string;
          slug?: string;
          domain?: string | null;
          settings?: Json | null;
        };
        Relationships: [];
      };
      org_members: {
        Row: {
          id: string;
          created_at: string;
          org_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          id?: string;
          created_at?: string;
          org_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          id?: string;
          created_at?: string;
          org_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string | null;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string | null;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      units: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string | null;
          org_id: string;
          name: string;
          slug: string;
          settings: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          org_id: string;
          name: string;
          slug: string;
          settings?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          org_id?: string;
          name?: string;
          slug?: string;
          settings?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "units_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          }
        ];
      };
      unit_members: {
        Row: {
          id: string;
          created_at: string;
          unit_id: string;
          org_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          unit_id: string;
          org_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          unit_id?: string;
          org_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unit_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_members_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      calendar_events: {
        Row: {
          id: string;
          org_id: string;
          unit_id: string | null;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          all_day: boolean;
          color: string | null;
          metadata: Json | null;
          created_by: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          unit_id?: string | null;
          title: string;
          description?: string | null;
          start_time: string;
          end_time: string;
          all_day?: boolean;
          color?: string | null;
          metadata?: Json | null;
          created_by: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          unit_id?: string | null;
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string;
          all_day?: boolean;
          color?: string | null;
          metadata?: Json | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          }
        ];
      };

      // ✅ NOVAS TABELAS
      user_groups: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string | null;
          color?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_groups_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          }
        ];
      };
      user_group_members: {
        Row: {
          group_id: string;
          user_id: string;
          org_id: string;
          unit_id: string | null;
          added_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          org_id: string;
          unit_id?: string | null;
          added_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          org_id?: string;
          unit_id?: string | null;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "user_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_group_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_group_members_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_org_admin: {
        Args: {
          org_id: string;
        };
        Returns: boolean;
      };
      is_platform_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_unit_master: {
        Args: {
          unit_id: string;
        };
        Returns: boolean;
      };
      update_profile_self: {
        Args: {
          p_full_name: string;
          p_phone: string;
          p_avatar_url: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role:
        | "platform_admin"
        | "org_admin"
        | "org_master"
        | "unit_master"
        | "unit_user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never;
