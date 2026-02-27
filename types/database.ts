export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'staff' | 'admin'
export type PriorityLevel = 'P1' | 'P2' | 'P3'
export type EvidenceType = 'none' | 'note' | 'numeric' | 'photo'
export type TaskStatus = 'pending' | 'completed' | 'blocked' | 'skipped'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          site_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: UserRole
          site_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          site_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sites: {
        Row: {
          id: string
          name: string
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      shift_sessions: {
        Row: {
          id: string
          site_id: string
          started_by: string
          started_at: string
          completed_by: string | null
          completed_at: string | null
          shift_type: string
          notes: string | null
          is_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          started_by: string
          started_at?: string
          completed_by?: string | null
          completed_at?: string | null
          shift_type: string
          notes?: string | null
          is_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          started_by?: string
          started_at?: string
          completed_by?: string | null
          completed_at?: string | null
          shift_type?: string
          notes?: string | null
          is_complete?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          site_id: string | null
          name: string
          description: string | null
          template_type: string
          is_active: boolean
          version: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id?: string | null
          name: string
          description?: string | null
          template_type: string
          is_active?: boolean
          version?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string | null
          name?: string
          description?: string | null
          template_type?: string
          is_active?: boolean
          version?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      template_items: {
        Row: {
          id: string
          template_id: string
          title: string
          description: string | null
          priority: PriorityLevel
          is_critical: boolean
          due_time: string | null
          grace_period_minutes: number
          evidence_type: EvidenceType
          depends_on: string | null
          sort_order: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          title: string
          description?: string | null
          priority?: PriorityLevel
          is_critical?: boolean
          due_time?: string | null
          grace_period_minutes?: number
          evidence_type?: EvidenceType
          depends_on?: string | null
          sort_order: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          title?: string
          description?: string | null
          priority?: PriorityLevel
          is_critical?: boolean
          due_time?: string | null
          grace_period_minutes?: number
          evidence_type?: EvidenceType
          depends_on?: string | null
          sort_order?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      checklist_instances: {
        Row: {
          id: string
          shift_session_id: string
          template_id: string
          created_at: string
        }
        Insert: {
          id?: string
          shift_session_id: string
          template_id: string
          created_at?: string
        }
        Update: {
          id?: string
          shift_session_id?: string
          template_id?: string
          created_at?: string
        }
      }
      checklist_results: {
        Row: {
          id: string
          checklist_instance_id: string
          template_item_id: string
          completed_by: string | null
          completed_at: string | null
          status: TaskStatus
          evidence_text: string | null
          evidence_numeric: number | null
          evidence_photo_url: string | null
          blocked_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          checklist_instance_id: string
          template_item_id: string
          completed_by?: string | null
          completed_at?: string | null
          status?: TaskStatus
          evidence_text?: string | null
          evidence_numeric?: number | null
          evidence_photo_url?: string | null
          blocked_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          checklist_instance_id?: string
          template_item_id?: string
          completed_by?: string | null
          completed_at?: string | null
          status?: TaskStatus
          evidence_text?: string | null
          evidence_numeric?: number | null
          evidence_photo_url?: string | null
          blocked_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      log_entries: {
        Row: {
          id: string
          shift_session_id: string
          log_type: string
          recorded_by: string
          recorded_at: string
          data: Json
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shift_session_id: string
          log_type: string
          recorded_by: string
          recorded_at?: string
          data: Json
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shift_session_id?: string
          log_type?: string
          recorded_by?: string
          recorded_at?: string
          data?: Json
          notes?: string | null
          created_at?: string
        }
      }
      incidents: {
        Row: {
          id: string
          site_id: string
          shift_session_id: string | null
          reported_by: string
          reported_at: string
          incident_type: string
          title: string
          description: string
          severity: string | null
          resolved_by: string | null
          resolved_at: string | null
          resolution_notes: string | null
          is_resolved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          shift_session_id?: string | null
          reported_by: string
          reported_at?: string
          incident_type: string
          title: string
          description: string
          severity?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_notes?: string | null
          is_resolved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          shift_session_id?: string | null
          reported_by?: string
          reported_at?: string
          incident_type?: string
          title?: string
          description?: string
          severity?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_notes?: string | null
          is_resolved?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          site_id: string | null
          notification_type: string
          title: string
          message: string
          related_id: string | null
          is_read: boolean
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          site_id?: string | null
          notification_type: string
          title: string
          message: string
          related_id?: string | null
          is_read?: boolean
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          site_id?: string | null
          notification_type?: string
          title?: string
          message?: string
          related_id?: string | null
          is_read?: boolean
          sent_at?: string | null
          created_at?: string
        }
      }
      audit_trail: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_complete_shift: {
        Args: { session_id: string }
        Returns: boolean
      }
      get_active_shift: {
        Args: { p_site_id: string }
        Returns: string
      }
      get_user_site: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_checklist_from_template: {
        Args: { p_shift_session_id: string; p_template_id: string }
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      priority_level: PriorityLevel
      evidence_type: EvidenceType
      task_status: TaskStatus
    }
  }
}
