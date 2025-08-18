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
      admin_notification_views: {
        Row: {
          admin_id: string
          id: string
          notification_id: string
          viewed_at: string
        }
        Insert: {
          admin_id: string
          id?: string
          notification_id: string
          viewed_at?: string
        }
        Update: {
          admin_id?: string
          id?: string
          notification_id?: string
          viewed_at?: string
        }
        Relationships: []
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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          area: string
          created_at: string
          diff: Json | null
          id: string
          metadata: Json | null
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          area: string
          created_at?: string
          diff?: Json | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          area?: string
          created_at?: string
          diff?: Json | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
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
      chatbot_analytics: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          response_id: string | null
          trigger_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          response_id?: string | null
          trigger_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          response_id?: string | null
          trigger_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_analytics_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "chatbot_rich_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_rich_responses: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          message: string
          priority: number | null
          response_type: string
          rich_content: Json | null
          title: string | null
          trigger_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          priority?: number | null
          response_type?: string
          rich_content?: Json | null
          title?: string | null
          trigger_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          priority?: number | null
          response_type?: string
          rich_content?: Json | null
          title?: string | null
          trigger_text?: string
          updated_at?: string | null
        }
        Relationships: []
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
      event_bus: {
        Row: {
          created_at: string
          data: Json
          dispatched_at: string | null
          error_message: string | null
          id: string
          retry_count: number | null
          status: Database["public"]["Enums"]["event_bus_status"]
          subscription_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          dispatched_at?: string | null
          error_message?: string | null
          id?: string
          retry_count?: number | null
          status?: Database["public"]["Enums"]["event_bus_status"]
          subscription_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          dispatched_at?: string | null
          error_message?: string | null
          id?: string
          retry_count?: number | null
          status?: Database["public"]["Enums"]["event_bus_status"]
          subscription_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_bus_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
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
          notification_metadata: Json | null
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
          notification_metadata?: Json | null
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
          notification_metadata?: Json | null
          popup_duration?: number | null
          target_plans?: string[] | null
          target_users?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      outbound_deliveries: {
        Row: {
          attempt: number
          created_at: string
          delivered_at: string | null
          event_id: string
          id: string
          next_retry_at: string | null
          response_body: string | null
          response_code: number | null
          status: Database["public"]["Enums"]["delivery_status"]
          target_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          event_id: string
          id?: string
          next_retry_at?: string | null
          response_body?: string | null
          response_code?: number | null
          status?: Database["public"]["Enums"]["delivery_status"]
          target_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          event_id?: string
          id?: string
          next_retry_at?: string | null
          response_body?: string | null
          response_code?: number | null
          status?: Database["public"]["Enums"]["delivery_status"]
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_deliveries_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "outbound_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_subscriptions: {
        Row: {
          active: boolean
          backoff_state: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          failures_count: number | null
          id: string
          last_delivery_at: string | null
          secret: string | null
          target_url: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          backoff_state?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          failures_count?: number | null
          id?: string
          last_delivery_at?: string | null
          secret?: string | null
          target_url: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          backoff_state?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          failures_count?: number | null
          id?: string
          last_delivery_at?: string | null
          secret?: string | null
          target_url?: string
          updated_at?: string
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
      plans: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          features: Json | null
          id: string
          interval: string
          metadata: Json | null
          name: string
          price_cents: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          metadata?: Json | null
          name: string
          price_cents?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          metadata?: Json | null
          name?: string
          price_cents?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_products: {
        Row: {
          active: boolean
          checkout_url: string | null
          created_at: string
          id: string
          metadata: Json | null
          plan_id: string
          platform: Database["public"]["Enums"]["platform_enum"]
          price_id: string | null
          product_id: string
        }
        Insert: {
          active?: boolean
          checkout_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          plan_id: string
          platform: Database["public"]["Enums"]["platform_enum"]
          price_id?: string | null
          product_id: string
        }
        Update: {
          active?: boolean
          checkout_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          plan_id?: string
          platform?: Database["public"]["Enums"]["platform_enum"]
          price_id?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_products_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
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
          purchase_source: string | null
          referral_code: string | null
          referral_earnings: number | null
          role: string | null
          total_points: number | null
          total_session_time: number | null
          updated_at: string | null
          user_id: string
          whatsapp: string | null
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
          purchase_source?: string | null
          referral_code?: string | null
          referral_earnings?: number | null
          role?: string | null
          total_points?: number | null
          total_session_time?: number | null
          updated_at?: string | null
          user_id: string
          whatsapp?: string | null
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
          purchase_source?: string | null
          referral_code?: string | null
          referral_earnings?: number | null
          role?: string | null
          total_points?: number | null
          total_session_time?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp?: string | null
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
      security_settings: {
        Row: {
          block_duration_minutes: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_ips_per_user: number
          updated_at: string
        }
        Insert: {
          block_duration_minutes?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_ips_per_user?: number
          updated_at?: string
        }
        Update: {
          block_duration_minutes?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_ips_per_user?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          external_customer_id: string | null
          external_subscription_id: string | null
          id: string
          metadata: Json | null
          plan_id: string | null
          platform: Database["public"]["Enums"]["platform_enum"] | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          platform?: Database["public"]["Enums"]["platform_enum"] | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          platform?: Database["public"]["Enums"]["platform_enum"] | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_bot: boolean | null
          is_internal: boolean | null
          message: string
          message_type: string | null
          rich_content: Json | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_bot?: boolean | null
          is_internal?: boolean | null
          message: string
          message_type?: string | null
          rich_content?: Json | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_bot?: boolean | null
          is_internal?: boolean | null
          message?: string
          message_type?: string | null
          rich_content?: Json | null
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
      terms_acceptance: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
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
      tracking_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_name: string
          fb_response: Json | null
          id: string
          source: Database["public"]["Enums"]["tracking_source"]
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_name: string
          fb_response?: Json | null
          id?: string
          source: Database["public"]["Enums"]["tracking_source"]
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_name?: string
          fb_response?: Json | null
          id?: string
          source?: Database["public"]["Enums"]["tracking_source"]
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      tracking_meta: {
        Row: {
          access_token: string
          active: boolean
          created_at: string
          created_by: string | null
          enable_client: boolean
          enable_dedup: boolean
          enable_server: boolean
          id: string
          pixel_id: string
          test_event_code: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          active?: boolean
          created_at?: string
          created_by?: string | null
          enable_client?: boolean
          enable_dedup?: boolean
          enable_server?: boolean
          id?: string
          pixel_id: string
          test_event_code?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          active?: boolean
          created_at?: string
          created_by?: string | null
          enable_client?: boolean
          enable_dedup?: boolean
          enable_server?: boolean
          id?: string
          pixel_id?: string
          test_event_code?: string | null
          updated_at?: string
        }
        Relationships: []
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
      user_area_tracking: {
        Row: {
          accessed_at: string
          area_name: string
          created_at: string
          id: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string
          area_name: string
          created_at?: string
          id?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string
          area_name?: string
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_chat_visibility: {
        Row: {
          created_at: string
          hidden_at: string | null
          hidden_by: string | null
          id: string
          is_hidden: boolean
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_hidden?: boolean
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          is_hidden?: boolean
          reason?: string | null
          updated_at?: string
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
      user_security_blocks: {
        Row: {
          block_reason: string
          blocked_by_system: boolean
          blocked_until: string
          created_at: string
          id: string
          ip_count: number | null
          is_active: boolean
          user_id: string
        }
        Insert: {
          block_reason: string
          blocked_by_system?: boolean
          blocked_until: string
          created_at?: string
          id?: string
          ip_count?: number | null
          is_active?: boolean
          user_id: string
        }
        Update: {
          block_reason?: string
          blocked_by_system?: boolean
          blocked_until?: string
          created_at?: string
          id?: string
          ip_count?: number | null
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          ip_address: unknown
          is_active: boolean
          location_data: Json | null
          session_end: string | null
          session_start: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          ip_address: unknown
          is_active?: boolean
          location_data?: Json | null
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          ip_address?: unknown
          is_active?: boolean
          location_data?: Json | null
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_time_sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_time_tracking: {
        Row: {
          created_at: string
          date: string
          id: string
          minutes_spent: number
          month_start: string
          updated_at: string
          user_id: string
          week_start: string
          year: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          minutes_spent?: number
          month_start: string
          updated_at?: string
          user_id: string
          week_start: string
          year: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          minutes_spent?: number
          month_start?: string
          updated_at?: string
          user_id?: string
          week_start?: string
          year?: number
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          last_healthcheck_at: string | null
          provider: Database["public"]["Enums"]["platform_enum"]
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_healthcheck_at?: string | null
          provider: Database["public"]["Enums"]["platform_enum"]
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_healthcheck_at?: string | null
          provider?: Database["public"]["Enums"]["platform_enum"]
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          canonical_event: Json | null
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          processed_at: string | null
          provider: Database["public"]["Enums"]["platform_enum"]
          raw_headers: Json
          raw_payload: Json
          received_at: string
          status: Database["public"]["Enums"]["webhook_status"]
          verified: boolean
        }
        Insert: {
          canonical_event?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          processed_at?: string | null
          provider: Database["public"]["Enums"]["platform_enum"]
          raw_headers: Json
          raw_payload: Json
          received_at?: string
          status?: Database["public"]["Enums"]["webhook_status"]
          verified?: boolean
        }
        Update: {
          canonical_event?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          processed_at?: string | null
          provider?: Database["public"]["Enums"]["platform_enum"]
          raw_headers?: Json
          raw_payload?: Json
          received_at?: string
          status?: Database["public"]["Enums"]["webhook_status"]
          verified?: boolean
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
      add_session_time: {
        Args: { minutes_to_add?: number }
        Returns: undefined
      }
      admin_clear_all_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      admin_clear_chat_messages: {
        Args: { ticket_id_param: string }
        Returns: undefined
      }
      admin_create_user: {
        Args: {
          user_email: string
          user_full_name: string
          user_password: string
          user_plan?: Database["public"]["Enums"]["user_plan"]
          user_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      admin_create_user_safe: {
        Args: {
          user_email: string
          user_full_name: string
          user_password: string
          user_plan?: Database["public"]["Enums"]["user_plan"]
          user_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      admin_delete_all_tickets: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_delete_user_completely: {
        Args: { target_user_id: string }
        Returns: Json
      }
      admin_toggle_user_chat_visibility: {
        Args: {
          hide_chat: boolean
          hide_reason?: string
          target_user_id: string
        }
        Returns: Json
      }
      admin_unblock_user: {
        Args: { block_id: string }
        Returns: Json
      }
      award_loyalty_points: {
        Args: {
          activity_type: string
          points_amount: number
          user_uuid: string
        }
        Returns: undefined
      }
      calculate_referral_commission: {
        Args: { referred_plan: string; referrer_user_id: string }
        Returns: number
      }
      check_ip_limit: {
        Args: { current_ip: unknown; target_user_id: string }
        Returns: Json
      }
      check_user_role: {
        Args: { target_role: string }
        Returns: boolean
      }
      cleanup_user_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_platform_checkout: {
        Args: { plan_slug: string; platform_name: string; user_email?: string }
        Returns: Json
      }
      enforce_ip_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_webhook_url: {
        Args: { provider_name: string }
        Returns: string
      }
      get_all_users_for_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          areas_accessed: number
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          pix_key: string
          plan: Database["public"]["Enums"]["user_plan"]
          purchase_source: string
          referral_code: string
          referral_earnings: number
          role: Database["public"]["Enums"]["app_role"]
          total_session_time: number
          updated_at: string
          user_email: string
          user_id: string
          whatsapp: string
        }[]
      }
      get_all_users_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          last_activity: string
          month_minutes: number
          today_minutes: number
          total_areas_accessed: number
          total_referrals: number
          user_id: string
          user_name: string
          user_plan: string
          week_minutes: number
          year_minutes: number
        }[]
      }
      get_authorized_resource_url: {
        Args: { requesting_user_id?: string; resource_id: string }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_time_stats: {
        Args: { target_user_id?: string }
        Returns: {
          month_minutes: number
          today_minutes: number
          week_minutes: number
          year_minutes: number
        }[]
      }
      get_user_resources: {
        Args: { topic_id_param: string }
        Returns: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_premium: boolean
          required_plan: string
          resource_order: number
          resource_type: string
          resource_url: string
          thumbnail_url: string
          title: string
          topic_id: string
          updated_at: string
        }[]
      }
      get_user_security_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_blocked: boolean
          is_currently_active: boolean
          last_session_start: string
          total_sessions: number
          total_time_minutes: number
          unique_ips: number
          user_id: string
          user_name: string
          user_plan: string
        }[]
      }
      get_user_time_stats: {
        Args: { target_user_id?: string }
        Returns: {
          month_minutes: number
          today_minutes: number
          week_minutes: number
          year_minutes: number
        }[]
      }
      has_accepted_terms: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      is_user_blocked: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      normalize_webhook_payload: {
        Args: { payload: Json; provider_name: string }
        Returns: Json
      }
      notify_admins: {
        Args: {
          notification_message: string
          notification_title: string
          notification_type?: string
        }
        Returns: undefined
      }
      process_auto_status_schedules: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_webhook_event: {
        Args: { event_id: string }
        Returns: Json
      }
      test_admin_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      track_area_access: {
        Args: { area_name_param: string; session_uuid?: string }
        Returns: undefined
      }
      track_daily_time: {
        Args: { minutes_to_add: number }
        Returns: undefined
      }
      update_user_total_session_time: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      content_type: "product" | "tool" | "course" | "tutorial"
      delivery_status: "pending" | "success" | "failed" | "retry"
      event_bus_status: "pending" | "dispatched" | "failed"
      platform_enum: "hotmart" | "kiwify" | "caktor" | "generic"
      subscription_status:
        | "active"
        | "past_due"
        | "canceled"
        | "trialing"
        | "pending"
      tracking_source: "client" | "server"
      user_plan: "free" | "vip" | "pro"
      webhook_status: "received" | "processed" | "failed" | "discarded"
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
      delivery_status: ["pending", "success", "failed", "retry"],
      event_bus_status: ["pending", "dispatched", "failed"],
      platform_enum: ["hotmart", "kiwify", "caktor", "generic"],
      subscription_status: [
        "active",
        "past_due",
        "canceled",
        "trialing",
        "pending",
      ],
      tracking_source: ["client", "server"],
      user_plan: ["free", "vip", "pro"],
      webhook_status: ["received", "processed", "failed", "discarded"],
    },
  },
} as const
