export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_chat_queue: {
        Row: {
          assigned_admin: string | null
          chat_session_id: string | null
          created_at: string | null
          id: string
          message: string
          priority: string | null
          responded_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          assigned_admin?: string | null
          chat_session_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          priority?: string | null
          responded_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          assigned_admin?: string | null
          chat_session_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          priority?: string | null
          responded_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_chat_queue_assigned_admin_fkey"
            columns: ["assigned_admin"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_chat_queue_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_chat_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          auto_status_config: Json | null
          chat_blocked_until: string | null
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          auto_status_config?: Json | null
          chat_blocked_until?: string | null
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          auto_status_config?: Json | null
          chat_blocked_until?: string | null
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      auto_status_schedules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          next_execution: string
          schedule_type: string
          schedule_value: number
          target_status: string
          tool_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          next_execution: string
          schedule_type: string
          schedule_value: number
          target_status: string
          tool_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          next_execution?: string
          schedule_type?: string
          schedule_value?: number
          target_status?: string
          tool_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_workflows: {
        Row: {
          actions: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_conditions: Json | null
          trigger_type: string
        }
        Insert: {
          actions: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_conditions?: Json | null
          trigger_type: string
        }
        Update: {
          actions?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_conditions?: Json | null
          trigger_type?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          context_data: Json | null
          created_at: string | null
          first_message_sent: boolean | null
          id: string
          last_activity: string | null
          session_status: string | null
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string | null
          first_message_sent?: boolean | null
          id?: string
          last_activity?: string | null
          session_status?: string | null
          user_id: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string | null
          first_message_sent?: boolean | null
          id?: string
          last_activity?: string | null
          session_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      content: {
        Row: {
          auto_hide_at: string | null
          auto_publish_at: string | null
          carousel_image_url: string | null
          carousel_order: number | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          estimated_duration: number | null
          hero_image_alt: string | null
          hero_image_url: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          order_index: number | null
          published_at: string | null
          required_plan: Database["public"]["Enums"]["user_plan"]
          scheduled_publish_at: string | null
          show_in_carousel: boolean | null
          status: string | null
          tags: string[] | null
          target_users: string[] | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          auto_hide_at?: string | null
          auto_publish_at?: string | null
          carousel_image_url?: string | null
          carousel_order?: number | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration?: number | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          order_index?: number | null
          published_at?: string | null
          required_plan?: Database["public"]["Enums"]["user_plan"]
          scheduled_publish_at?: string | null
          show_in_carousel?: boolean | null
          status?: string | null
          tags?: string[] | null
          target_users?: string[] | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          auto_hide_at?: string | null
          auto_publish_at?: string | null
          carousel_image_url?: string | null
          carousel_order?: number | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration?: number | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          order_index?: number | null
          published_at?: string | null
          required_plan?: Database["public"]["Enums"]["user_plan"]
          scheduled_publish_at?: string | null
          show_in_carousel?: boolean | null
          status?: string | null
          tags?: string[] | null
          target_users?: string[] | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      content_analytics: {
        Row: {
          completion_percentage: number | null
          content_id: string | null
          created_at: string | null
          id: string
          interaction_type: string | null
          rating: number | null
          user_id: string | null
          view_duration: number | null
        }
        Insert: {
          completion_percentage?: number | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          interaction_type?: string | null
          rating?: number | null
          user_id?: string | null
          view_duration?: number | null
        }
        Update: {
          completion_percentage?: number | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          interaction_type?: string | null
          rating?: number | null
          user_id?: string | null
          view_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_analytics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_schedules: {
        Row: {
          action_type: string
          content_id: string | null
          created_at: string | null
          executed: boolean | null
          id: string
          scheduled_at: string
          target_plans: string[] | null
          target_users: string[] | null
        }
        Insert: {
          action_type: string
          content_id?: string | null
          created_at?: string | null
          executed?: boolean | null
          id?: string
          scheduled_at: string
          target_plans?: string[] | null
          target_users?: string[] | null
        }
        Update: {
          action_type?: string
          content_id?: string | null
          created_at?: string | null
          executed?: boolean | null
          id?: string
          scheduled_at?: string
          target_plans?: string[] | null
          target_users?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "content_schedules_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_topics: {
        Row: {
          content_id: string
          created_at: string | null
          description: string | null
          external_links: Json | null
          id: string
          is_active: boolean | null
          pdf_urls: string[] | null
          resource_metadata: Json | null
          title: string
          topic_image_url: string | null
          topic_order: number | null
          updated_at: string | null
          video_urls: string[] | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          description?: string | null
          external_links?: Json | null
          id?: string
          is_active?: boolean | null
          pdf_urls?: string[] | null
          resource_metadata?: Json | null
          title: string
          topic_image_url?: string | null
          topic_order?: number | null
          updated_at?: string | null
          video_urls?: string[] | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          description?: string | null
          external_links?: Json | null
          id?: string
          is_active?: boolean | null
          pdf_urls?: string[] | null
          resource_metadata?: Json | null
          title?: string
          topic_image_url?: string | null
          topic_order?: number | null
          updated_at?: string | null
          video_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "content_topics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_visibility_rules: {
        Row: {
          content_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_visible: boolean | null
          override_plan_restrictions: boolean | null
          scheduled_hide_date: string | null
          scheduled_show_date: string | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_visible?: boolean | null
          override_plan_restrictions?: boolean | null
          scheduled_hide_date?: string | null
          scheduled_show_date?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_visible?: boolean | null
          override_plan_restrictions?: boolean | null
          scheduled_hide_date?: string | null
          scheduled_show_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_visibility_rules_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_cost: number
          reward_type: string
          reward_value: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_cost: number
          reward_type: string
          reward_value?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_cost?: number
          reward_type?: string
          reward_value?: Json | null
        }
        Relationships: []
      }
      media_library: {
        Row: {
          alt_text: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          height: number | null
          id: string
          tags: string[] | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          height?: number | null
          id?: string
          tags?: string[] | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          height?: number | null
          id?: string
          tags?: string[] | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_popup: boolean | null
          message: string
          popup_duration: number | null
          target_plans: string[] | null
          target_users: string[] | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popup?: boolean | null
          message: string
          popup_duration?: number | null
          target_plans?: string[] | null
          target_users?: string[] | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popup?: boolean | null
          message?: string
          popup_duration?: number | null
          target_plans?: string[] | null
          target_users?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      plan_expiration_queue: {
        Row: {
          created_at: string | null
          downgrade_executed: boolean | null
          expiration_date: string
          expiration_notice: boolean | null
          id: string
          reminder_1_day: boolean | null
          reminder_7_days: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          downgrade_executed?: boolean | null
          expiration_date: string
          expiration_notice?: boolean | null
          id?: string
          reminder_1_day?: boolean | null
          reminder_7_days?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          downgrade_executed?: boolean | null
          expiration_date?: string
          expiration_notice?: boolean | null
          id?: string
          reminder_1_day?: boolean | null
          reminder_7_days?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_expiration_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          areas_accessed: number | null
          auto_renewal: boolean | null
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          last_activity: string | null
          loyalty_level: string | null
          pix_key: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          plan_end_date: string | null
          plan_start_date: string | null
          plan_status: string | null
          preferences: Json | null
          referral_code: string | null
          referral_earnings: number | null
          role: string | null
          total_points: number | null
          total_session_time: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          areas_accessed?: number | null
          auto_renewal?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          last_activity?: string | null
          loyalty_level?: string | null
          pix_key?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          plan_end_date?: string | null
          plan_start_date?: string | null
          plan_status?: string | null
          preferences?: Json | null
          referral_code?: string | null
          referral_earnings?: number | null
          role?: string | null
          total_points?: number | null
          total_session_time?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          areas_accessed?: number | null
          auto_renewal?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          last_activity?: string | null
          loyalty_level?: string | null
          pix_key?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          plan_end_date?: string | null
          plan_start_date?: string | null
          plan_status?: string | null
          preferences?: Json | null
          referral_code?: string | null
          referral_earnings?: number | null
          role?: string | null
          total_points?: number | null
          total_session_time?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_settings: {
        Row: {
          amount: number
          commission_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          max_referrals_per_user: number | null
          min_payout: number
          target_plan: string
          updated_at: string
        }
        Insert: {
          amount?: number
          commission_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_referrals_per_user?: number | null
          min_payout?: number
          target_plan?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          commission_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_referrals_per_user?: number | null
          min_payout?: number
          target_plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_amount: number | null
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_amount?: number | null
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_amount?: number | null
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_personal_message: boolean | null
          message: string
          notification_type: string | null
          recipient_user_id: string | null
          scheduled_at: string
          sent: boolean | null
          target_plans: string[] | null
          target_users: string[] | null
          template_data: Json | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_personal_message?: boolean | null
          message: string
          notification_type?: string | null
          recipient_user_id?: string | null
          scheduled_at: string
          sent?: boolean | null
          target_plans?: string[] | null
          target_users?: string[] | null
          template_data?: Json | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_personal_message?: boolean | null
          message?: string
          notification_type?: string | null
          recipient_user_id?: string | null
          scheduled_at?: string
          sent?: boolean | null
          target_plans?: string[] | null
          target_users?: string[] | null
          template_data?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_bot: boolean | null
          is_internal: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_bot?: boolean | null
          is_internal?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_bot?: boolean | null
          is_internal?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_status: {
        Row: {
          created_at: string
          id: string
          message: string | null
          scheduled_maintenance: Json | null
          status: string
          tool_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          scheduled_maintenance?: Json | null
          status?: string
          tool_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          scheduled_maintenance?: Json | null
          status?: string
          tool_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      topic_resources: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          required_plan: string | null
          resource_order: number | null
          resource_type: string
          resource_url: string
          thumbnail_url: string | null
          title: string
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          required_plan?: string | null
          resource_order?: number | null
          resource_type: string
          resource_url: string
          thumbnail_url?: string | null
          title: string
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          required_plan?: string | null
          resource_order?: number | null
          resource_type?: string
          resource_url?: string
          thumbnail_url?: string | null
          title?: string
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "content_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_releases: {
        Row: {
          announcement_image: string | null
          content_preview: string | null
          countdown_enabled: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          release_date: string
          target_plans: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          announcement_image?: string | null
          content_preview?: string | null
          countdown_enabled?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          release_date: string
          target_plans?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          announcement_image?: string | null
          content_preview?: string | null
          countdown_enabled?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          release_date?: string
          target_plans?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          id: string
          points_awarded: number | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          id?: string
          points_awarded?: number | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          id?: string
          points_awarded?: number | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: unknown | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chat_restrictions: {
        Row: {
          blocked_until: string | null
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_content_access: {
        Row: {
          access_type: string
          content_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          scheduled_at: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          access_type?: string
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          scheduled_at?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          scheduled_at?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_content_access_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_content_access_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "content_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_content_visibility: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          is_visible: boolean | null
          scheduled_hide_date: string | null
          scheduled_show_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          scheduled_hide_date?: string | null
          scheduled_show_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          scheduled_hide_date?: string | null
          scheduled_show_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_content_visibility_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          ip_address: unknown | null
          metadata: Json | null
          session_id: string | null
          target_id: string | null
          target_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          ip_address?: unknown | null
          metadata?: Json | null
          session_id?: string | null
          target_id?: string | null
          target_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          ip_address?: unknown | null
          metadata?: Json | null
          session_id?: string | null
          target_id?: string | null
          target_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_loyalty_points: {
        Row: {
          created_at: string | null
          id: string
          level: string
          points: number
          total_earned: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: string
          points?: number
          total_earned?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          points?: number
          total_earned?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_progress: number | null
          expires_at: string | null
          id: string
          mission_description: string
          mission_type: string
          points_reward: number
          status: string | null
          target_value: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          expires_at?: string | null
          id?: string
          mission_description: string
          mission_type: string
          points_reward: number
          status?: string | null
          target_value: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          expires_at?: string | null
          id?: string
          mission_description?: string
          mission_type?: string
          points_reward?: number
          status?: string | null
          target_value?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          pix_key: string
          processed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          pix_key: string
          processed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          pix_key?: string
          processed_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_clear_chat_messages: {
        Args: { ticket_id_param: string }
        Returns: undefined
      }
      admin_create_user: {
        Args: {
          user_email: string
          user_password: string
          user_full_name: string
          user_plan?: Database["public"]["Enums"]["user_plan"]
          user_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      admin_create_user_safe: {
        Args: {
          user_email: string
          user_password: string
          user_full_name: string
          user_plan?: Database["public"]["Enums"]["user_plan"]
          user_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      admin_delete_user_completely: {
        Args: { target_user_id: string }
        Returns: Json
      }
      award_loyalty_points: {
        Args: {
          user_uuid: string
          points_amount: number
          activity_type: string
        }
        Returns: undefined
      }
      calculate_referral_commission: {
        Args: { referrer_user_id: string; referred_plan: string }
        Returns: number
      }
      check_user_role: {
        Args: { target_role: string }
        Returns: boolean
      }
      get_all_users_for_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          full_name: string
          avatar_url: string
          plan: Database["public"]["Enums"]["user_plan"]
          pix_key: string
          total_session_time: number
          areas_accessed: number
          referral_code: string
          referral_earnings: number
          created_at: string
          updated_at: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      content_type: "product" | "tool" | "course" | "tutorial"
      user_plan: "free" | "vip" | "pro"
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
      app_role: ["admin", "moderator", "user"],
      content_type: ["product", "tool", "course", "tutorial"],
      user_plan: ["free", "vip", "pro"],
    },
  },
} as const
