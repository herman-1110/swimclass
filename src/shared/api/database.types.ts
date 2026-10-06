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
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          pinned: boolean
          removed_at: string | null
          send_email: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          pinned?: boolean
          removed_at?: string | null
          send_email?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          pinned?: boolean
          removed_at?: string | null
          send_email?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["exception_kind"]
          note: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          kind: Database["public"]["Enums"]["exception_kind"]
          note?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["exception_kind"]
          note?: string | null
          starts_at?: string
        }
        Relationships: []
      }
      availability_rules: {
        Row: {
          closes_at: string
          id: string
          opens_at: string
          weekday: number
        }
        Insert: {
          closes_at: string
          id?: string
          opens_at: string
          weekday: number
        }
        Update: {
          closes_at?: string
          id?: string
          opens_at?: string
          weekday?: number
        }
        Relationships: []
      }
      booking_changes: {
        Row: {
          account_id: string
          changed_at: string
          id: number
          series_id: string | null
        }
        Insert: {
          account_id: string
          changed_at?: string
          id?: never
          series_id?: string | null
        }
        Update: {
          account_id?: string
          changed_at?: string
          id?: never
          series_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_changes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          gap_override: boolean
          group_id: string
          id: string
          location: string
          series_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          ends_at: string
          gap_override?: boolean
          group_id: string
          id?: string
          location: string
          series_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          gap_override?: boolean
          group_id?: string
          id?: string
          location?: string
          series_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_balance"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "bookings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_details"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "bookings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_jobs: {
        Row: {
          done_at: string
          for_date: string
          job: string
        }
        Insert: {
          done_at?: string
          for_date: string
          job: string
        }
        Update: {
          done_at?: string
          for_date?: string
          job?: string
        }
        Relationships: []
      }
      email_outbox: {
        Row: {
          attempts: number
          body_html: string | null
          body_text: string
          claimed_at: string | null
          created_at: string
          dedupe_key: string | null
          id: number
          kind: string
          last_error: string | null
          sent_at: string | null
          subject: string
          to_email: string
        }
        Insert: {
          attempts?: number
          body_html?: string | null
          body_text: string
          claimed_at?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: never
          kind: string
          last_error?: string | null
          sent_at?: string | null
          subject: string
          to_email: string
        }
        Update: {
          attempts?: number
          body_html?: string | null
          body_text?: string
          claimed_at?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: never
          kind?: string
          last_error?: string | null
          sent_at?: string | null
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          student_id: string
        }
        Insert: {
          group_id: string
          student_id: string
        }
        Update: {
          group_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_balance"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_details"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          account_id: string
          active: boolean
          created_at: string
          id: string
          location: string
          opening_paid_lessons: number
          opening_used_lessons: number
        }
        Insert: {
          account_id: string
          active?: boolean
          created_at?: string
          id?: string
          location: string
          opening_paid_lessons?: number
          opening_used_lessons?: number
        }
        Update: {
          account_id?: string
          active?: boolean
          created_at?: string
          id?: string
          location?: string
          opening_paid_lessons?: number
          opening_used_lessons?: number
        }
        Relationships: [
          {
            foreignKeyName: "groups_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          id: number
          ip: unknown
          ok: boolean
          username: string
        }
        Insert: {
          attempted_at?: string
          id?: never
          ip?: unknown
          ok: boolean
          username: string
        }
        Update: {
          attempted_at?: string
          id?: never
          ip?: unknown
          ok?: boolean
          username?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          gateway_ref: string | null
          group_id: string
          id: string
          lessons: number
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          paid_on: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          gateway_ref?: string | null
          group_id: string
          id?: string
          lessons: number
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          gateway_ref?: string | null
          group_id?: string
          id?: string
          lessons?: number
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_balance"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_details"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          display_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          display_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          username?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          booking_confirmations: boolean
          booking_window_weeks: number
          business_name: string
          cancel_cutoff_hours: number
          coach_email: string
          digest_time: string
          id: number
          late_change_alert: boolean
          lesson_expiry_months: number | null
          lesson_lengths: number[]
          lessons_per_package: number
          max_students_per_lesson: number
          payment_instructions: string | null
          price_1to1_cents: number | null
          price_1to2_cents: number | null
          price_1to3_cents: number | null
          reminder_time: string
          require_approval: boolean
          start_step_minutes: number
          travel_gap_minutes: number
          unpaid_packages_allowed: number
          updated_at: string
        }
        Insert: {
          booking_confirmations?: boolean
          booking_window_weeks?: number
          business_name?: string
          cancel_cutoff_hours?: number
          coach_email?: string
          digest_time?: string
          id?: number
          late_change_alert?: boolean
          lesson_expiry_months?: number | null
          lesson_lengths?: number[]
          lessons_per_package?: number
          max_students_per_lesson?: number
          payment_instructions?: string | null
          price_1to1_cents?: number | null
          price_1to2_cents?: number | null
          price_1to3_cents?: number | null
          reminder_time?: string
          require_approval?: boolean
          start_step_minutes?: number
          travel_gap_minutes?: number
          unpaid_packages_allowed?: number
          updated_at?: string
        }
        Update: {
          booking_confirmations?: boolean
          booking_window_weeks?: number
          business_name?: string
          cancel_cutoff_hours?: number
          coach_email?: string
          digest_time?: string
          id?: number
          late_change_alert?: boolean
          lesson_expiry_months?: number | null
          lesson_lengths?: number[]
          lessons_per_package?: number
          max_students_per_lesson?: number
          payment_instructions?: string | null
          price_1to1_cents?: number | null
          price_1to2_cents?: number | null
          price_1to3_cents?: number | null
          reminder_time?: string
          require_approval?: boolean
          start_step_minutes?: number
          travel_gap_minutes?: number
          unpaid_packages_allowed?: number
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          account_id: string
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          account_id: string
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          account_id?: string
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      booking_ledger: {
        Row: {
          booking_id: string | null
          ends_at: string | null
          first_index: number | null
          group_id: string | null
          last_index: number | null
          lesson_in_package: number | null
          lessons: number | null
          package_no: number | null
          starts_at: string | null
          used: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_balance"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "bookings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_details"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "bookings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_balance: {
        Row: {
          account_id: string | null
          booked_in_package: number | null
          booked_lessons: number | null
          can_still_book: number | null
          group_id: string | null
          last_lesson_at: string | null
          last_paid_on: string | null
          last_payment_method:
            | Database["public"]["Enums"]["payment_method"]
            | null
          left_in_package: number | null
          package_no: number | null
          package_size: number | null
          paid_lessons: number | null
          unpaid: boolean | null
          unpaid_since: string | null
          used_in_package: number | null
          used_lessons: number | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_details: {
        Row: {
          account_id: string | null
          active: boolean | null
          created_at: string | null
          display_names: string | null
          group_id: string | null
          location: string | null
          opening_paid_lessons: number | null
          opening_used_lessons: number | null
          size: number | null
          student_ids: string[] | null
          type_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      account_email: { Args: { p_account_id: string }; Returns: string }
      ack_outbox: {
        Args: { p_error?: string; p_id: number; p_ok: boolean }
        Returns: boolean
      }
      add_exception: {
        Args: {
          p_ends_at: string
          p_kind: Database["public"]["Enums"]["exception_kind"]
          p_note?: string
          p_starts_at: string
        }
        Returns: string
      }
      add_free_lesson: {
        Args: { p_group_id: string; p_note?: string }
        Returns: string
      }
      app_now: { Args: never; Returns: string }
      approve_account: { Args: { p_account_id: string }; Returns: undefined }
      book_lesson: {
        Args: {
          p_group_id: string
          p_minutes: number
          p_repeat_weeks?: number
          p_starts_at: string
        }
        Returns: string[]
      }
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: undefined
      }
      check_login_attempt: {
        Args: { p_ip: unknown; p_username: string }
        Returns: Json
      }
      claim_outbox: {
        Args: { p_limit: number }
        Returns: {
          attempts: number
          body_html: string | null
          body_text: string
          claimed_at: string | null
          created_at: string
          dedupe_key: string | null
          id: number
          kind: string
          last_error: string | null
          sent_at: string | null
          subject: string
          to_email: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      coach_book: {
        Args: {
          p_gap_override?: boolean
          p_group_id: string
          p_ignore_credit?: boolean
          p_ignore_open_hours?: boolean
          p_minutes: number
          p_repeat_weeks?: number
          p_starts_at: string
        }
        Returns: string[]
      }
      coach_slot_check: {
        Args: {
          p_gap_override?: boolean
          p_group_id: string
          p_ignore_open_hours?: boolean
          p_minutes: number
          p_starts_at: string
        }
        Returns: {
          detail: Json
          ok: boolean
          reason: string
        }[]
      }
      coach_week: { Args: { p_week_start: string }; Returns: Json }
      create_group: {
        Args: {
          p_account_id: string
          p_amount_cents?: number
          p_first_package_paid?: boolean
          p_location: string
          p_method?: Database["public"]["Enums"]["payment_method"]
          p_opening_paid?: number
          p_opening_used?: number
          p_students: Json
        }
        Returns: string
      }
      duration_text: { Args: { p_minutes: number }; Returns: string }
      email_booked: {
        Args: { p_series_id: string }
        Returns: {
          body_html: string
          body_text: string
          subject: string
        }[]
      }
      email_broadcast: {
        Args: { p_account_id: string; p_announcement_id: string }
        Returns: {
          body_html: string
          body_text: string
          subject: string
        }[]
      }
      email_cancelled: {
        Args: { p_booking_id: string }
        Returns: {
          body_html: string
          body_text: string
          subject: string
        }[]
      }
      email_digest: {
        Args: { p_for_date: string }
        Returns: {
          body_html: string
          body_text: string
          subject: string
        }[]
      }
      email_html: { Args: { p_text: string }; Returns: string }
      email_late_alert: {
        Args: { p_booking_id: string; p_event: string }
        Returns: {
          body_html: string
          body_text: string
          subject: string
        }[]
      }
      email_log: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          kind: string
          last_error: string
          sent_at: string
          to_email: string
        }[]
      }
      email_reminder: {
        Args: { p_account_id: string; p_for_date: string }
        Returns: {
          body_html: string
          body_text: string
          subject: string
        }[]
      }
      email_text: { Args: { p_text: string }; Returns: string }
      excuse_booking: { Args: { p_booking_id: string }; Returns: undefined }
      get_public_settings: {
        Args: never
        Returns: {
          booking_window_weeks: number
          business_name: string
          cancel_cutoff_hours: number
          lesson_lengths: number[]
          lessons_per_package: number
          payment_instructions: string
          price_1to1_cents: number
          price_1to2_cents: number
          price_1to3_cents: number
          start_step_minutes: number
          travel_gap_minutes: number
        }[]
      }
      html_escape: { Args: { p_text: string }; Returns: string }
      is_approved: { Args: never; Returns: boolean }
      is_coach: { Args: never; Returns: boolean }
      lesson_travel: {
        Args: { p_from: string; p_to: string }
        Returns: {
          booking_id: string
          travel_after: number
          travel_before: number
        }[]
      }
      lessons_for: {
        Args: { p_ends_at: string; p_starts_at: string }
        Returns: number
      }
      lock_booking_dates: {
        Args: { p_minutes: number; p_starts: string[] }
        Returns: undefined
      }
      my_account_id: { Args: never; Returns: string }
      myt_day_text: { Args: { p_at: string }; Returns: string }
      myt_range_text: {
        Args: { p_ends_at: string; p_starts_at: string }
        Returns: string
      }
      myt_text: { Args: { p_at: string }; Returns: string }
      myt_time_text: { Args: { p_at: string }; Returns: string }
      myt_when_text: {
        Args: { p_ends_at: string; p_starts_at: string }
        Returns: string
      }
      open_windows: {
        Args: { p_day: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      package_price_cents: {
        Args: { p_group_id: string; p_lessons: number }
        Returns: number
      }
      package_settings: {
        Args: never
        Returns: {
          lessons_per_package: number
          unpaid_packages_allowed: number
        }[]
      }
      pending_accounts: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          email_confirmed: boolean
          id: string
          phone: string
          username: string
        }[]
      }
      place_bookings: {
        Args: {
          p_by_coach: boolean
          p_gap_override: boolean
          p_group_id: string
          p_ignore_credit: boolean
          p_ignore_open_hours: boolean
          p_minutes: number
          p_repeat_weeks: number
          p_starts_at: string
        }
        Returns: string[]
      }
      post_announcement: {
        Args: { p_message: string; p_pinned?: boolean; p_send_email?: boolean }
        Returns: string
      }
      queue_booked_emails: { Args: { p_series_id: string }; Returns: undefined }
      queue_broadcast_emails: {
        Args: { p_announcement_id: string }
        Returns: undefined
      }
      queue_cancelled_emails: {
        Args: { p_booking_id: string; p_by_customer: boolean }
        Returns: undefined
      }
      queue_daily_emails: { Args: { p_for_date: string }; Returns: number }
      queue_email: {
        Args: {
          p_body_html: string
          p_body_text: string
          p_dedupe_key: string
          p_kind: string
          p_subject: string
          p_to: string
        }
        Returns: boolean
      }
      record_login_success: {
        Args: { p_attempt_id: number }
        Returns: undefined
      }
      record_payment: {
        Args: {
          p_amount_cents: number
          p_group_id: string
          p_lessons: number
          p_method: Database["public"]["Enums"]["payment_method"]
          p_note?: string
          p_paid_on?: string
        }
        Returns: string
      }
      remove_announcement: { Args: { p_id: string }; Returns: undefined }
      remove_exception: { Args: { p_id: string }; Returns: undefined }
      ringgit_text: { Args: { p_cents: number }; Returns: string }
      set_group_active: {
        Args: { p_active: boolean; p_group_id: string }
        Returns: undefined
      }
      set_open_hours: { Args: { p_rules: Json }; Returns: undefined }
      slot_check: {
        Args: {
          p_allow_past?: boolean
          p_group_id: string
          p_ignore_open_hours?: boolean
          p_ignore_window?: boolean
          p_minutes: number
          p_starts_at: string
          p_viewer: string
        }
        Returns: {
          detail: Json
          ok: boolean
          reason: string
        }[]
      }
      update_group: {
        Args: {
          p_group_id: string
          p_location?: string
          p_opening_paid?: number
          p_opening_used?: number
        }
        Returns: undefined
      }
      update_settings: {
        Args: { p_settings: Json }
        Returns: {
          booking_confirmations: boolean
          booking_window_weeks: number
          business_name: string
          cancel_cutoff_hours: number
          coach_email: string
          digest_time: string
          id: number
          late_change_alert: boolean
          lesson_expiry_months: number | null
          lesson_lengths: number[]
          lessons_per_package: number
          max_students_per_lesson: number
          payment_instructions: string | null
          price_1to1_cents: number | null
          price_1to2_cents: number | null
          price_1to3_cents: number | null
          reminder_time: string
          require_approval: boolean
          start_step_minutes: number
          travel_gap_minutes: number
          unpaid_packages_allowed: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      username_available: { Args: { p_username: string }; Returns: boolean }
      week_busy: { Args: { p_week_start: string }; Returns: Json }
      week_slots: {
        Args: { p_group_id: string; p_minutes: number; p_week_start: string }
        Returns: {
          day: string
          detail: Json
          ok: boolean
          reason: string
          starts_at: string
        }[]
      }
    }
    Enums: {
      app_role: "coach" | "customer"
      booking_status: "booked" | "cancelled" | "excused"
      exception_kind: "closed" | "open"
      payment_method: "cash" | "transfer" | "fpx" | "free" | "other"
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
      app_role: ["coach", "customer"],
      booking_status: ["booked", "cancelled", "excused"],
      exception_kind: ["closed", "open"],
      payment_method: ["cash", "transfer", "fpx", "free", "other"],
    },
  },
} as const
