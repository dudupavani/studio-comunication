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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      announcement_comments: {
        Row: {
          announcement_id: string
          author_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          announcement_id: string
          author_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          announcement_id?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      announcement_reactions: {
        Row: {
          announcement_id: string
          author_id: string
          created_at: string
          emoji: string
        }
        Insert: {
          announcement_id: string
          author_id: string
          created_at?: string
          emoji: string
        }
        Update: {
          announcement_id?: string
          author_id?: string
          created_at?: string
          emoji?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reactions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_reactions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reactions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      announcement_recipients: {
        Row: {
          announcement_id: string
          created_at: string
          group_id: string | null
          id: number
          org_id: string
          user_id: string | null
        }
        Insert: {
          announcement_id: string
          created_at?: string
          group_id?: string | null
          id?: number
          org_id: string
          user_id?: string | null
        }
        Update: {
          announcement_id?: string
          created_at?: string
          group_id?: string | null
          id?: number
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_recipients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      announcement_views: {
        Row: {
          announcement_id: string
          id: string
          opened_at: string
          org_id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          opened_at?: string
          org_id: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          opened_at?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_views_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcement_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      announcements: {
        Row: {
          allow_comments: boolean
          allow_reactions: boolean
          author_id: string
          calendar_event_id: string | null
          content: string
          created_at: string
          id: string
          media_kind: string | null
          media_thumbnail_url: string | null
          media_url: string | null
          org_id: string
          send_at: string | null
          sent_at: string | null
          status: string
          title: string
        }
        Insert: {
          allow_comments?: boolean
          allow_reactions?: boolean
          author_id: string
          calendar_event_id?: string | null
          content: string
          created_at?: string
          id?: string
          media_kind?: string | null
          media_thumbnail_url?: string | null
          media_url?: string | null
          org_id: string
          send_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
        }
        Update: {
          allow_comments?: boolean
          allow_reactions?: boolean
          author_id?: string
          calendar_event_id?: string | null
          content?: string
          created_at?: string
          id?: string
          media_kind?: string | null
          media_thumbnail_url?: string | null
          media_url?: string | null
          org_id?: string
          send_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcements_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          id: string
          metadata: Json | null
          org_id: string
          start_time: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          id?: string
          metadata?: Json | null
          org_id: string
          start_time: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          start_time?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_org_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_unit_fk"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }

      communities: {
        Row: {
          allow_unit_master_post: boolean
          allow_unit_user_post: boolean
          created_at: string
          created_by: string
          id: string
          name: string
          org_id: string
          segment_type:
            | Database["public"]["Enums"]["community_segment_type"]
            | null
          updated_at: string
          visibility: Database["public"]["Enums"]["community_visibility"]
        }
        Insert: {
          allow_unit_master_post?: boolean
          allow_unit_user_post?: boolean
          created_at?: string
          created_by: string
          id?: string
          name: string
          org_id: string
          segment_type?:
            | Database["public"]["Enums"]["community_segment_type"]
            | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["community_visibility"]
        }
        Update: {
          allow_unit_master_post?: boolean
          allow_unit_user_post?: boolean
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          org_id?: string
          segment_type?:
            | Database["public"]["Enums"]["community_segment_type"]
            | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["community_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "communities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      community_segments: {
        Row: {
          community_id: string
          created_at: string
          org_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["community_segment_type"]
        }
        Insert: {
          community_id: string
          created_at?: string
          org_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["community_segment_type"]
        }
        Update: {
          community_id?: string
          created_at?: string
          org_id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["community_segment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "community_segments_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_segments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      community_space_post_reaction_targets: {
        Row: {
          community_id: string
          created_at: string
          org_id: string
          post_id: string
          space_id: string
          target_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          org_id: string
          post_id: string
          space_id: string
          target_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          org_id?: string
          post_id?: string
          space_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_space_post_reaction_targets_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_space_post_reaction_targets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_space_post_reaction_targets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "community_space_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_space_post_reaction_targets_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "community_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_space_post_reaction_targets_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: true
            referencedRelation: "reaction_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      community_space_posts: {
        Row: {
          blocks: Json
          community_id: string
          cover_path: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          space_id: string
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          community_id: string
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          space_id: string
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          community_id?: string
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          space_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_space_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_space_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_space_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_space_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_space_posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_space_posts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "community_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      community_spaces: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          org_id: string
          space_type: Database["public"]["Enums"]["community_space_type"]
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          org_id: string
          space_type: Database["public"]["Enums"]["community_space_type"]
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          org_id?: string
          space_type?: Database["public"]["Enums"]["community_space_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_spaces_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_spaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_spaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_spaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_spaces_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profile: {
        Row: {
          cargo: string | null
          created_at: string
          data_entrada: string | null
          id: string
          org_id: string
          time_principal_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          data_entrada?: string | null
          id?: string
          org_id: string
          time_principal_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          data_entrada?: string | null
          id?: string
          org_id?: string
          time_principal_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_profile_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profile_time_principal_id_fkey"
            columns: ["time_principal_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      equipe_members: {
        Row: {
          created_at: string
          equipe_id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipe_id: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipe_id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipe_members_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipe_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equipe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      equipes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          leader_user_id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          leader_user_id: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          leader_user_id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equipes_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equipes_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipes_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equipes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          event_id: string | null
          id: string
          message: string
          metadata: Json
          org_id: string | null
          read: boolean
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          message: string
          metadata?: Json
          org_id?: string | null
          read?: boolean
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string
          metadata?: Json
          org_id?: string | null
          read?: boolean
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      orgs: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          slug: string
          state: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          slug: string
          state?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          slug?: string
          state?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          disabled: boolean
          disabled_at: string | null
          disabled_by: string | null
          full_name: string | null
          global_role: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          disabled?: boolean
          disabled_at?: string | null
          disabled_by?: string | null
          full_name?: string | null
          global_role?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          disabled?: boolean
          disabled_at?: string | null
          disabled_by?: string | null
          full_name?: string | null
          global_role?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reaction_counters: {
        Row: {
          count: number
          emoji: string
          target_id: string
          updated_at: string
        }
        Insert: {
          count?: number
          emoji: string
          target_id: string
          updated_at?: string
        }
        Update: {
          count?: number
          emoji?: string
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reaction_counters_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "reaction_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      reaction_targets: {
        Row: {
          allow_reactions: boolean
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          target_kind: string
          updated_at: string
        }
        Insert: {
          allow_reactions?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          target_kind: string
          updated_at?: string
        }
        Update: {
          allow_reactions?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          target_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reaction_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reaction_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reaction_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reaction_targets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          org_id: string
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          org_id: string
          target_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          org_id?: string
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "reaction_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      unit_members: {
        Row: {
          org_id: string | null
          unit_id: string
          user_id: string
        }
        Insert: {
          org_id?: string | null
          unit_id: string
          user_id: string
        }
        Update: {
          org_id?: string | null
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_members_org_member_fk"
            columns: ["org_id", "user_id"]
            isOneToOne: false
            referencedRelation: "org_members"
            referencedColumns: ["org_id", "user_id"]
          },
          {
            foreignKeyName: "unit_members_unit_fk"
            columns: ["unit_id", "org_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "unit_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "unit_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          cep: string | null
          cnpj: string | null
          created_at: string | null
          id: string
          name: string
          org_id: string
          phone: string | null
          slug: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          name: string
          org_id: string
          phone?: string | null
          slug?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string
          phone?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_members: {
        Row: {
          added_at: string
          group_id: string
          org_id: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          org_id: string
          unit_id?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          org_id?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          color: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      org_users_view: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          org_id: string | null
          org_role: Database["public"]["Enums"]["app_role"] | null
          phone: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          org_id: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          org_id?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          org_id?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipe_members_equipe_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipe_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equipe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unit_users_view"
            referencedColumns: ["user_id"]
          },
        ]
      }
      unit_users_view: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          phone: string | null
          unit_id: string | null
          unit_role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_interact_announcement: {
        Args: { p_announcement_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_announcement: {
        Args: { p_announcement_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_community: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_announcement: {
        Args: { p_announcement_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_community: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }

      get_user_identity_many: {
        Args: { p_user_ids: string[] }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          org_id: string
          user_id: string
        }[]
      }
      group_unit: { Args: { gid: string }; Returns: string }
      has_org_admin_role: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      has_org_management_role: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      has_org_membership: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }

      is_group_member: { Args: { gid: string }; Returns: boolean }
      is_group_owner: { Args: { gid: string }; Returns: boolean }
      is_member_of_org: { Args: { target_org: string }; Returns: boolean }
      is_member_of_unit: { Args: { target_unit: string }; Returns: boolean }
      is_org_admin: { Args: { target_org: string }; Returns: boolean }
      is_org_admin_of: { Args: { target_org: string }; Returns: boolean }
      is_org_master: { Args: { oid: string }; Returns: boolean }
      is_org_member: { Args: { oid: string }; Returns: boolean }
      is_platform_admin:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
      is_platform_admin_by_id: { Args: { target: string }; Returns: boolean }
      is_platform_admin_uid: { Args: { p_user_id: string }; Returns: boolean }
      is_unit_admin: { Args: { p_unit_id: string }; Returns: boolean }
      is_unit_master: { Args: { target_unit: string }; Returns: boolean }
      is_unit_master_of: { Args: { target_org: string }; Returns: boolean }
      is_unit_member: { Args: { uid_: string }; Returns: boolean }
      org_admin_count: { Args: { p_org: string }; Returns: number }
      slugify: { Args: { txt: string }; Returns: string }
      unit_org: { Args: { uid_: string }; Returns: string }
      update_profile_self: {
        Args: { p_avatar_url: string; p_full_name: string; p_phone: string }
        Returns: undefined
      }
      user_id_by_email: { Args: { p_email: string }; Returns: string }
    }
    Enums: {
      app_role: "org_admin" | "org_master" | "unit_master" | "unit_user"
      community_segment_type: "group" | "team"
      community_space_type: "publicacoes" | "eventos"
      community_visibility: "global" | "segmented"
      notification_type:
        | "announcement.sent"
        | "calendar.event_created"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["org_admin", "org_master", "unit_master", "unit_user"],
      community_segment_type: ["group", "team"],
      community_space_type: ["publicacoes", "eventos"],
      community_visibility: ["global", "segmented"],
      notification_type: [
        "announcement.sent",
        "calendar.event_created",
      ],
    },
  },
} as const
